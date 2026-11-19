# AGENTS.md

Guidance for agents working in this repository. `CLAUDE.md` points here.

This file is the always-loaded core: what the project is, how to run it, and where everything lives. The detailed rules — the ones you must not guess at — live as skills under `.claude/skills/`, listed at the bottom. Read the relevant skill before you touch that area.

## What this project is

A Cookie Run combi name is 10 characters, and the game stores only the cookie, relay, pet, and treasure in it. This project packs the rest of a run's configuration — goal, mode, episode (and the tower's floor), boosts, random boost, cookie power+ selections, and starting action — into those 10 characters, plus a browser site for building, saving and reading codes. `README.md` documents the slot format for humans.

The site is being redesigned on [kamontat/bun-astro-template](https://github.com/kamontat/bun-astro-template). The design is `docs/superpowers/specs/2026-11-19-site-redesign-design.md`; the plans for each piece are in `docs/superpowers/plans/`. The work lands as pull requests into a long-lived `redesign` branch, which merges into `main` once the combi page is complete; until then `main` serves the previous site. On `redesign`, the stack, the combi logic and the deploy are in place, and the pages are placeholders the next pieces fill in. Describe and change the code as it is; read the spec for where it is going.

## Runtime and stack

- **Bun** runs everything (`mise.toml` pins the version). `bunfig.toml` sets `[run] bun = true`, so `astro` and `vitest` run on Bun rather than Node.js, and `[install] exact = true`, so every dependency is pinned exactly. Use `bun install`, `bun run <script>`, `bunx <package>`; Bun loads `.env` itself. Bun's API docs are vendored at `node_modules/bun-types/docs/**.mdx` — read those rather than guessing.
- **Astro 7**, `output: "static"`: every page is HTML rendered at build time. No adapter, no server endpoints, no Worker code — the site is static files on Cloudflare.
- **Svelte 5** through `@astrojs/svelte`, for every part that reads `localStorage` or reacts to input, rendered with `client:only="svelte"`.
- **Vitest** with happy-dom; `@testing-library/svelte` for Svelte components; Astro's Container API for `.astro` ones.
- **`astro check`** for types and **Biome** (`@kcconfigs/biome` astro preset) for lint and format, Markdown included.

## Commands

```bash
bun install
bun run dev                                  # astro dev on :4321; / is Home, /combi-name/ the combi tool, /settings/ Settings
bun run build                                # astro build into dist/, one folder per page, icons under dist/assets/
bun run preview                              # serves the built dist/ on :4321; build first
bun run test                                 # vitest run, the whole suite — a few minutes, the exhaustive combi test dominates
bun run test tests/lib/combi/codec.test.ts   # one file
bun run test -t "decodes every slot"         # one test by name substring
bun run check                                # astro check, then biome check
bun run format                               # biome check --unsafe --write; read the diff after
bun run fetch:assets                         # re-syncs public/assets/ from cookierunhub.com
bun run verify:assets                        # asks cookierunhub.com whether the committed index is still complete
bun run deploy                               # wrangler deploy; wrangler runs the build itself
```

Every script but two is the command itself in `package.json`, resolved from `node_modules/.bin` by `bun run`. Only `fetch:assets` and `verify:assets` are programs, under `scripts/`. Before committing, `bun run format && bun run check && bun run test && bun run build` must all pass.

## Project layout

| Path                | What lives there                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/`        | One route per file: `index.astro` (Home), `combi-name/index.astro`, `settings/index.astro`. Every page is `<slug>/index.astro` and builds to `dist/<slug>/index.html` (`build.format: "directory"`), so links already shared as `/combi-name/#CODE?note=…` keep opening. |
| `src/layouts/`      | Templates. `BaseLayout.astro` owns `<html>`, `<head>` (title, favicon, Google Tag Manager) and imports the global CSS; every page renders inside it.                                                                                                                     |
| `src/components/`   | Components in Atomic Design tiers — `atoms/`, `molecules/`, `organisms/` — as `.astro` or `.svelte` files. Empty on this branch.                                                                                                                                         |
| `src/lib/`          | Framework-free TypeScript more than one place uses: the tool registry (`tools.ts`), build details (`build-info.ts`), Google Tag Manager (`gtm.ts`), resizable panel widths (`panel-width.ts`).                                                                           |
| `src/lib/combi/`    | The combi logic: codec, labels, describe, hints, art, catalog, loadout, full code, the address-bar and saved-list state, run stats. No DOM, no framework.                                                                                                                |
| `src/styles/`       | Global CSS, imported once by `BaseLayout`. Today only the `@kcstyles/reset.css` reset.                                                                                                                                                                                   |
| `src/env.d.ts`      | The `PUBLIC_*` build variables on `ImportMetaEnv`, and the reset's `row` / `block` attributes.                                                                                                                                                                           |
| `public/`           | Copied to `dist/` unchanged. `public/assets/` holds the icons (served at `/assets/...`, never inlined) and `index.json`, the catalog; `public/.assetsignore` keeps that index out of the deploy.                                                                         |
| `scripts/`          | The two asset programs and their helpers in `scripts/utils/`.                                                                                                                                                                                                            |
| `tests/`            | Every test, mirroring `src/` and `scripts/` (`src/lib/combi/codec.ts` → `tests/lib/combi/codec.test.ts`), plus build, config, deploy and skills checks.                                                                                                                  |
| `docs/superpowers/` | Design specs and implementation plans.                                                                                                                                                                                                                                   |

### Imports

Cross-directory imports go through the aliases in `package.json`'s `imports` field:

- `#lib/*` → `./src/lib/*.ts` — no extension in the import (`#lib/combi/codec`, `#lib/gtm`).
- `#components/*` → `./src/components/*` and `#layouts/*` → `./src/layouts/*` — with the extension (`#components/atoms/Seg.svelte`, `#layouts/BaseLayout.astro`).
- `#assets/*` → `./public/assets/*` — `#assets/index.json` names its own extension.

No TypeScript import carries `.ts`; `.astro` and `.svelte` imports always carry theirs.

### Tiers

Components follow Atomic Design, enforced by `tests/components/atomic.test.ts`: an atom imports no component, a molecule only atoms, an organism atoms, molecules and organisms. Layouts and pages may import any tier. `src/components/` imports from `src/lib/` and `src/styles/`, never from `src/layouts/` or `src/pages/`; `src/lib/` imports from none of them.

### Where the combi logic lives

`src/lib/combi/` is the whole combi wire format and everything derived from it, with tests in `tests/lib/combi/`. The format does not change in the redesign: `codec.ts`, `catalog.ts`, `loadout.ts` and `full-code.ts` moved here unchanged, and their tests — the exhaustive round-trip over every combi included — carry over. Read the `project-combi-codec` skill before touching any of it.

## Hosting

A Cloudflare Worker named `cr-tools` serving `dist/` as static assets. Production is `https://cr-tools.kc.in.th`, deployed from `main`; every pull request gets a preview at `https://pr-<number>-cr-tools.kcinth.workers.dev/`. The deploy workflows pass `PUBLIC_DEPLOY_ENV`, `PUBLIC_COMMIT_SHA`, `PUBLIC_BUILT_AT`, and for previews `PUBLIC_PR_NUMBER` and `PUBLIC_BRANCH`, which `src/lib/build-info.ts` reads; production alone passes `PUBLIC_GTM_ID`. See the `project-deploy` skill.

## Working here

- Every change gets its own worktree, is built test-first, and ends in a pull request with a preview URL — see `project-shipping`. Redesign pull requests target `redesign` while it exists.
- `gh` may have a work account active; run GitHub commands for this repository as `GH_TOKEN=$(gh auth token --user kamontat) gh …`.
- Commits are conventional, lower case and scoped (`feat(frame): …`, `build: …`, `ci: …`, `test: …`).

## Skills

| Skill                 | Read it before                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `project-shipping`    | starting any change — worktree, base branch, test first, checks, PR and preview URL                                   |
| `project-landing`     | merging an approved PR — changelog entry, merge, worktree cleanup                                                     |
| `project-changelog`   | writing or editing a `CHANGELOG.md` entry                                                                             |
| `project-combi-codec` | touching `src/lib/combi/` — the tables are the wire format, and their order is load-bearing                           |
| `project-assets`      | touching `public/assets/`, the asset scripts, or showing an icon in a page                                            |
| `project-components`  | writing a component in `src/components/`, `.astro` or `.svelte`, or its test                                          |
| `project-layouts`     | changing `BaseLayout` or adding a layout in `src/layouts/`                                                            |
| `project-pages`       | adding or editing a page in `src/pages/` or a tool in `src/lib/tools.ts`                                              |
| `project-scripts`     | changing a package script or `scripts/`, running the tests, or fixing a `check` failure                               |
| `project-deploy`      | changing the build, `astro.config.ts`, `public/`, `wrangler.jsonc`, the `PUBLIC_*` variables, or `.github/workflows/` |
