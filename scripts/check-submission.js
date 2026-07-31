// scripts/check-submission.js
//
// Pre-submission linter for the ChatGPT developer-mode MCP checklist.
// Verifies that every tool exposed by this server satisfies the four
// submission requirements (HTTPS endpoint, sub-300-char descriptions,
// no system-prompt directive words, explicit tool annotations).
//
// Usage:
//   node scripts/check-submission.js
//
// Exit code 0 = pass, 1 = fail (with reasons printed to stderr).

import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

const ENDPOINT = 'https://mcp.quran.us.kg';
const PUBLIC_HEALTH_URL = `${ENDPOINT}/health`;
const FORBIDDEN_WORDS = ['MUST', 'ALWAYS', 'NEVER', 'MUST NOT', 'REQUIRED', 'SHALL'];
const MAX_DESCRIPTION_LENGTH = 299;
const REQUIRED_ANNOTATIONS = ['readOnlyHint', 'destructiveHint', 'openWorldHint', 'idempotentHint'];

let failures = 0;

function fail(message) {
  console.error(`✗ ${message}`);
  failures += 1;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

async function checkPublicEndpoint() {
  console.log('\n[1/4] Public HTTPS endpoint');
  try {
    const response = await fetch(PUBLIC_HEALTH_URL, {
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status !== 200) {
      fail(`Expected 200 from ${PUBLIC_HEALTH_URL}, got ${response.status}`);
      return;
    }
    const body = await response.json();
    if (body.status !== 'ok') {
      fail(`Expected status=ok from /health, got ${JSON.stringify(body)}`);
      return;
    }
    pass(`${PUBLIC_HEALTH_URL} → status=ok, version=${body.version}`);
  } catch (error) {
    fail(`Could not reach ${PUBLIC_HEALTH_URL}: ${error.message}`);
  }
}

async function checkTools() {
  console.log('\n[2/4] Tool descriptions, forbidden words, annotations');
  const serverPath = path.join(process.cwd(), 'dist', 'server.js');
  const client = new Client({ name: 'check-submission', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], env: process.env });

  try {
    await client.connect(transport);
    const result = await client.request({ method: 'tools/list' }, ListToolsResultSchema);

    for (const tool of result.tools) {
      const desc = tool.description ?? '';
      if (desc.length === 0) {
        fail(`tool "${tool.name}" has empty description`);
        continue;
      }
      if (desc.length > MAX_DESCRIPTION_LENGTH) {
        fail(`tool "${tool.name}" description is ${desc.length} chars (>${MAX_DESCRIPTION_LENGTH})`);
      } else {
        pass(`tool "${tool.name}" description length: ${desc.length}`);
      }

      const upper = desc.toUpperCase();
      for (const word of FORBIDDEN_WORDS) {
        if (upper.includes(word)) {
          fail(`tool "${tool.name}" description contains forbidden word "${word}"`);
        }
      }

      const ann = tool.annotations ?? {};
      for (const key of REQUIRED_ANNOTATIONS) {
        if (!(key in ann)) {
          fail(`tool "${tool.name}" is missing annotation "${key}"`);
        }
      }
      if (
        ann.readOnlyHint !== true ||
        ann.destructiveHint !== false ||
        ann.openWorldHint !== false ||
        ann.idempotentHint !== true
      ) {
        fail(
          `tool "${tool.name}" annotation values out of spec: ${JSON.stringify(ann)} ` +
            `(expected readOnlyHint=true, destructiveHint=false, openWorldHint=false, idempotentHint=true)`,
        );
      } else {
        pass(`tool "${tool.name}" annotations OK`);
      }
    }
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
}

async function main() {
  console.log('=== ChatGPT developer-mode MCP submission check ===');
  await checkPublicEndpoint();
  await checkTools();

  console.log(`\n=== ${failures === 0 ? 'PASS' : `FAIL (${failures} issue${failures === 1 ? '' : 's'})`} ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('check-submission crashed:', error);
  process.exit(1);
});
