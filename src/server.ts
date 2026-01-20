import express, { type Request, type Response } from 'express';
import cors from 'cors';
import {
  getHighlightRanges,
  loadMorphology,
  loadQuranData,
  loadWordMap,
  type MorphologyAya,
  normalizeArabic,
  type QuranText,
  search,
  type SearchResponse,
  type WordMap,
} from 'quran-search-engine';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

let quranData: QuranText[];
let morphologyMap: Map<number, MorphologyAya>;
let wordMap: WordMap;

// Load datasets once at startup
async function loadData(): Promise<void> {
  quranData = await loadQuranData();
  morphologyMap = await loadMorphology();
  wordMap = await loadWordMap();
  console.log('Quran datasets loaded');
}

loadData();

// Search endpoint
app.post('/search', (req: Request, res: Response) => {
  const { query, lemma = true, root = true, page = 1, limit = 10 } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  const normalizedQuery = normalizeArabic(query);

  const response: SearchResponse = search(
    normalizedQuery,
    quranData,
    morphologyMap,
    wordMap,
    { lemma, root },
    { page, limit },
  );

  // Add highlights
  response.results = response.results.map((verse) => ({
    ...verse,
    highlights: getHighlightRanges(verse.uthmani, verse.matchedTokens, verse.tokenTypes),
  }));

  return res.json(response);
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Quran MCP server running on http://localhost:${port}`);
});
