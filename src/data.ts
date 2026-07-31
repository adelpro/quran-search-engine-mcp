import {
  loadMorphology,
  loadQuranData,
  loadWordMap,
  type MorphologyAya,
  type QuranText,
  type WordMap,
} from 'quran-search-engine';

export interface QuranDataset {
  quranData: QuranText[];
  morphologyMap: Map<number, MorphologyAya>;
  wordMap: WordMap;
}

let dataset: QuranDataset | undefined;
let loadPromise: Promise<QuranDataset> | undefined;

/**
 * Loads the Quran dataset (idempotent). Concurrent callers share one
 * in-flight promise, so calling this from multiple HTTP sessions at once
 * only triggers a single load.
 */
export function ensureDataLoaded(): Promise<QuranDataset> {
  if (dataset) return Promise.resolve(dataset);

  loadPromise ??= Promise.all([loadQuranData(), loadMorphology(), loadWordMap()]).then(
    ([quranData, morphologyMap, wordMap]) => {
      dataset = { quranData, morphologyMap, wordMap };
      return dataset;
    },
  );

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
