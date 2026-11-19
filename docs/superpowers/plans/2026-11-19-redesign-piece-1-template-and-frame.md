# Redesign piece 1: template and frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move cr-tools onto `kamontat/bun-astro-template` (Astro, static output, Svelte islands) with every framework-free module and test carried over, then build the new site frame: look, sidebar, pop-up panel, Settings with Appearance and About, and the environment line.

**Architecture:** Astro renders every page at build time; parts that read localStorage or react to input are Svelte components loaded with `client:only="svelte"`, and small frame behaviour (sidebar toggle) is a plain `<script>` in an `.astro` component. Framework-free logic lives in `src/lib/` (combi logic in `src/lib/combi/`), tests mirror it under `tests/`. Work lands as two pull requests into a long-lived `redesign` branch: **PR A** (Tasks 1–5) moves the repository, **PR B** (Tasks 6–10) builds the frame.

**Tech Stack:** Astro 7.4.7 (`output: "static"`), Svelte 5 via `@astrojs/svelte`, Vitest 5.1.0 + happy-dom 21.0.4 + `@testing-library/svelte`, Biome 2.6.5 with `@kcconfigs/biome/configs/astro`, TypeScript 6.0.3 with `astro check`, Bun 1.4.4 (mise), Wrangler, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md` (sections Constraints, Approaches, The design → Look, Frame, Pop-ups, Settings, Build information; Order of work → piece 1).

**Template reference:** a copy of `kamontat/bun-astro-template` (`gh api repos/kamontat/bun-astro-template/tarball/main`). Take its files verbatim unless a task says otherwise; replace `<TODO>` with `cr-tools`.

## Global Constraints

- Static output only: no Astro adapter, no server endpoints, no Worker code beyond static assets.
- The combi wire format does not change: `codec.ts`, `catalog.ts`, `loadout.ts`, `full-code.ts` move without behaviour changes, and their tests (including `exhaustive.test.ts`, timeout `300_000`) pass unchanged apart from imports and formatting.
- Worker `cr-tools`; production URL `https://cr-tools.kc.in.th`; preview URL `https://pr-${{ github.event.number }}-cr-tools.kcinth.workers.dev/`.
- Old URLs keep working: `/combi-name/` and `/combi-name/#CODE?note=…` must reach the combi page with the hash intact.
- Icons are served as static files under `/assets/...`, never inlined.
- Google Tag Manager container `GTM-KXNDQVC3`, production only, through `PUBLIC_GTM_ID` from the `GTM_ID` repository variable.
- Storage keys read as-is: `theme` (`"light"` | `"dark"`, absent = system). New frame keys: `frame:sidebar`, `frame:panel-width:<id>`.
- Every localStorage access is wrapped; a throwing or missing storage falls back to defaults.
- Pins are exact (`bunfig.toml` `exact = true`). For packages the template does not pin (`svelte`, `@astrojs/svelte`, `@testing-library/svelte`), add the newest release that supports Astro 7.4.7 and is at least two weeks old.
- Breakpoints: phone `< 700px`; rail-only `700px–1099px`; full sidebar allowed `>= 1100px`.
- Panel width: min `360px`; max `70%` of the viewport for the editor (`id = "editor"`), `60%` for every other panel.
- Environment line colours: development `#3b82f6`, local `#a855f7`, preview `#f5a524`, production none.
- Accent `#ff3d7f` (dark) / `#d81b60` (light); code colour `#ffd23f` (dark) / `#9a5b00` (light).
- Commits: conventional, lower case, scoped (`feat(frame): …`, `build: …`, `ci: …`, `test: …`), ending with the `Co-Authored-By` line.

## Review Focus

1. **Storage that throws** (Safari private mode, blocked site data): theme, sidebar state and panel width must fall back to defaults and the page must still render. Tests in Tasks 6, 7 and 8.
2. **A saved panel width wider than the current window** (width saved on a desktop, page reopened on a laptop): the panel opens clamped to its max, never off-screen. Test in Task 8.
3. **Old shared links** `/combi-name/#1C2AP2FTU0289.0GA9.IFX9-AMB5200000?note=x`: the build must emit `dist/combi-name/index.html`, so the folder URL resolves and the hash reaches the page. Test in Task 3.
4. **A local or dev build with no CI values**: About must say Local or Development and show no "undefined", empty commit link or invalid date. Test in Task 4.
5. **Keyboard users**: Escape and the scrim close a panel, focus returns to the button that opened it, and the ☰ button reports `aria-expanded`. Tests in Tasks 7 and 8.

Not testable in happy-dom, so listed as preview checks in PR B: no horizontal scroll at 390px; sheet slides up on phone and in from the right on desktop; environment line colour on a preview.

---

## PR A — move onto the template

Before Task 1: `git fetch origin && git push origin origin/main:refs/heads/redesign` (creates `redesign`; tell the owner first, it is a new remote branch). Work in a worktree branched from `origin/redesign`; the PR base is `redesign`.

### Task 1: Template tooling and carried-over logic

**Files:**
- Create from the template: `astro.config.ts`, `vitest.config.ts`, `mise.toml`, `src/env.d.ts`, `src/lib/gtm.ts`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `tests/lib/gtm.test.ts`, `tests/layouts/BaseLayout.test.ts`, `tests/pages/pages.test.ts`, `tests/components/atomic.ts`, `tests/components/atomic.test.ts`, `tests/config/biome.test.ts`, `.vscode/*`.
- Replace with the template's: `package.json` (keep `name: "cr-tools"`, the `fetch:assets` / `verify:assets` scripts and a `deploy: "wrangler deploy"` script), `tsconfig.json`, `biome.json`, `bunfig.toml`, `.github/workflows/main.yml`.
- Move: `src/routes/combi-name/{art,catalog,codec,describe,full-code,hints,labels,loadout,saved,state,stats}.ts` → `src/lib/combi/`; `src/routes/combi-name/drawer-width.ts` → `src/lib/panel-width.ts`; `src/lib/{build-info,tools}.ts` stay.
- Move tests: each `src/**/X.test.ts` that covers a moved module → `tests/lib/combi/X.test.ts` (or `tests/lib/X.test.ts`); `scripts/utils/*.test.ts` → `tests/scripts/utils/`.
- Delete: `src/components/`, `src/routes/` (all HTML, CSS, `index.ts`, `summary.ts`, `index.test.ts`, `summary.test.ts`), `src/lib/href.ts` and its test, `tests/happydom.ts`, `@kctools/bun-server`, `lit`, `@happy-dom/global-registrator`, `typescript-language-server`.
- Create pages: `src/pages/index.astro`, `src/pages/combi-name/index.astro`, `src/pages/settings/index.astro` — each `<BaseLayout title="…"><h1>…</h1></BaseLayout>` placeholders, replaced in PR B and piece 3.

**Interfaces:**
- Produces: aliases `#lib/*` → `./src/lib/*.ts` (so `#lib/combi/codec`), `#components/*` → `./src/components/*`, `#layouts/*` → `./src/layouts/*`, `#assets/*` → `./assets/*` (Task 2 moves it). `TOOLS` and `ToolSlug` from `#lib/tools` unchanged. `pageEntrypoints()` now returns `["src/pages/index.astro", ...TOOLS.map(t => \`src/pages/${t.slug}/index.astro\`)]`.

- [ ] **Step 1: Add the Svelte integration and extend the atomic-tier rule to `.svelte` first (test)**

In `tests/components/atomic.test.ts` add:
```ts
it("treats .svelte components like .astro ones", () => {
	expect(checkAtomic([file("atoms/Seg.svelte"), file("molecules/Panel.svelte", ["atoms/Seg.svelte"])])).toEqual([])
	expect(checkAtomic([file("atoms/Seg.svelte", ["molecules/Panel.svelte"])])).toEqual([
		"atoms/Seg.svelte (atoms) must not import molecules/Panel.svelte (molecules)",
	])
})
```
and change `scan()` so it lists `.astro` and `.svelte` files, reading imports from the frontmatter of `.astro` files and from `<script …>` blocks of `.svelte` files, matching specifiers ending in `.astro` or `.svelte`.

- [ ] **Step 2: Install and configure**

`bun install`, then `bun add svelte @astrojs/svelte` and `bun add -d @testing-library/svelte` (exact pins per Global Constraints). `astro.config.ts`: add `integrations: [svelte()]`. `vitest.config.ts`: `include: ["tests/**/*.test.ts"]`, add the `svelte` Vite plugin through `getViteConfig` so `.svelte` files compile in tests, `environment: "happy-dom"` for `tests/components/**` and `tests/lib/**`.

- [ ] **Step 3: Convert the carried tests**

Per moved test: `from "bun:test"` → `from "vitest"`; `import.meta.dir` → `import.meta.dirname`; module imports → `#lib/combi/<name>` or `#lib/<name>`. No assertion changes. `tests/lib/tools.test.ts` asserts `pageEntrypoints()` files exist and that `src/pages/*/index.astro` directories equal `TOOLS` slugs plus `settings`.

- [ ] **Step 4: Run the whole check list**

Run: `bun run format && bun run check && bun run test && bun run build`
Expected: all pass; the test count includes every carried test (today's suite is 680 tests across 33 files minus the deleted UI tests); `dist/index.html`, `dist/combi-name/index.html` (after Task 3), `dist/settings/index.html` exist.

- [ ] **Step 5: Commit** — `build: move onto bun-astro-template with svelte`

### Task 2: Icons as static files

**Files:**
- Move: `assets/` → `public/assets/` (git mv, keeps history).
- Create: `public/.assetsignore` containing `assets/index.json`.
- Modify: `package.json` imports `#assets/*` → `./public/assets/*`; `scripts/fetch-assets.ts:37` and `scripts/verify-assets.ts:26` paths `../assets/` → `../public/assets/`; doc comments naming `assets/`.
- Test: `tests/build/assets.test.ts`.

**Interfaces:**
- Produces: icon URL for a catalog image path `p` is `/assets/${p}` (e.g. `/assets/cookies/fire_spirit_cookie.webp`); `#assets/index.json` still imports the index.

- [ ] **Step 1: Write the failing test** — `tests/build/assets.test.ts`, run after `bun run build`:
```ts
test("icons ship as files and the index does not", async () => {
	expect(await Bun.file("dist/assets/cookies/fire_spirit_cookie.webp").exists()).toBe(true)
	expect(await Bun.file("dist/.assetsignore").text()).toContain("assets/index.json")
})
```
The test builds once in a `beforeAll` with `Bun.spawnSync(["bun", "run", "build"])` and a `120_000` timeout.
- [ ] **Step 2: Run, expect FAIL** (`dist/assets/...` missing).
- [ ] **Step 3: Move the folder and update the paths.**
- [ ] **Step 4: Run** `bun run test tests/build tests/scripts` — expect PASS; `bun run fetch:assets --help` or a dry read of `verify:assets` resolves the new index path.
- [ ] **Step 5: Commit** — `build: serve icons from public/assets`

### Task 3: Old URLs keep working

**Files:** Modify `astro.config.ts`; extend `tests/build/assets.test.ts` → rename to `tests/build/output.test.ts`.

- [ ] **Step 1: Failing test**
```ts
test("pages build as folders, so /combi-name/ and its hash links still open", async () => {
	expect(await Bun.file("dist/combi-name/index.html").exists()).toBe(true)
	expect(await Bun.file("dist/combi-name.html").exists()).toBe(false)
})
```
- [ ] **Step 2: Run, expect FAIL** (template default `build.format: "file"`).
- [ ] **Step 3:** `astro.config.ts`: `build: { format: "directory" }`, `trailingSlash: "ignore"`; replace the template's comment with one saying why (links already shared use `/combi-name/#…`).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `build: keep folder urls so shared combi links still open`

### Task 4: Build information and environment

**Files:**
- Modify: `src/lib/build-info.ts`, `src/env.d.ts`, `.github/workflows/deploy-preview.yml`, `.github/workflows/deploy-production.yml`, `tests/lib/build-info.test.ts`, `tests/lib/deploy.test.ts` (moved from `src/lib/deploy.test.ts`).

**Interfaces:**
- Produces in `#lib/build-info`:
  - `type Environment = "development" | "local" | "preview" | "production"`
  - `type BuildEnv = { dev: boolean; deploy?: string; commit?: string; builtAt?: string; pr?: string; branch?: string }`
  - `readBuildInfo(env?: BuildEnv): BuildInfo` with `BuildInfo = { environment: Environment; commit: string | null; shortCommit: string | null; commitUrl: string | null; builtAt: Date | null; pr: number | null; branch: string | null }`. Default `env` reads `import.meta.env.DEV`, `PUBLIC_DEPLOY_ENV`, `PUBLIC_COMMIT_SHA`, `PUBLIC_BUILT_AT`, `PUBLIC_PR_NUMBER`, `PUBLIC_BRANCH`.
  - `type AboutRow = { key: "environment" | "built" | "source" | "commit" | "changelog"; text: string; href?: string }`
  - `aboutRows(info: BuildInfo): AboutRow[]`
  - `REPO_URL = "https://github.com/kamontat/cr-tools"`, `CHANGELOG_URL = \`${REPO_URL}/blob/main/CHANGELOG.md\``.

- [ ] **Step 1: Failing tests** in `tests/lib/build-info.test.ts`:
  - `dev: true` → `environment: "development"`; `deploy: "preview"` → `"preview"`; `deploy: "production"` → `"production"`; nothing set → `"local"`; an unknown `deploy` value → `"local"`.
  - `pr: "31"` → `31`; `pr: ""` or `"abc"` → `null`; `builtAt: "not a date"` → `null`.
  - `aboutRows` keys per environment exactly as the spec's table: development `["environment","source"]`; local `["environment","built","source"]`; preview `["environment","built","source","commit"]`; production `["environment","built","source","commit","changelog"]`.
  - preview `environment` row text `"Preview pr-31"`; preview `source` row text `"<branch> · #31"` with `href: REPO_URL`; production `changelog` row `href: CHANGELOG_URL`; `commit` row `text` is the 7-character short commit and `href` its commit URL.
  - local with no values: no row's `text` contains `"undefined"`, `"null"` or `"Invalid"`.
  - `built` row text is `builtAt.toISOString()`; the page formats it in the viewer's time zone (Task 9), so the row carries the raw value.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** in `src/lib/build-info.ts`; declare the six `PUBLIC_*` variables in `src/env.d.ts`.
- [ ] **Step 4: Workflows.** Both deploy steps get `PUBLIC_DEPLOY_ENV` (`preview` / `production`), `PUBLIC_COMMIT_SHA` (preview: `github.event.pull_request.head.sha`; production: `github.sha`), `PUBLIC_BUILT_AT` (the existing `stamp` step), and production also `PUBLIC_GTM_ID: ${{ vars.GTM_ID }}`; preview also `PUBLIC_PR_NUMBER: ${{ github.event.number }}` and `PUBLIC_BRANCH: ${{ github.head_ref }}`. Keep the existing pinned action SHAs and comments. `tests/lib/deploy.test.ts` additionally asserts each deploy workflow sets `PUBLIC_DEPLOY_ENV` to its environment name.
- [ ] **Step 5: Run** `bun run test tests/lib` — PASS.
- [ ] **Step 6: Commit** — `ci: report environment, pr and branch to the build`

Note for the owner, not the implementer: production needs the repository variable `GTM_ID=GTM-KXNDQVC3` before `redesign` merges into `main` (`gh variable set GTM_ID --body GTM-KXNDQVC3`). Ask before setting it.

### Task 5: Agent docs and skills

**Files:**
- Replace: `AGENTS.md` (describe the new layout, commands `bun run dev|build|preview|test|check|format`, aliases, tiers, where combi logic lives, the skills table), keep `CLAUDE.md` pointing at it.
- Skills: copy the template's `project-*` skills; port this repo's `combi-codec` → `project-combi-codec` and `assets` → `project-assets` (updating paths to `src/lib/combi/` and `public/assets/`), fold `changelog`, `shipping-a-change`, `landing-a-change` into the template's `project-changelog`, `project-shipping`, `project-landing` (keep this repo's preview URL, the `redesign` base while it exists, and the changelog format already in `CHANGELOG.md`). Delete `ui-components`, `adding-a-page`, `repo-scripts`, `build-and-deploy` after moving anything still true into `project-components`, `project-pages`, `project-scripts`, `project-deploy`.
- Test: the template's `tests/skills.test.ts`.

- [ ] **Step 1:** Copy `tests/skills.test.ts`; run it — FAIL on the unprefixed skills.
- [ ] **Step 2:** Port and rename as above.
- [ ] **Step 3:** Run `bun run test tests/skills.test.ts` — PASS. Grep: `rg -n "src/routes|bun-server|lit|happydom|#components/.*\.ts" AGENTS.md .claude/skills` prints nothing.
- [ ] **Step 4: Commit** — `docs: agent guidance for the astro layout`

Then: full check list, push, PR into `redesign`, wait for the `deploy` check, report the preview URL. Stop for the owner's approval before PR B.

---

## PR B — the frame

Branch from `redesign` after PR A merges.

### Task 6: Look, tokens and theme

**Files:**
- Create: `src/styles/tokens.css` (imported by `global.css`), `src/lib/storage.ts`, `src/lib/theme.ts`.
- Modify: `src/layouts/BaseLayout.astro` (inline theme boot, `data-env` on `<html>`).
- Test: `tests/lib/storage.test.ts`, `tests/lib/theme.test.ts`, `tests/layouts/BaseLayout.test.ts`.

**Interfaces:**
- `#lib/storage`: `localStore(): Storage | null` (null when access throws); `readKey(key: string, store?: Storage | null): string | null`; `writeKey(key: string, value: string | null, store?: Storage | null): boolean` (null removes; false when the write throws).
- `#lib/theme`: `type Theme = "system" | "dark" | "light"`; `THEME_KEY = "theme"`; `readTheme(store?): Theme`; `writeTheme(theme: Theme, store?): void` (`"system"` removes the key); `applyTheme(theme: Theme, root: HTMLElement): void` (sets `data-theme` for dark/light, removes it for system).
- CSS custom properties consumed by every later component: `--bg --surface --hover --text --muted --line --accent --on-accent --code --danger --success --env --radius --radius-lg --mono --tap` (`--tap: 2.75rem`). Dark values are the defaults on `:root`; light values under both `@media (prefers-color-scheme: light) :root:not([data-theme="dark"])` and `:root[data-theme="light"]`; `--env` set per `:root[data-env="…"]`. Values: the prototype's `.site` / `.site.light` blocks.

- [ ] **Step 1: Failing tests**
  - storage: `readKey` returns null and `writeKey` returns false when given an object whose `getItem`/`setItem` throw; `localStore()` returns null when `window.localStorage` getter throws (stub with `Object.defineProperty`).
  - theme: `readTheme` maps `"dark"`, `"light"`, anything else → `"system"`; `writeTheme("system")` removes `theme`; `applyTheme("light", el)` sets `data-theme="light"`, `applyTheme("system", el)` removes it.
  - BaseLayout source contains an `is:inline` script that reads `localStorage.getItem("theme")` inside `try`, and `<html … data-env={…}>` fed from `readBuildInfo().environment`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Body font stack `system-ui, "Noto Sans Thai", "Thonburi", sans-serif`; codes use `--mono`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(frame): tokens and theme`

### Task 7: App layout, top bar and sidebar

**Files:**
- Create: `src/layouts/AppLayout.astro`, `src/components/organisms/TopBar.astro`, `src/components/organisms/Sidebar.astro`, `src/components/atoms/NavItem.astro`, `src/lib/frame.ts`.
- Modify: the three placeholder pages to use `AppLayout`.
- Test: `tests/lib/frame.test.ts`, `tests/components/organisms/Sidebar.test.ts`, `tests/components/organisms/TopBar.test.ts` (Astro Container API, as the template's `HelloWorld` test).

**Interfaces:**
- `AppLayout` props: `{ title: string; current: "home" | "settings" | ToolSlug }`. Renders `BaseLayout`, `TopBar`, `Sidebar`, then `<main id="content"><slot /></main>`, and a `<script>` calling `initFrame(document, localStore())`.
- `Sidebar` props: `{ current: AppLayout["current"] }`. Links: Home `/`, each tool `/${slug}/` with its name, Settings `/settings/` pinned to the bottom; the current one has `aria-current="page"`.
- `TopBar` props: `{ title: string }`. Renders `<button id="menu-toggle" aria-controls="sidebar" aria-expanded="false">`, the title, and the `pr-<n>` badge only when `readBuildInfo().environment === "preview"`.
- `#lib/frame`: `SIDEBAR_KEY = "frame:sidebar"`; `sidebarMode(width: number): "drawer" | "rail" | "full"` (`< 700` drawer, `< 1100` rail, else full); `initFrame(doc: Document, store: Storage | null): void` — sets `document.body.dataset.sidebar` to `"open"`/`"closed"`, toggles on ☰ click, keeps `aria-expanded` in step, persists only in `"full"` mode (default open there, closed elsewhere), closes on scrim click, Escape, and on navigation link click in drawer mode, and returns focus to ☰ after closing with Escape.

- [ ] **Step 1: Failing tests**
  - `sidebarMode(390) === "drawer"`, `sidebarMode(699) === "drawer"`, `sidebarMode(700) === "rail"`, `sidebarMode(1099) === "rail"`, `sidebarMode(1100) === "full"`.
  - `initFrame` with `innerWidth = 1280` and empty storage → `data-sidebar="open"`; click ☰ → `"closed"`, storage `frame:sidebar = "closed"`, `aria-expanded="false"`; with `innerWidth = 390` → starts `"closed"`, click → `"open"`, Escape → `"closed"` and `document.activeElement` is ☰; storage whose methods throw → still toggles.
  - Sidebar renders three links for today's `TOOLS` (Home, Combi name codes, Settings) and marks `current` with `aria-current="page"`.
  - TopBar renders the badge text `pr-31` only for a preview build (pass a `BuildEnv` through a prop default for testability: `env?: BuildEnv`).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** CSS per the spec's Frame section and the prototype: 52px top bar with the 3px `--env` line under it, 210px sidebar, 60px rail, drawer `250px` over a scrim on phones. No footer.
- [ ] **Step 4: Run, expect PASS**, then `pnpm run build`.
- [ ] **Step 5: Commit** — `feat(frame): sidebar and top bar`

### Task 8: Pop-up panel

**Files:**
- Create: `src/components/molecules/Panel.svelte`.
- Modify: `src/lib/panel-width.ts` (constants and clamp for the new rule; keep `readWidth`/`writeWidth`).
- Test: `tests/lib/panel-width.test.ts` (updated), `tests/components/molecules/Panel.test.ts` (`@testing-library/svelte`).

**Interfaces:**
- `#lib/panel-width`: `MIN_WIDTH = 360`; `maxRatio(id: string): number` (`0.7` for `"editor"`, else `0.6`); `clampWidth(width: number, viewport: number, id: string): number`; `readWidth(store, id): number | null` and `writeWidth(store, id, width)` under `frame:panel-width:<id>`.
- `Panel.svelte` props: `{ id: string; title: string; open: boolean; onclose: () => void; children: Snippet; footer?: Snippet }`. Phone (`< 700px`): bottom sheet with a grab handle, max height 92%. Otherwise: right-side panel over a scrim, resizable by a left-edge handle (`role="separator"`, arrow keys change width by 16px), width stored per `id`. Escape and scrim click call `onclose`; on close, focus returns to the element focused before opening. `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the title.

- [ ] **Step 1: Failing tests**
  - `clampWidth(100, 1200, "about") === 360`; `clampWidth(1000, 1200, "about") === 720`; `clampWidth(1000, 1200, "editor") === 840`; a stored `1400` on a `1000` viewport opens at `600` for a non-editor panel.
  - Panel: renders nothing when `open` is false; when open, has `role="dialog"` named by `title`; Escape calls `onclose` once; clicking the scrim calls `onclose`; ArrowLeft on the separator widens by 16 and writes `frame:panel-width:<id>`; a throwing storage still opens at the default width (`460`, or `640` for `"editor"`).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(frame): resizable pop-up panel`

### Task 9: Settings page — Appearance and About

**Files:**
- Create: `src/components/atoms/Segmented.svelte`, `src/components/organisms/SettingsApp.svelte`.
- Modify: `src/pages/settings/index.astro` → `<AppLayout title="Settings" current="settings"><SettingsApp client:only="svelte" /></AppLayout>`.
- Test: `tests/components/atoms/Segmented.test.ts`, `tests/components/organisms/SettingsApp.test.ts`.

**Interfaces:**
- `Segmented.svelte` props: `{ label: string; options: { value: string; label: string }[]; value: string; onchange: (value: string) => void }`; buttons with `aria-pressed`.
- `SettingsApp.svelte` props: `{ env?: BuildEnv }` (defaults to the real build values). Sections: **Appearance** with Theme (System / Dark / Light) applied immediately through `writeTheme` + `applyTheme`; **About** as one row showing the environment word (plus the short commit where there is one) that opens `Panel` `id="about"` listing `aboutRows(readBuildInfo(env))`. The `built` row is shown with `toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })`. Links open in a new tab with `rel="noopener"`. The "Combi codes data" and "Language" rows are not part of this task (pieces 2 and 5).

- [ ] **Step 1: Failing tests**
  - Segmented: clicking an option calls `onchange` with its value; exactly one button has `aria-pressed="true"`.
  - SettingsApp: choosing Light sets `document.documentElement.dataset.theme === "light"` and storage `theme = "light"`; choosing System removes both; the About row for a production `env` shows `Production · <short>` and its panel lists Environment, Built, Source, Commit, Changelog in that order; for `{ dev: true }` the panel lists only Environment and Source.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(settings): appearance and about`

### Task 10: Home page

**Files:** Create `src/components/molecules/ToolCard.astro`; modify `src/pages/index.astro`; test `tests/components/molecules/ToolCard.test.ts`, `tests/pages/home.test.ts`.

**Interfaces:** `ToolCard` props `{ slug: ToolSlug; name: string; tagline: string }`, linking `/${slug}/`.

- [ ] **Step 1: Failing tests** — ToolCard renders a link to `/combi-name/` with the tool name; the built `dist/index.html` contains the heading "Cookie Run tools" and one ToolCard per `TOOLS` entry. (The saved-codes section arrives with piece 3.)
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** with `AppLayout title="Cookie Run tools" current="home"`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(home): title and tool cards`

Then: full check list, push, PR into `redesign` with the preview checks from Review Focus unticked, wait for `deploy`, report the preview URL, stop for approval.
