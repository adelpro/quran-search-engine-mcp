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

### Changed

- Replaced the Express HTTP server with MCP stdio tooling.
- Updated package metadata (author email, repository, keywords, license).

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
