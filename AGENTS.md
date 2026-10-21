<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Rules for anyone changing this repository, people and coding agents alike. They follow the team guidelines in [akses-bogor-docs/guidelines](https://github.com/al-dioooo/akses-bogor-docs/tree/main/guidelines).

## Repository rules

**Commits.** Small and focused: one logical change, roughly 5 to 100 lines, easy to revert. Never mix a refactor with a feature, or a fix with formatting. No WIP commits on shared branches and no vague messages like "update code".

**Before committing.** `pnpm lint`, `pnpm typecheck` and `pnpm test:a11y` pass, and the change works locally. New features come with tests.

**Messages.** Conventional Commits for commit messages and PR titles: `type(scope): description`, e.g. `feat(peta): show markers by status`. Types: feat, fix, refactor, docs, chore, test. Mark breaking changes with `!`.

**Branches.** Trunk-based. `main` is always release-ready; `release` tracks production; there is no `develop` or `staging`. Work on short-lived `feature/<desc>`, `fix/<desc>` or `chore/<desc>` branches and merge through a PR whose title carries the issue number, e.g. `feat(laporan): add step 2 facility answers (#14)`. No direct commits to `main` except emergency hotfixes.

**Secrets.** Never commit `.env*` files, API keys, tokens, credentials or logs. Secrets live in the Vercel project settings; only `.env.example` with empty or sample values is committed.

**Docs.** Keep the README sections current: overview, tech stack, setup and run, environment variables, deployment. `docs/` holds the architecture diagram. Product and technical decisions are ADRs in [akses-bogor-docs](https://github.com/al-dioooo/akses-bogor-docs/tree/main/decisions), not here.

## UI conventions

- Every page meets WCAG 2.2 level AA, with touch targets of at least 44 × 44 px ([ADR-0021](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0021-wcag-22-aa-dan-pengujian-berlapis.md)). Fill in the accessibility checklist in the PR template for every UI change.
- UI text lives in `messages/id.json` and is read through next-intl, never written inline in components ([ADR-0020](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0020-antarmuka-bahasa-indonesia-siap-i18n.md)).
- Colours, spacing and radii come from the design system tokens as CSS variables named like the Figma code syntax, e.g. `var(--color-text-primary)` ([ADR-0009](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0009-design-system-kaca-ungu-inklusi.md), [ADR-0013](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0013-tech-stack-nextjs-fastify.md)).
- Status is always text, icon and colour together, never colour alone.

## Attribution

Never add AI attribution anywhere: no AI author or `Co-authored-by` trailers, no "Generated with" or "Written by" lines in commit messages, PR titles or descriptions, code comments, docs, or UI copy. Commits are authored by the human team only.

## Writing

All text people read (UI copy, headings, button labels, docs, commit messages, PR descriptions) must read as written by a person. Before committing text, check it with the unslop skill: run `python3 ~/.claude/skills/unslop/scripts/banned_phrase_scan.py` and `structure_scan.py` on it, and cut formulaic framing, inflated words, empty slogans and filler. UI copy is short, concrete and in plain Bahasa Indonesia.
