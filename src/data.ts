import {
  buildInvertedIndex,
  type InvertedIndex,
  loadMorphology,
  loadQuranData,
  loadWordMap,
  type MorphologyAya,
  type QuranText,
  type WordMap,
} from 'quran-search-engine';

export interface QuranDataset {
  quranData: Map<number, QuranText>;
  morphologyMap: Map<number, MorphologyAya>;
  wordMap: WordMap;
  invertedIndex: InvertedIndex;
  /**
   * Precomputed lookup from suraId (1–114) to the gid of that sura's
   * first verse. Built once at load time so `(suraId, ayaId) → gid`
   * resolution is O(1) without iterating the quranData map.
   */
  gidOffsetTable: Map<number, number>;
}

let dataset: QuranDataset | undefined;
let loadPromise: Promise<QuranDataset> | undefined;

/**
 * Loads the Quran dataset (idempotent). Concurrent callers share one
 * in-flight promise, so calling this from multiple HTTP sessions at once
 * only triggers a single load. The inverted index is built eagerly as
 * part of the same load — matching the "load everything up front" pattern
 * used by both stdio and http transports.
 */
export function ensureDataLoaded(): Promise<QuranDataset> {
  if (dataset) return Promise.resolve(dataset);

  loadPromise ??= (async (): Promise<QuranDataset> => {
    const [quranData, morphologyMap, wordMap] = await Promise.all([
      loadQuranData(),
      loadMorphology(),
      loadWordMap(),
    ]);
    const invertedIndex = buildInvertedIndex(morphologyMap, quranData);
    const gidOffsetTable = buildGidOffsetTable(quranData);
    dataset = { quranData, morphologyMap, wordMap, invertedIndex, gidOffsetTable };
    return dataset;
  })();

  return loadPromise;
}

/**
 * Walks the loaded verse map once and records the gid of the first
 * verse seen for each sura_id. Verses are 1-indexed per sura, so the
 * gid for `(suraId, ayaId)` is `offset + (ayaId - 1)`.
 */
function buildGidOffsetTable(quranData: Map<number, QuranText>): Map<number, number> {
  const table = new Map<number, number>();
  for (const verse of quranData.values()) {
    if (!table.has(verse.sura_id)) {
      table.set(verse.sura_id, verse.gid);
    }
  }
  return table;
}

export function isDataLoaded(): boolean {
  return dataset !== undefined;
}

/** Throws if the dataset has not finished loading yet. */
export function getDataset(): QuranDataset {
  if (!dataset) {
    throw new Error('Quran dataset is not loaded yet');
  }
  return dataset;
}
