import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type QuranText, SURAS } from 'quran-search-engine';
import { z } from 'zod';
import { getDatasetOrError, jsonError, jsonOk, READ_ONLY_ANNOTATIONS } from './_shared.js';

const RANGE_PATTERN = /^(\d{1,3}):(\d{1,3})?(?:-(\d{1,3}))?$/;

interface ParsedRange {
  sura: number;
  startAya?: number;
  endAya?: number;
}

export function registerGetVersesByRange(server: McpServer): void {
  server.registerTool(
    'get_verses_by_range',
    {
      title: 'Get Verses By Range',
      description:
        "Fetch verses by Quran range syntax: '2:255' (single), '1:1-7' (range), or '2:' (whole sura).",
      inputSchema: z.object({
        range: z
          .string()
          .regex(
            RANGE_PATTERN,
            "expected formats: 'sura:aya', 'sura:aya-aya', or 'sura:' (whole sura)",
          ),
      }),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ range }) => {
      const parsed = parseRange(range);
      if ('error' in parsed) return jsonError(parsed.error);

      const loaded = getDatasetOrError();
      if (!loaded.ok) return loaded.response;

      const sura = SURAS.find((s) => s.id === parsed.sura);
      if (!sura) {
        return jsonError(`Sura ${parsed.sura} not found (valid range: 1–114)`);
      }

      const startAya = parsed.startAya ?? 1;
      // If a startAya is given without an endAya, return just that one verse.
      // If neither is given (e.g. "2:"), return the whole sura.
      const endAya =
        parsed.endAya ?? (parsed.startAya !== undefined ? startAya : sura.total_verses);
      const clampedEndAya = Math.min(endAya, sura.total_verses);

      if (startAya > sura.total_verses) {
        return jsonError(
          `Sura ${sura.id} only has ${sura.total_verses} verses; got startAya ${startAya}`,
        );
      }

      const verses: QuranText[] = [];
      for (let aya = startAya; aya <= clampedEndAya; aya++) {
        const gid = (loaded.dataset.gidOffsetTable.get(sura.id) ?? 0) + (aya - 1);
        const verse = loaded.dataset.quranData.get(gid);
        if (verse) verses.push(verse);
      }

      return jsonOk({ range: parsed, verses });
    },
  );
}

function parseRange(range: string): ParsedRange | { error: string } {
  const match = range.match(RANGE_PATTERN);
  if (!match) {
    return { error: `Invalid range syntax: ${JSON.stringify(range)}` };
  }
  const sura = Number(match[1]);
  const startAya = match[2] ? Number(match[2]) : undefined;
  const endAya = match[3] ? Number(match[3]) : undefined;
  if (sura < 1 || sura > 114) {
    return { error: `Sura must be 1–114, got ${sura}` };
  }
  if (startAya !== undefined && (startAya < 1 || startAya > 286)) {
    return { error: `startAya must be 1–286, got ${startAya}` };
  }
  if (endAya !== undefined && (endAya < 1 || endAya > 286)) {
    return { error: `endAya must be 1–286, got ${endAya}` };
  }
  if (startAya !== undefined && endAya !== undefined && startAya > endAya) {
    return { error: `startAya (${startAya}) must be ≤ endAya (${endAya})` };
  }
  return { sura, startAya, endAya };
}
