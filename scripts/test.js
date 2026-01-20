import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

const serverPath = path.join(process.cwd(), 'dist', 'server.js');
const client = new Client({ name: 'quran-search-engine-mcp-test', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  env: process.env,
});

try {
  await client.connect(transport);
  const toolsResult = await client.request({ method: 'tools/list' }, ListToolsResultSchema);
  const toolNames = toolsResult.tools.map((tool) => tool.name);
  if (!toolNames.includes('search')) {
    throw new Error('search tool not registered');
  }

  const callResult = await client.request(
    {
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: {
          query: 'الحمد',
          lemma: true,
          root: true,
          page: 1,
          limit: 3,
        },
      },
    },
    CallToolResultSchema,
  );

  if (!callResult.content || callResult.content.length === 0) {
    throw new Error('search tool returned empty content');
  }
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  try {
    await client.close();
  } catch {
    process.exit(1);
  }
}
