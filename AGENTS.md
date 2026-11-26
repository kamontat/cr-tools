# AGENTS.md

Guidance for agents working in this repository. `CLAUDE.md` points here.

This file is the always-loaded core: what the project is, how to run it, and where everything lives. The detailed rules — the ones you must not guess at — live as skills under `.claude/skills/`, listed at the bottom. Read the relevant skill before you touch that area.

## What this project is

A Cookie Run combi name is 10 characters, and the game stores only the cookie, relay, pet, and treasure in it. This project packs the rest of a run's configuration — goal, mode, episode (and the tower's floor), boosts, random boost, cookie power+ selections, and starting action — into those 10 characters, plus a browser site for building, saving and reading codes. `README.md` documents the slot format for humans.

The site is being redesigned on [ktemplates/astro](https://github.com/ktemplates/astro). The design is `docs/superpowers/specs/2026-11-19-site-redesign-design.md`; the plans for each piece are in `docs/superpowers/plans/`. The first three pieces (template, language, combi page and Home) are on `main` and in production: the stack, the combi logic, the deploy and the frame (top bar, sidebar, side panel) are in place, Home and Settings are built, and the combi page has its saved list, editor and Share. Piece 4 gives each saved code its rounds, edited in the Run log as a table. Piece 5 puts back up and restore in Settings, whose rows open in place. The redesign is complete: no piece is still to come. Next is one shared look, Sugar Rush, for every page, panel and pop-up: `docs/superpowers/specs/2026-11-25-sugar-rush-look-design.md`. Thai is the default language, English the alternative (`src/lib/lang.ts`, catalogues in `src/lib/i18n/`). Describe and change the code as it is; read the spec for the design behind it.

## Runtime and stack

- **Node.js** runs everything and **pnpm** installs it. `package.json` is the one place both are pinned: `devEngines.runtime` (Node.js) and `devEngines.packageManager` (pnpm), with `onFail: "download"`, so pnpm fetches the exact versions itself; `volta.node` mirrors the Node.js version and `engines.node` lists the supported range. `mise.toml` pins neither and reads them from `package.json`. `pnpm-workspace.yaml` sets `saveExact`, so every dependency is pinned exactly, and lists in `allowBuilds` the packages allowed to run install scripts. Use `pnpm install`, `pnpm run <script>`, `pnpm exec <binary>`. The asset programs under `scripts/` run as plain `node scripts/<name>.ts` (Node.js strips the types), so they use only `node:` APIs and erasable TypeScript syntax.
- **Astro 7**, `output: "static"`: every page is HTML rendered at build time. No adapter, no server endpoints, no Worker code — the site is static files on Cloudflare.
- **Svelte 5** through `@astrojs/svelte`, for every part that reads `localStorage` or reacts to input, rendered with `client:only="svelte"`.
- **Vitest** with happy-dom; `@testing-library/svelte` for Svelte components; Astro's Container API for `.astro` ones.
- **`astro check`** for types and **Biome** (`@kcconfigs/biome` astro preset) for lint and format, Markdown included.

## Commands

```bash
pnpm install
pnpm run dev                                  # astro dev on :4321; / is Home, /combi-name/ the combi tool, /settings/ Settings
pnpm run build                                # astro build into dist/, one folder per page, icons under dist/assets/
pnpm run preview                              # serves the built dist/ on :4321; build first
pnpm run test                                 # vitest run, the whole suite — a few minutes, the exhaustive combi test dominates
pnpm run test tests/lib/combi/codec.test.ts   # one file
pnpm run test -t "decodes every slot"         # one test by name substring
pnpm run check                                # astro check, then biome check
pnpm run format                               # biome check --unsafe --write; read the diff after
pnpm run fetch:assets                         # re-syncs public/assets/ from cookierunhub.com
pnpm run verify:assets                        # asks cookierunhub.com whether the committed index is still complete
pnpm run deploy                               # wrangler deploy; wrangler runs the build itself
```

Every script but two is the command itself in `package.json`, resolved from `node_modules/.bin` by `pnpm run`. Only `fetch:assets` and `verify:assets` are programs, under `scripts/`. Before committing, `pnpm run format && pnpm run check && pnpm run test && pnpm run build` must all pass.

## Project layout

| Path                | What lives there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/`        | One route per file: `index.astro` (Home), `combi-name/index.astro`, `settings/index.astro`, each rendered in `AppLayout`. Every page is `<slug>/index.astro` and builds to `dist/<slug>/index.html` (`build.format: "directory"`), so links already shared as `/combi-name/#CODE?note=…` keep opening.                                                                                                                                                                                                                                                                                                                         |
| `src/layouts/`      | Templates. `BaseLayout.astro` owns `<html>` (with `data-env`), `<head>` (both titles, favicon, the inline theme and language boots, Google Tag Manager) and imports the global CSS. `AppLayout.astro` wraps it in the frame — top bar, sidebar, and `main > .wrap`, the one page gutter — re-syncs language and theme from storage (on load and on a back-forward restore), and every page renders inside it.                                                                                                                                                                                                                  |
| `src/components/`   | Components in Atomic Design tiers, as `.astro` or `.svelte` files: atoms `NavItem`, `Button`, `Segmented`, `Text` (one string in both languages), `Chips`, `EntryIcon`, `HelpToggle`, `Tabs`, `Toast`; molecules `Panel` (a section in the page), `ToolCard`, `CodeDisplay`, `EntryPicker`, `Field`, `LoadoutIcons`, `SettingsRow` (a row that opens in place); organisms `TopBar`, `Sidebar`, `SettingsApp`, `HomeSaved` and the combi page's `CombiApp`, `CombiList`, `CombiFilter`, `CombiEditor`, its `Editor*Tab`s, `TreasureSlot`, `ShareBox`, and Settings' `StorageBox`, `BackupBox`, `RestoreBox` and `DeleteAllBox`. |
| `src/lib/`          | Framework-free TypeScript more than one place uses: the tool registry (`tools.ts`), build details (`build-info.ts`), Google Tag Manager (`gtm.ts`), the sidebar and its breakpoints (`frame.ts`), the one `localStorage` wrapper (`storage.ts`), the theme (`theme.ts`), the language (`lang.ts`) and its Thai and English catalogues (`i18n/`), resizable panel widths (`panel-width.ts`), copying to the clipboard (`clipboard.ts`), the backup file (`backup.ts`), reading a backup from a link (`backup-link.ts`) and saving a file (`download.ts`).                                                                       |
| `src/lib/combi/`    | The combi logic: codec, labels, describe, hints, art, catalog, loadout, full code, the address-bar and saved-list state, `rounds.ts` (a saved code's rounds, and the conversion from the old stat ranges), `issues.ts` (codec issues as ids), `draft.ts` (the editor's build, with held picks), `editor.ts` (what the editor draws from a draft), `list.ts` (saved-list sorts and their orders, filters and their counts, and what a row shows) and `backup.ts` (the backup file's JSON, its reading, and the storage numbers). No DOM, no framework.                                                                          |
| `src/styles/`       | Global CSS, imported once by `BaseLayout` through `global.css`: the `@kcstyles/reset.css` reset, `tokens.css`, the colour, size and stacking (`--z-*`) tokens (dark by default, light under `data-theme` or the system preference, the environment colour under `data-env`), and `lang.css`, which hides the language `<html lang>` does not name.                                                                                                                                                                                                                                                                             |
| `src/env.d.ts`      | The `PUBLIC_*` build variables on `ImportMetaEnv`, and the reset's `row` / `block` attributes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `public/`           | Copied to `dist/` unchanged. `public/assets/` holds the icons (served at `/assets/...`, never inlined) and `index.json`, the catalog; `public/.assetsignore` keeps that index out of the deploy.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `scripts/`          | The two asset programs and their helpers in `scripts/utils/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `tests/`            | Every test, mirroring `src/` and `scripts/` (`src/lib/combi/codec.ts` → `tests/lib/combi/codec.test.ts`), plus build, config, deploy and skills checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `docs/superpowers/` | Design specs and implementation plans.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Imports

Cross-directory imports go through the aliases in `package.json`'s `imports` field:

- `#lib/*` → `./src/lib/*.ts` — no extension in the import (`#lib/combi/codec`, `#lib/gtm`).
- `#components/*` → `./src/components/*` and `#layouts/*` → `./src/layouts/*` — with the extension (`#components/atoms/Segmented.svelte`, `#layouts/AppLayout.astro`).
- `#assets/*` → `./public/assets/*` — `#assets/index.json` names its own extension.
- `#scripts/*` → `./scripts/*.ts` — no extension (`#scripts/utils/asset-ids`). The asset programs import each other through it too, because plain Node.js resolves no extensionless relative import.

No TypeScript import carries `.ts`; `.astro` and `.svelte` imports always carry theirs.

### Tiers

Components follow Atomic Design, enforced by `tests/components/atomic.test.ts`: an atom imports no component, a molecule only atoms, an organism atoms, molecules and organisms. Layouts and pages may import any tier. `src/components/` imports from `src/lib/` and `src/styles/`, never from `src/layouts/` or `src/pages/`; `src/lib/` imports from none of them.

### Where the combi logic lives

`src/lib/combi/` is the whole combi wire format and everything derived from it, with tests in `tests/lib/combi/`. The format does not change in the redesign: `codec.ts`, `catalog.ts`, `loadout.ts` and `full-code.ts` moved here unchanged, and their tests — the exhaustive round-trip over every combi included — carry over. Read the `project-combi-codec` skill before touching any of it.

## Hosting

A Cloudflare Worker named `cr-tools` serving `dist/` as static assets. Production is `https://cr-tools.kc.in.th`, deployed from `main`; every pull request gets a preview at `https://pr-<number>-cr-tools.kcinth.workers.dev/`. The deploy workflows pass `PUBLIC_DEPLOY_ENV`, `PUBLIC_COMMIT_SHA`, `PUBLIC_BUILT_AT`, and for previews `PUBLIC_PR_NUMBER` and `PUBLIC_BRANCH`, which `src/lib/build-info.ts` reads; production alone passes `PUBLIC_GTM_ID`. See the `project-deploy` skill.

## Working here

- Every change gets its own worktree, is built test-first, and ends in a pull request with a preview URL — see `project-shipping`. Pull requests target `main`.
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
