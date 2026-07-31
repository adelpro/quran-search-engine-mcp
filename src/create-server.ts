import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools/index.js';
import { VERSION } from './version.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'quran-search-engine-mcp',
    version: VERSION,
  });

  registerTools(server);

  return server;
}
