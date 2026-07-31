import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type Sura, SURAS } from 'quran-search-engine';
import { z } from 'zod';
import { jsonOk, READ_ONLY_ANNOTATIONS } from './_shared.js';

export function registerGetSuraInfo(server: McpServer): void {
  server.registerTool(
    'get_sura_info',
    {
      title: 'Get Sura Info',
      description:
        'Look up one surah by numeric id (1–114), Arabic name, English name, or romanization. Returns the matching record or null.',
      // Loosely-typed so the handler can return `{ sura: null }` instead
      // of a Zod error for unknown identifiers.
      inputSchema: z.object({
        identifier: z.union([z.number().int(), z.string().min(1).max(120)]),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ identifier }) => {
      const sura = findSura(identifier);
      return jsonOk({ sura });
    },
  );
}

function findSura(identifier: number | string): Sura | null {
  if (typeof identifier === 'number') {
    return SURAS.find((s) => s.id === identifier) ?? null;
  }
  const needle = identifier.trim().toLowerCase();
  if (!needle) return null;
  // Numeric string: also try as id.
  if (/^\d+$/.test(needle)) {
    const id = Number(needle);
    const byId = SURAS.find((s) => s.id === id);
    if (byId) return byId;
  }
  return (
    SURAS.find(
      (s) =>
        s.sura_name_en.toLowerCase() === needle ||
        s.sura_name_romanization.toLowerCase() === needle,
    ) ?? null
  );
}
