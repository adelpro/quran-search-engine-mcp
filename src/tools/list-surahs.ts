import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SURAS } from 'quran-search-engine';
import { z } from 'zod';
import { jsonOk, READ_ONLY_ANNOTATIONS } from './_shared.js';

export function registerListSurahs(server: McpServer): void {
  server.registerTool(
    'list_surahs',
    {
      title: 'List Surahs',
      description:
        'Return all 114 surahs with id, names (Arabic, English, romanization), verse count, juz list, and Mushaf page range.',
      inputSchema: z.object({}),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => jsonOk({ surahs: SURAS }),
  );
}
