import { fork } from 'node:child_process';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

const serverPath = path.join(process.cwd(), 'dist', 'server.js');

const child = fork(serverPath, {
  env: { ...process.env, TRANSPORT: 'http', PORT: '0', HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
});

function waitForPort() {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for server to start')),
      15_000,
    );

    child.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      process.stderr.write(chunk);
      const match = buffer.match(/listening on http:\/\/[^:]+:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });
}

async function main() {
  const port = await waitForPort();
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  if (!health.dataLoaded) throw new Error('Expected dataLoaded=true from /health');

  const client = new Client({ name: 'quran-search-engine-mcp-http-test', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
  await client.connect(transport);

  if (!transport.sessionId) {
    throw new Error('Expected a session id after connecting (stateful mode)');
  }

  const toolsResult = await client.request({ method: 'tools/list' }, ListToolsResultSchema);
  if (!toolsResult.tools.some((t) => t.name === 'search')) {
    throw new Error('search tool not registered');
  }

  const callResult = await client.request(
    {
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: { query: 'الحمد', lemma: true, root: true, page: 1, limit: 3 },
      },
    },
    CallToolResultSchema,
  );
  if (!callResult.content || callResult.content.length === 0) {
    throw new Error('search tool returned empty content');
  }

  // Negative case: no session id on a non-initialize POST should be rejected.
  const badResponse = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/list' }),
  });
  if (badResponse.status !== 400) {
    throw new Error(`Expected 400 for missing session id, got ${badResponse.status}`);
  }

  const sessionId = transport.sessionId;
  await client.close();

  // client.close() only closes the local connection — it doesn't reliably
  // notify the server. Explicitly terminate the session with DELETE.
  if (sessionId) {
    await fetch(`${base}/mcp`, {
      method: 'DELETE',
      headers: { 'Mcp-Session-Id': sessionId },
    }).catch(() => {});
  }

  let healthAfterClose;
  for (let i = 0; i < 10; i++) {
    healthAfterClose = await fetch(`${base}/health`).then((r) => r.json());
    if (healthAfterClose.sessions === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (healthAfterClose.sessions !== 0) {
    throw new Error(`Expected 0 sessions after close, got ${healthAfterClose.sessions}`);
  }

  console.log('HTTP transport test passed');
}

main()
  .then(() => {
    child.kill('SIGTERM');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    child.kill('SIGTERM');
    process.exit(1);
  });
