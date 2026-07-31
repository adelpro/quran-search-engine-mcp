import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getHighlightRanges,
  normalizeArabic,
  search,
  type SearchResponse,
} from 'quran-search-engine';
import { z } from 'zod';
import { getDataset, isDataLoaded } from './data.js';

export function registerTools(server: McpServer): void {
  server.registerTool(
    'search',
    {
      title: 'Quran Search',
      description:
        'Search the Quran with Arabic normalization, lemma/root options, and highlights.',
      inputSchema: z.object({
        query: z.string().min(1),
        lemma: z.boolean().optional().default(true),
        root: z.boolean().optional().default(true),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(200).optional().default(10),
      }),
    },
    async ({ query, lemma, root, page, limit }) => {
      if (!isDataLoaded()) {
        return {
          isError: true,
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

      try {
        const { quranData, morphologyMap, wordMap } = getDataset();
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
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown search error',
              }),
            },
          ],
        };
      }
    },
  );
}
