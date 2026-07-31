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

const REQUIRED_TOOLS = [
  'search',
  'list_surahs',
  'get_sura_info',
  'get_verse',
  'get_verses_by_range',
  'find_verses_by_root',
  'find_verses_by_lemma',
  'get_verse_morphology',
];

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function parsePayload(result) {
  if (!result.content || result.content.length === 0) {
    throw new Error('tool returned empty content');
  }
  return JSON.parse(result.content[0].text);
}

async function callTool(client, name, args) {
  return client.request(
    { method: 'tools/call', params: { name, arguments: args } },
    CallToolResultSchema,
  );
}

async function main() {
  const port = await waitForPort();
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  if (!health.dataLoaded) throw new Error('Expected dataLoaded=true from /health');

  const client = new Client({ name: 'quran-search-engine-mcp-http-test', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/`));
  await client.connect(transport);

  if (!transport.sessionId) {
    throw new Error('Expected a session id after connecting (stateful mode)');
  }

  // tools/list — every required tool is registered
  const toolsResult = await client.request({ method: 'tools/list' }, ListToolsResultSchema);
  const toolNames = toolsResult.tools.map((t) => t.name);
  for (const required of REQUIRED_TOOLS) {
    assert(toolNames.includes(required), `expected tool "${required}" to be registered`);
  }

  // Every tool must declare all four annotation hints
  for (const tool of toolsResult.tools) {
    const ann = tool.annotations ?? {};
    assert(
      ann.readOnlyHint === true && ann.destructiveHint === false && ann.openWorldHint === false && ann.idempotentHint === true,
      `tool "${tool.name}" is missing required annotations (got ${JSON.stringify(ann)})`,
    );
  }

  // search — happy path
  const searchResult = await callTool(client, 'search', {
    query: 'الحمد',
    lemma: true,
    root: true,
    page: 1,
    limit: 3,
  });
  parsePayload(searchResult);

  // list_surahs
  const listResult = await callTool(client, 'list_surahs', {});
  const listPayload = parsePayload(listResult);
  assert(listPayload.surahs.length === 114, `list_surahs should return 114, got ${listPayload.surahs.length}`);

  // get_sura_info
  const suraResult = await callTool(client, 'get_sura_info', { identifier: 2 });
  const suraPayload = parsePayload(suraResult);
  assert(suraPayload.sura && suraPayload.sura.id === 2, 'get_sura_info(2) should return Al-Baqarah');

  // get_verse
  const verseResult = await callTool(client, 'get_verse', { suraId: 2, ayaId: 255 });
  const versePayload = parsePayload(verseResult);
  assert(versePayload.verse && versePayload.verse.gid === 262, 'get_verse(2:255) should resolve to Ayat al-Kursi');

  // get_verses_by_range
  const rangeResult = await callTool(client, 'get_verses_by_range', { range: '1:1-7' });
  const rangePayload = parsePayload(rangeResult);
  assert(rangePayload.verses.length === 7, "'1:1-7' should return 7 verses");

  // find_verses_by_lemma
  const lemmaResult = await callTool(client, 'find_verses_by_lemma', { lemma: 'حمد', limit: 3 });
  const lemmaPayload = parsePayload(lemmaResult);
  assert(lemmaPayload.verses.length > 0, "find_verses_by_lemma('حمد') should return verses");

  // find_verses_by_root — unknown root
  const noRoot = await callTool(client, 'find_verses_by_root', { root: 'XYZNOMATCH' });
  const noRootPayload = parsePayload(noRoot);
  assert(
    noRootPayload.verses.length === 0 && noRootPayload.pagination.totalResults === 0,
    "find_verses_by_root('XYZNOMATCH') should return empty pagination",
  );

  // get_verse_morphology
  const morphResult = await callTool(client, 'get_verse_morphology', { gid: 1 });
  const morphPayload = parsePayload(morphResult);
  assert(
    morphPayload.morphology && Array.isArray(morphPayload.morphology.lemmas),
    'get_verse_morphology should return morphology with lemmas array',
  );

  // Negative: no session id on a non-initialize POST should be rejected.
  const badResponse = await fetch(`${base}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/list' }),
  });
  if (badResponse.status !== 400) {
    throw new Error(`Expected 400 for missing session id, got ${badResponse.status}`);
  }

  const sessionId = transport.sessionId;
  await client.close();

  if (sessionId) {
    await fetch(`${base}/`, {
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
