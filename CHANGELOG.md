# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- MCP stdio server implementation using the official SDK and zod schemas.
- Stdio-based test script that validates tool registration and search output.
- MIT license and contribution guidelines.
- GitHub issue and pull request templates.
- **HTTP transport** alongside stdio. Run with `TRANSPORT=http` (or `--http`)
  to expose the same MCP `search` tool over the Streamable HTTP transport at
  `POST/GET/DELETE /mcp`, with a `GET /health` endpoint. Configurable via
  `PORT`, `HOST`, `MCP_ALLOWED_HOSTS`, `MCP_SESSION_TTL_MS`,
  `MCP_MAX_SESSIONS`, `MCP_MAX_BODY_BYTES`, and `MCP_RATE_LIMIT_PER_MINUTE`.
- HTTP-based test script (`scripts/test-http.js`) that round-trips a
  `search` call and validates session lifecycle, 400 on missing-session
  POSTs, and session-count drop after close.
- Multi-stage `Dockerfile` (Node 22 Alpine, non-root user, `/health`
  healthcheck, source-map strip) and `docker-compose.yml` that runs the
  server in HTTP mode on `127.0.0.1:4000`.

### Changed

- Replaced the Express HTTP server with MCP stdio tooling.
- Updated package metadata (author email, repository, keywords, license).
- Upgraded `quran-search-engine` from 0.1.5 to 0.3.2. Internal API now uses
  `SearchContext`, `buildInvertedIndex`, and the new `search()` signature;
  the MCP `search` tool's input and output shapes are unchanged.
- README rewritten to document both transports and configuration snippets
  for Claude Desktop, ChatGPT Connectors, Cursor, VS Code Copilot, MCP
  Inspector, and Smithery.

## [0.1.0] - 2026-01-20

### Added

- Initial release of the Quran Search Engine MCP server.
- Express.js server setup with CORS and JSON parsing.
- `/search` POST endpoint supporting:
  - Arabic query normalization.
  - Lemma and Root based search options.
  - Pagination (page and limit).
  - Search term highlighting in results.
- `/health` GET endpoint for service status checks.
- Integration with `quran-search-engine` for core search logic.
- Automatic data loading (Quran text, morphology, word map) on server startup.
- TypeScript configuration and development scripts.
