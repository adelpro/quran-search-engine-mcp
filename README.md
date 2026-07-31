# Quran Search Engine MCP

[![npm version](https://img.shields.io/npm/v/quran-search-engine-mcp.svg)](https://www.npmjs.com/package/quran-search-engine-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue?style=flat&logo=github)](https://github.com/modelcontextprotocol/servers)
[![smithery badge](https://smithery.ai/badge/adelpro/quran-search-engine-mcp)](https://smithery.ai/servers/adelpro/quran-search-engine-mcp)
[![license](https://img.shields.io/npm/l/quran-search-engine-mcp.svg)](LICENSE)
[![Powered by quran-search-engine](https://img.shields.io/badge/Powered%20by-quran--search--engine-green)](https://github.com/adelpro/quran-search-engine)
[![quran-search-engine](https://img.shields.io/npm/v/quran-search-engine.svg?label=engine&color=blue)](https://www.npmjs.com/package/quran-search-engine)

An MCP (Model Context Protocol) server that gives AI clients fast, accurate,
hallucination-free access to the Quran — search, navigation, and morphology —
over **stdio** and **Streamable HTTP**.

> Search, navigate, and explore the Quran through 8 MCP tools — verses, surahs, lemmas, roots, and morphology. Hosted at mcp.quran.us.kg.
> Instead of relying on an AI to "hallucinate" or predict Quranic verses, this
> tool routes every request to a dedicated search engine. The AI handles the
> natural language; the server returns the exact, literal Quranic text.

## Public endpoint

The server is publicly hosted at **<https://mcp.quran.us.kg/>**
(Cloudflare-fronted, stable). No API key, no auth — the endpoint is open and
CORS-enabled for any client.

| Resource | URL |
| --- | --- |
| MCP server (Streamable HTTP) | `https://mcp.quran.us.kg/` |
| Health check | `https://mcp.quran.us.kg/health` |
| Status page | `https://quran.us.kg` |

## Features

- 🔌 **MCP compatible** — Claude Desktop, Claude Web, ChatGPT, Cursor, VS Code, and others.
- 🌐 **Two transports** — stdio for local integrations, Streamable HTTP for remote/hosted.
- 🔍 **Eight tools** — full-text search, surah metadata, verse navigation, lemma/root lookup, morphology.
- 📖 **Accurate results** — every verse comes from a verified dataset; no LLM in the loop.
- 🛡️ **Hardened HTTP** — host allow-list, per-IP rate limit, body cap, session reaper, `/health`.

## Install

```bash
# Use the public endpoint
# → point your MCP client at https://mcp.quran.us.kg/

# Or run the server locally (stdio)
npx -y quran-search-engine-mcp
```

## Documentation

Detailed docs live under [`docs/`](docs/index.md):

- [Tools reference](docs/tools.md) — every tool, its schema, response shape, and examples.
- [Integrations](docs/integrations.md) — Claude Desktop, Claude Web, ChatGPT, Cursor, and others.
- [Architecture](docs/architecture.md) — internals: transports, dataset loading, HTTP hardening.
- [Development](docs/development.md) — build, test, add a new tool, deploy.

## Quick start (HTTP)

The shortest path: use any MCP client and point it at `https://mcp.quran.us.kg/`.
For ad-hoc testing, the [integrations page](docs/integrations.md#other-mcp-compatible-clients)
shows a one-off Node snippet that uses `@modelcontextprotocol/sdk` directly.

## Quick start (Docker)

```bash
docker compose up --build
# → "Quran MCP HTTP server listening on http://0.0.0.0:4000/"
```

## Requirements

- Node.js 20+ (LTS recommended)
- npm, pnpm, or yarn

## License

MIT — see [LICENSE](LICENSE).

## Contact

Email: <contact@adelpro.us.kg>
