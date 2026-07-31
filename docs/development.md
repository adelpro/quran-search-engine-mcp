# Development

Everything you need to build, test, lint, and deploy `quran-search-engine-mcp`.

## Prerequisites

- Node.js 20+ (LTS recommended; Dockerfile uses `node:22-alpine`)
- npm, pnpm, or yarn (project is `yarn@1.22.22` per `packageManager`)

## Install

```bash
yarn install
# or: npm install / pnpm install
```

## Build

```bash
yarn build
```

This runs `rimraf dist` and `tsc`. The output is committed to `dist/`.

## Local dev

```bash
# stdio transport (talks to a local MCP client like Claude Desktop)
yarn dev

# HTTP transport on http://localhost:4000/
yarn dev:http
```

The HTTP dev server is also reachable for ad-hoc testing with `curl`.

## Test

```bash
yarn test
```

This runs `pretest` (version-consistency check via `scripts/check-versions.js`),
then `test:stdio` and `test:http`. Both scripts:

- spawn the compiled `dist/server.js`
- open a real MCP client (stdio or Streamable HTTP)
- call `tools/list` and assert that all 8 required tools are registered
- call each tool with a happy-path argument
- assert that annotations are present
- close the session and verify the server cleans up

You can run the stdio or HTTP suite on its own:

```bash
yarn test:stdio
yarn test:http
```

## Lint

```bash
yarn lint
yarn lint:fix
```

## Submission check

Before publishing or submitting to the ChatGPT developer mode, run:

```bash
yarn build
yarn check:submission
```

This lints the deployed server: fetches `https://mcp.quran.us.kg/health`,
calls `tools/list`, and verifies every tool satisfies the submission
requirements (description length, forbidden words, annotations).

## Adding a new tool

The tool surface is structured one file per tool under `src/tools/`. To add a
new tool:

1. **Create `src/tools/<name>.ts`** with this shape:

   ```ts
   import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
   import { z } from 'zod';
   import { getDatasetOrError, jsonOk, READ_ONLY_ANNOTATIONS } from './_shared.js';

   export function register<Name>(server: McpServer): void {
     server.registerTool(
       '<name>',
       {
         title: '<Human title>',
         description: '<≤299 chars, no MUST/ALWAYS/NEVER/REQUIRED/SHALL words>',
         inputSchema: z.object({ /* your Zod schema */ }),
         annotations: READ_ONLY_ANNOTATIONS,
       },
       async (args) => {
         const loaded = getDatasetOrError();
         if (!loaded.ok) return loaded.response;
         // ... your handler ...
         return jsonOk({ /* your payload */ });
       },
     );
   }
   ```

2. **Wire it in `src/tools/index.ts`** in alphabetical order (so `tools/list`
   output is stable).

3. **Add a positive test** in `scripts/test.js` and `scripts/test-http.js`,
   plus a negative test if your tool has a `Zod.refine()` or non-trivial
   validation.

4. **Document the tool** in `docs/tools.md` (description, schema, output,
   example, annotations).

5. **Run the full pipeline**:

   ```bash
   yarn build
   yarn test
   yarn check:submission
   ```

6. **Bump the version** in `package.json` and `server.json` (keep them in
   sync — `scripts/check-versions.js` enforces this in `pretest`).

7. **Add a CHANGELOG entry** under the new version heading.

## Deploy

The public endpoint at `https://mcp.quran.us.kg/` is rebuilt and restarted
from the repo via the standard `docker compose` flow:

```bash
docker compose up -d --build
```

Verify the new version is live:

```bash
curl -sS https://mcp.quran.us.kg/health
# → {"status":"ok","dataLoaded":true,"version":"0.5.0","sessions":0}
```

## Release

```bash
yarn build
yarn version patch   # or minor / major
yarn publish --access public
```

## Repository layout

```
quran-search-engine-mcp/
├── README.md                    # short landing page
├── CHANGELOG.md
├── docs/                        # detailed documentation (this folder)
│   ├── index.md
│   ├── tools.md
│   ├── integrations.md
│   ├── architecture.md
│   └── development.md
├── src/
│   ├── server.ts                # transport resolver
│   ├── create-server.ts         # McpServer factory
│   ├── data.ts                  # QuranDataset loader
│   ├── stdio.ts                 # stdio transport
│   ├── http.ts                  # Streamable HTTP transport
│   ├── version.ts
│   └── tools/
│       ├── index.ts             # registerTools() — wires all 8 tools
│       ├── _shared.ts           # jsonOk / jsonError / getDatasetOrError / READ_ONLY_ANNOTATIONS
│       ├── search.ts
│       ├── list-surahs.ts
│       ├── get-sura-info.ts
│       ├── get-verse.ts
│       ├── get-verses-by-range.ts
│       ├── find-verses-by-root.ts
│       ├── find-verses-by-lemma.ts
│       └── get-verse-morphology.ts
├── scripts/
│   ├── test.js                  # stdio end-to-end
│   ├── test-http.js             # HTTP end-to-end
│   ├── check-versions.js        # package.json ↔ server.json
│   └── check-submission.js      # ChatGPT submission linter
├── Dockerfile
├── docker-compose.yml
├── server.json                  # MCP registry manifest
└── smithery.yaml                # Smithery stdio manifest
```
