import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { normalizeArabic, type QuranText } from 'quran-search-engine';
import { z } from 'zod';
import { getDatasetOrError, jsonOk, READ_ONLY_ANNOTATIONS } from './_shared.js';

export function registerFindVersesByLemma(server: McpServer): void {
  server.registerTool(
    'find_verses_by_lemma',
    {
      title: 'Find Verses By Lemma',
      description:
        'Find verses containing a normalized lemma via the inverted lemma index. Paginated.',
      inputSchema: z.object({
        lemma: z.string().min(1),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(200).optional().default(20),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ lemma, page, limit }) => {
      const loaded = getDatasetOrError();
      if (!loaded.ok) return loaded.response;

      const normalizedLemma = normalizeArabic(lemma);
      const gids = loaded.dataset.invertedIndex.lemmaIndex.get(normalizedLemma);
      const allGids = gids ? Array.from(gids).sort((a, b) => a - b) : [];

      const totalResults = allGids.length;
      const totalPages = Math.max(1, Math.ceil(totalResults / limit));
      const start = (page - 1) * limit;
      const slice = allGids.slice(start, start + limit);
      const verses: QuranText[] = [];
      for (const gid of slice) {
        const verse = loaded.dataset.quranData.get(gid);
        if (verse) verses.push(verse);
      }

      return jsonOk({
        lemma,
        normalizedLemma,
        verses,
        pagination: { totalResults, totalPages, currentPage: page, limit },
      });
    },
  );
}
