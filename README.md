# Quran Search Engine MCP

[![npm version](https://img.shields.io/npm/v/quran-search-engine-mcp.svg)](https://www.npmjs.com/package/quran-search-engine-mcp)
[![Registry](https://img.shields.io/badge/MCP-Registry-blue?style=flat&logo=github)](https://github.com/modelcontextprotocol/servers)
[![license](https://img.shields.io/npm/l/quran-search-engine-mcp.svg)](LICENSE)

An MCP stdio server that exposes Quran search tools with Arabic normalization, lemma/root options, pagination, and highlights.

## Features

- MCP stdio server compatible with Claude Desktop
- Quran search with Arabic normalization
- Lemma and root search options
- Pagination and highlighted matches

## Requirements

- Node.js LTS
- pnpm

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Local Development

```bash
pnpm dev
```

## Test

```bash
pnpm test
```

## Lint

```bash
pnpm lint
```

## Use with Claude Desktop (Windows)

1. Build the server:

```bash
pnpm build
```

1. Edit the config file:
`%APPDATA%\Claude\claude_desktop_config.json`

2. Add the server entry:

```json
{
  "mcpServers": {
    "quran-search-engine-mcp": {
      "command": "node",
      "args": ["D:\\path\\to\\quran-search-engine-mcp\\dist\\server.js"]
    }
  }
}
```

1. Restart Claude Desktop.

2. Use it in chat:

- “Search the Quran for الحمد and show the results.”

## Uses quran-search-engine

This server builds on the quran-search-engine package for core search logic, Arabic normalization, lemma/root matching, and highlights.  
See <https://www.npmjs.com/package/quran-search-engine> for details.

## Publish

```bash
pnpm build
pnpm version patch
pnpm publish --access public
```

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contact

Email: <contact@adelpro.us.kg>

## License

MIT
