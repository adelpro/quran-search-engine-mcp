# Quran Search Engine MCP

[![npm version](https://img.shields.io/npm/v/quran-search-engine-mcp.svg)](https://www.npmjs.com/package/quran-search-engine-mcp)
[![quran-search-engine](https://img.shields.io/npm/v/quran-search-engine.svg?label=engine&color=blue)](https://www.npmjs.com/package/quran-search-engine)
[![license](https://img.shields.io/npm/l/quran-search-engine-mcp.svg)](LICENSE)

An [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server that wraps the
[quran-search-engine](https://www.npmjs.com/package/quran-search-engine) package, giving AI
clients fast, accurate, hallucination-free access to the Quran — including search by
Arabic word / lemma / root, verse navigation by id or range, surah metadata, and per-verse
morphology.

> Search, navigate, and explore the Quran through 8 MCP tools — verses, surahs, lemmas, roots, and morphology. Hosted at mcp.quran.us.kg.

The server is publicly hosted at **<https://mcp.quran.us.kg>** (Cloudflare-fronted, stable
subdomain of `quran.us.kg`) and exposes its full tool surface over both
**stdio** (for local AI clients) and **MCP Streamable HTTP** (for remote/hosted
clients).

## Public endpoint

| Resource | URL |
| --- | --- |
| MCP server (Streamable HTTP) | `https://mcp.quran.us.kg/` |
| Health check | `https://mcp.quran.us.kg/health` |
| Status page | `https://quran.us.kg` |

The HTTP server speaks the standard MCP protocol (`2024-11-05`) over Server-Sent Events.
No API key, no auth — the endpoint is open and CORS-enabled for any client.

## Quick start (HTTP)

The shortest path: use any MCP client and point it at `https://mcp.quran.us.kg/`.
For ad-hoc testing with `curl` + a one-off Node script, see
[integrations.md](integrations.md#other-mcp-compatible-clients).

## Quick start (stdio)

```bash
npx -y quran-search-engine-mcp
```

This runs the server over stdio. Use it with Claude Desktop, Cursor, or any other
MCP client that supports the stdio transport.

## What can the server do?

Eight tools, all pure read-only lookups against an in-memory Quran dataset:

| Tool | Purpose |
| --- | --- |
| `search` | Full-text search with Arabic normalization, lemma, and root matching. |
| `list_surahs` | Return all 114 surahs with id, names, verse count, juz list, page range. |
| `get_sura_info` | Look up one surah by id, Arabic name, English name, or romanization. |
| `get_verse` | Fetch one verse by global id or by `(suraId, ayaId)`. |
| `get_verses_by_range` | Fetch verses by Quran range syntax (`"2:255"`, `"1:1-7"`, `"2:"`). |
| `find_verses_by_root` | Find verses by normalized Arabic root via the inverted index. |
| `find_verses_by_lemma` | Find verses by normalized lemma via the inverted index. |
| `get_verse_morphology` | Lemmas and roots for a single verse. |

Full reference with schemas and examples: [tools.md](tools.md).

## Documentation

- [Tools reference](tools.md) — every tool, its schema, response shape, and a live example.
- [Integrations](integrations.md) — Claude Desktop, Claude Web, ChatGPT, Cursor, VS Code, and others.
- [Architecture](architecture.md) — internals: transports, dataset loading, HTTP hardening, Docker.
- [Development](development.md) — build, test, lint, add a new tool, deploy.
