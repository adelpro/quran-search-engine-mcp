import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFindVersesByLemma } from './find-verses-by-lemma.js';
import { registerFindVersesByRoot } from './find-verses-by-root.js';
import { registerGetSuraInfo } from './get-sura-info.js';
import { registerGetVerse } from './get-verse.js';
import { registerGetVerseMorphology } from './get-verse-morphology.js';
import { registerGetVersesByRange } from './get-verses-by-range.js';
import { registerListSurahs } from './list-surahs.js';
import { registerSearch } from './search.js';

/**
 * Registers every MCP tool exposed by this server.
 * Order is alphabetical for stable `tools/list` output.
 */
export function registerTools(server: McpServer): void {
  registerFindVersesByLemma(server);
  registerFindVersesByRoot(server);
  registerGetSuraInfo(server);
  registerGetVerse(server);
  registerGetVerseMorphology(server);
  registerGetVersesByRange(server);
  registerListSurahs(server);
  registerSearch(server);
}
