import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './create-server.js';
import { ensureDataLoaded } from './data.js';

export async function runStdio(): Promise<void> {
  process.on('uncaughtException', (error) => {
    console.error('[uncaughtException]', error);
  });
  process.on('unhandledRejection', (error) => {
    console.error('[unhandledRejection]', error);
  });

  const server = createServer();

  // Connect FIRST so Smithery / Claude Desktop can handshake and discover
  // tools immediately, before the (larger) dataset has finished loading.
  await server.connect(new StdioServerTransport());
  console.error('Quran MCP stdio server ready');

  // Load data in the background AFTER connecting.
  ensureDataLoaded().catch((error) => {
    console.error(error);
    process.exit(1);
  });

  /**
   * CRITICAL:
   * Keeps the process alive for stdio-based MCP servers.
   * Without this, `npx` will exit immediately.
   */
  process.stdin.resume();
}
