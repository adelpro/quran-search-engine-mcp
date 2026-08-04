# Contributing

Thanks for your interest in **quran-search-engine-mcp** — an MCP server that
exposes 8 read-only tools for searching, navigating, and exploring the Quran.
Whether you're fixing a typo, adding a tool, or improving docs, you're welcome
here.

> **New here?** Skim [docs/index.md](docs/index.md) for the project overview,
> then come back. The dev workflow is fully covered in
> [docs/development.md](docs/development.md) — this file only highlights the
> bits that matter for _contributing_.

## Quick start (TL;DR)

```bash
git clone https://github.com/<you>/quran-search-engine-mcp.git
cd quran-search-engine-mcp
yarn install
yarn dev          # stdio; or: yarn dev:http for Streamable HTTP on PORT (3000)
```

If `yarn dev` works, you're ready to contribute. The next sections cover the
rest.

## Code of conduct

> **TODO:** a dedicated `CODE_OF_CONDUCT.md` will replace this section. Until
> then, this project follows the spirit of the
> [Contributor Covenant](https://www.contributor-covenant.org/):
>
> - Be respectful and inclusive. Disagree on ideas, not on people.
> - Assume good faith. Ask before you assume the worst.
> - No harassment, discrimination, or personal attacks — ever.
> - Help newcomers. We were all new once.

## Security

> **TODO:** a dedicated `SECURITY.md` will replace this section.

If you discover a security vulnerability, **do not open a public issue**.
Email [`contact@adelpro.us.kg`](mailto:contact@adelpro.us.kg) privately with
details and a reproducer. You should receive an acknowledgement within a few
days.

For non-security bugs against the hosted endpoint at
[`https://mcp.quran.us.kg/`](https://mcp.quran.us.kg/), please first reproduce
the issue locally with `yarn dev:http` before filing — it may be a transient
Cloudflare incident rather than a server bug.

## Requirements

| Tool    | Version    | Notes                                              |
| ------- | ---------- | -------------------------------------------------- |
| Node.js | **20+**    | Dockerfile uses `node:22-alpine`; LTS recommended. |
| Yarn    | **1.22.x** | Pinned via `"packageManager": "yarn@1.22.22"`.     |
| Git     | 2.30+      | Needed for branch/hooks.                           |

> Despite older docs that mentioned pnpm, **this repo uses Yarn 1**, not pnpm
> or npm. Using a different package manager will produce a different lockfile
> and will fail review.

## Branch model

This repo uses a lightweight GitFlow:

| Branch    | Purpose                                                              |
| --------- | -------------------------------------------------------------------- |
| `main`    | Released code; deploys to `https://mcp.quran.us.kg/`.                |
| `staging` | Pre-release integration.                                             |
| `develop` | **Default base branch for new contributions.** PRs target `develop`. |

Branch from `develop` for new work:

```text
feat/<short-kebab-name>     # new tool, new feature
fix/<short-kebab-name>      # bug fix
chore/<short-kebab-name>    # tooling, deps, CI
docs/<short-kebab-name>     # docs only
refactor/<short-kebab-name> # internal restructuring, no behavior change
test/<short-kebab-name>     # test-only changes
```

Hotfix branches off `main` are reserved for production breakage and require
explicit maintainer approval.

## Development workflow

- **TypeScript strict mode** is on (`tsconfig.json`). No `any`, no implicit
  returns, no untyped imports — the ESLint config enforces this.
- **ESM** (`"type": "module"`), NodeNext module resolution, ES2022 target.
- **Code style** is enforced by ESLint (flat config, `prettier/prettier`) and
  Prettier (`.prettierrc`): semicolons, single quotes, 100 cols, trailing
  commas.
- **Keep changes focused.** One concern per PR. If you find yourself writing
  "and also…" in the description, split it.

See [docs/architecture.md](docs/architecture.md) for how the transport,
dataset, and HTTP hardening fit together.

## Pre-PR checklist (the quality gate)

Run these **in order**, every time, before opening a PR:

```bash
yarn format              # prettier --write
yarn lint                # eslint
yarn build               # tsc → dist/
yarn test                # pretest (version sync) + stdio + http end-to-end
yarn check:submission    # MCP description length, no MUST/NEVER, full annotations
```

Notes:

- `yarn test` runs `pretest` (`scripts/check-versions.js`) which enforces
  `package.json` ↔ `server.json` version sync. **Bump both together.**
- The test scripts (`scripts/test.js`, `scripts/test-http.js`) spawn the
  compiled `dist/server.js`, which is why `yarn build` runs before them.
- `yarn check:submission` is the same linter used before publishing — run it
  locally so CI surprises are rare.

## Commit messages — Conventional Commits

Commit messages are enforced by the husky `commit-msg` hook + `commitlint`
(`commitlint.config.cjs`). Allowed types:

```text
feat fix chore docs style refactor perf test
```

Examples:

```text
feat: add search_by_root tool
fix(tools): handle empty lemma result set
docs: clarify develop-branch workflow in CONTRIBUTING
chore(deps): bump @modelcontextprotocol/sdk to 1.20.0
```

If a commit's body is needed, separate it from the subject with a blank line
and wrap at 100 columns.

## Verifying AI-generated or auto-generated code

**If any part of your contribution was produced by an AI assistant — Copilot,
ChatGPT, Claude, Cursor, or anything similar — you are the author of record and
you are responsible for verifying it.** Specifically:

- Run `yarn build` and `yarn test` locally. Don't trust "looks right."
- Re-read the diff line by line for correctness, security, and adherence to
  the patterns already in `src/tools/`.
- Confirm new tools are wired in `src/tools/index.ts` (alphabetical order)
  **and** pass `yarn check:submission` (description ≤ 299 chars, full
  annotation coverage, no `MUST` / `ALWAYS` / `NEVER` / `REQUIRED` / `SHALL`).
- Add or update tests under `scripts/` so the new behavior is exercised
  end-to-end.
- If you can't explain _why_ a line of generated code is there, rewrite or
  remove it.

This isn't anti-AI — it's the same bar every reviewer expects from
hand-written code. PRs that obviously haven't been read by their author will
be sent back.

## Pull requests

- **Target `develop`** (not `main`), unless it's a hotfix.
- Use [.github/pull_request_template.md](.github/pull_request_template.md) and
  fill every section — Summary, Changes, Testing, Checklist.
- **Include screenshots or terminal output when your change has user-visible
  output** (new tool response shape, new CLI flag, new docs rendering, new
  integration). Drop images into the PR description — they help reviewers
  verify intent in seconds instead of minutes.
- Reference related issues with `Fixes #123` or `Refs #123`.
- One logical change per PR. Large refactors should be split into reviewable
  steps.
- Be patient with review. CI failures and reviewer comments aren't rejections
  — they're how the codebase stays clean.

## Adding a new MCP tool

The full walkthrough lives in
[docs/development.md#adding-a-new-tool](docs/development.md#adding-a-new-tool).
Short version: create `src/tools/<name>.ts`, register it alphabetically in
`src/tools/index.ts`, add tests in `scripts/`, document it in
[docs/tools.md](docs/tools.md), and run the full pipeline above.

## Reporting bugs / requesting features

Use the issue templates:

- **Bug** → [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)
- **Feature** → [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)

Include logs, reproduction steps, expected vs actual behavior, your OS, Node
version, and (where relevant) a screenshot or terminal capture.

## License

This project is licensed under the [MIT License](LICENSE). By contributing,
you agree that your contributions will be licensed under the same MIT terms.

---

Questions, or not sure where to start? Open an issue or email
[`contact@adelpro.us.kg`](mailto:contact@adelpro.us.kg).
