import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  type AdvancedSearchOptions,
  getHighlightRanges,
  normalizeArabic,
  type PaginationOptions,
  search,
  type SearchContext,
  type SearchResponse,
} from 'quran-search-engine';
import { z } from 'zod';
import { getDataset, isDataLoaded } from '../data.js';
import { handleCaughtError, jsonError, jsonOk, READ_ONLY_ANNOTATIONS } from './_shared.js';

export function registerSearch(server: McpServer): void {
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
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, lemma, root, page, limit }) => {
      if (!isDataLoaded()) {
        return jsonError('Server is still loading data, please try again in a moment');
      }

      try {
        const { quranData, morphologyMap, wordMap, invertedIndex } = getDataset();
        const normalizedQuery = normalizeArabic(query);

        const context: SearchContext = {
          quranData,
          morphologyMap,
          wordMap,
          invertedIndex,
        };
        const options: AdvancedSearchOptions = { lemma, root };
        const pagination: PaginationOptions = { page, limit };

        const response: SearchResponse = search(normalizedQuery, context, options, pagination);

        response.results = response.results.map((verse) => ({
          ...verse,
          highlights: getHighlightRanges(verse.uthmani, verse.matchedTokens, verse.tokenTypes),
        }));

        return jsonOk(response);
      } catch (error) {
        return handleCaughtError(error);
      }
    },
  );
}
