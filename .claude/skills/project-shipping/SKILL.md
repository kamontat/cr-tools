---
name: project-shipping
description: Use when starting any code, style, config, docs or CI change in this repo — a feature, bugfix, refactor or tweak — before editing a file, including one-line fixes and changes the user calls small.
---

# Shipping a change

## Overview

Every change in this repo lives in its own worktree and branch, is built test-first, and
ends with a pull request whose preview deployment URL goes back to the user. Nothing is
edited on `main` (or on `redesign`), and nothing is merged here — merging is
`project-landing`, and only after the user approves.

**Violating the letter of these steps is violating their spirit.** The user set this
workflow, so only their explicit words skip a step ("skip the test for this one"). Hurry,
size or "just" are not permission. When they do skip one, say which in the PR test plan.

## The base branch

While the site redesign is in progress, its work lands as several pull requests into a
long-lived `redesign` branch, and `redesign` merges into `main` in one go once the combi
page is complete (see `docs/superpowers/specs/2026-11-19-site-redesign-design.md`). So:

- **Redesign work** branches from `origin/redesign` and its PR targets `redesign`.
- **Anything else**, and everything once `redesign` no longer exists, branches from
  `origin/main` and targets `main`.

Check with `git ls-remote --heads origin redesign`. Below, `<base>` is whichever applies.

## GitHub account

`gh` may have a work account active. Every GitHub command for this repository runs as the
owner's personal account:

```sh
GH_TOKEN=$(gh auth token --user kamontat) gh pr create ...
```

The same prefix goes on `gh pr checks`, `gh pr view`, `gh run view` and `gh api`. A plain
`git push` uses git's own credentials and needs no prefix.

## Steps

1. **Worktree.** Every change gets one. Call `EnterWorktree` with a short kebab-case `name`
   describing the change (no `worktree-` prefix — the tool adds it). It creates
   `.claude/worktrees/<name>` on branch `worktree-<name>`. For redesign work, base it on
   `origin/redesign` (`git reset --hard origin/redesign` straight after creating it, before
   any edit, if the tool based it on `main`). Already inside a worktree for this change?
   Keep using it. Then run `bun install` — a new worktree has no `node_modules`. Never use
   bare `git stash` in a worktree: the stash stack is shared with every other checkout.
2. **Test first.** REQUIRED SUB-SKILL: superpowers:test-driven-development. Write the
   failing test under `tests/`, mirroring the `src/` path (`src/lib/combi/codec.ts` →
   `tests/lib/combi/codec.test.ts`, `src/components/atoms/Seg.svelte` →
   `tests/components/atoms/Seg.test.ts`), run `bun run test <file>` and watch it fail for
   the right reason.
3. **Code.** Write the smallest code that passes. Follow the layout in `AGENTS.md` and read
   the skill for the area first (`project-combi-codec`, `project-assets`,
   `project-components`, `project-layouts`, `project-pages`, …): pages in `src/pages/`
   wrapped in `BaseLayout`, components in an atomic tier under `src/components/` (`atoms/`,
   `molecules/`, `organisms/`), shared TypeScript in `src/lib/`, imports through the
   `#components/*`, `#layouts/*` and `#lib/*` aliases.
4. **Format, check, test, build.** All must pass before committing:
   ```sh
   bun run format      # biome check --unsafe --write
   bun run check       # astro check + biome check
   bun run test        # vitest run; the exhaustive combi test takes a few minutes
   bun run build
   ```
   A failure means fix and rerun the whole list, not commit and fix later. `format` rewrites
   files, so stage after it (`git add -A`), and check `git status` for stray files.
5. **Commit.** Conventional commits, lower case, scoped to the area when one fits:
   `feat(frame): ...`, `fix(combi): ...`, `build: ...`, `ci: ...`, `test: ...`. A `!` after
   the type marks a change to the wire format (`feat(combi)!: ...`). One logical change per
   commit. End each message with the `Co-Authored-By` line. Do not touch `CHANGELOG.md` yet
   — that happens when landing.
6. **Push.** `git push -u origin HEAD`.
7. **Pull request.**
   ```sh
   GH_TOKEN=$(gh auth token --user kamontat) gh pr create --base <base> \
     --title "<type>(<scope>): <summary>" --body "<Summary bullets + Test plan>"
   ```
   Body: `## Summary` bullets, `## Test plan` checklist (tests ticked, preview checks
   unticked), then the Claude Code attribution line. Pushing more commits to an open PR
   updates it — don't open a second one.
8. **Deployed URL.** Wait for the preview deploy, then report the URL:
   ```sh
   GH_TOKEN=$(gh auth token --user kamontat) gh pr checks <number> --watch
   ```
   The URL is `https://pr-<number>-cr-tools.kcinth.workers.dev/` — the `environment.url` in
   `.github/workflows/deploy-preview.yml` with the PR number filled in. Report it only after
   the `deploy` check passes; if it fails, say so with the failing line.

Then stop and hand the user the PR link and preview URL. Wait for their approval before
using `project-landing`.

## Red flags — stop

| Thought | Instead |
|---|---|
| "Tiny change, I'll edit on main" | Every change gets a worktree. `main` and `redesign` only move by merge. |
| "Redesign PR, but `--base main` is the default" | Redesign work targets `redesign` while it exists. |
| "`gh` said 404 / not found" | Probably the work account. Prefix `GH_TOKEN=$(gh auth token --user kamontat)`. |
| "I'll add the test after" | Test first, and watch it fail. |
| "CSS/copy change, nothing to test" | Test the rendered HTML with the Container API, or the Svelte component with Testing Library. Only layout and colour, which no test renders, go untested; list them as preview checks in the PR. |
| "CI will run check for me" | Run the full list locally before committing. |
| "Deploy is probably fine" | Report the URL only after the check passes. |
| "User said ok earlier, I'll merge" | Approval is per change, after they see the preview. |
