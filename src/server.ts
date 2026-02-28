#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*                                Constants                                   */
/* -------------------------------------------------------------------------- */
const DEFAULT_PAGE_LIMIT = 1;
const MIN_PAGE_LIMIT = 1;
const MAX_SEARCH_LIMIT = 200;
const MIN_SEARCH_LIMIT = 1;
const DEFAULT_SEARCH_LIMIT = 10;

/* -------------------------------------------------------------------------- */
/*                                Crash guards                                */
/* -------------------------------------------------------------------------- */
process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
});
process.on('unhandledRejection', (error) => {
  console.error('[unhandledRejection]', error);
});

/* -------------------------------------------------------------------------- */
/*                                MCP server                                  */
/* -------------------------------------------------------------------------- */
const server = new McpServer({
  name: 'quran-search-engine-mcp',
  version: '0.2.0',
});

/* -------------------------------------------------------------------------- */
/*                                   Data                                     */
/* -------------------------------------------------------------------------- */
let quranData: QuranText[];
let morphologyMap: Map<number, MorphologyAya>;
let wordMap: WordMap;
let dataLoaded = false;

async function loadData(): Promise<void> {
  quranData = await loadQuranData();
  morphologyMap = await loadMorphology();
  wordMap = await loadWordMap();
  dataLoaded = true;
  console.error('Quran datasets loaded');
}

/* -------------------------------------------------------------------------- */
/*                                   Tools                                    */
/* -------------------------------------------------------------------------- */
server.registerTool(
  'search',
  {
    title: 'Quran Search',
    description: 'Search the Quran with Arabic normalization, lemma/root options, and highlights.',
    inputSchema: z.object({
      query: z.string().min(1),
      lemma: z.boolean().optional().default(true),
      root: z.boolean().optional().default(true),
      page: z.number().int().min(MIN_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
      limit: z
        .number()
        .int()
        .min(MIN_SEARCH_LIMIT)
        .max(MAX_SEARCH_LIMIT)
        .optional()
        .default(DEFAULT_SEARCH_LIMIT),
    }),
  },
  async ({ query, lemma, root, page, limit }) => {
    if (!dataLoaded) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Server is still loading data, please try again in a moment',
            }),
          },
        ],
      };
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

    response.results = response.results.map((verse) => ({
      ...verse,
      highlights: getHighlightRanges(verse.uthmani, verse.matchedTokens, verse.tokenTypes),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response),
        },
      ],
    };
  },
);

/* -------------------------------------------------------------------------- */
/*                                 Bootstrap                                  */
/* -------------------------------------------------------------------------- */

// Connect FIRST so Smithery can handshake and discover tools immediately
await server.connect(new StdioServerTransport());
console.error('Quran MCP stdio server ready');

// Load data in the background AFTER connecting
loadData().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * CRITICAL:
 * Keeps the process alive for stdio-based MCP servers.
 * Without this, `npx` will exit immediately.
 */
process.stdin.resume();
