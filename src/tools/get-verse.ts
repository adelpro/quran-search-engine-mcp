import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getDatasetOrError,
  jsonError,
  jsonOk,
  READ_ONLY_ANNOTATIONS,
  resolveGid,
} from './_shared.js';

const verseIdSchema = z.object({
  gid: z.number().int().min(1).optional(),
  suraId: z.number().int().min(1).max(114).optional(),
  ayaId: z.number().int().min(1).max(286).optional(),
});

export function registerGetVerse(server: McpServer): void {
  server.registerTool(
    'get_verse',
    {
      title: 'Get Verse',
      description:
        'Fetch a single verse by global id or by (suraId, ayaId). Returns the full verse record or null.',
      inputSchema: verseIdSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      const hasGid = typeof args.gid === 'number';
      const hasPair = typeof args.suraId === 'number' && typeof args.ayaId === 'number';
      if (!hasGid && !hasPair) {
        return jsonError('Provide either gid, or both suraId and ayaId.');
      }

      const loaded = getDatasetOrError();
      if (!loaded.ok) return loaded.response;

      const gid = resolveGid(args, loaded.dataset);
      if (gid === null) return jsonOk({ verse: null });

      const verse = loaded.dataset.quranData.get(gid) ?? null;
      return jsonOk({ verse });
    },
  );
}
