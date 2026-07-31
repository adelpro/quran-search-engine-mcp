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

export function registerGetVerseMorphology(server: McpServer): void {
  server.registerTool(
    'get_verse_morphology',
    {
      title: 'Get Verse Morphology',
      description:
        'Get the lemmas and roots for a single verse by gid or by (suraId, ayaId). Returns morphology or null.',
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
      if (gid === null) return jsonOk({ morphology: null });

      const morphology = loaded.dataset.morphologyMap.get(gid) ?? null;
      return jsonOk({ morphology });
    },
  );
}
