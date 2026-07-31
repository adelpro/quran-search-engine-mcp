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
    dataset = { quranData, morphologyMap, wordMap, invertedIndex };
    return dataset;
  })();

  return loadPromise;
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
