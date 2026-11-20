# Redesign piece 2: Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every interface string in Thai and English, Thai by default, chosen in Settings and remembered per browser, from one typed catalogue per language.

**Architecture:** `src/lib/i18n/en.ts` is the source catalogue and defines the `Messages` type; `th.ts` must satisfy it, so a missing key fails `astro check`, and a test compares the two key sets. Static `.astro` text renders both languages side by side in `data-lang` spans, and CSS hides the one `<html lang>` does not name. A pre-paint boot script sets `lang` from storage, so neither language flashes. Svelte islands read `messagesFor(lang)` and follow a `langchange` event. Attributes such as `aria-label` and `title` swap through `data-<attr>-<lang>` pairs.

**Tech Stack:** Astro 7 (static), Svelte 5 runes, Vitest (happy-dom and node projects), @testing-library/svelte, Astro Container API, Biome, `astro check`. Commands run as `mise exec -- pnpm …`.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md`, sections Language, Settings, Non-goals and Order of work (piece 2).

## Global Constraints

- "Thai and English for every interface string, Thai by default, chosen in Settings and remembered per browser."
- "Strings live in one typed catalogue per language, and a test fails when a key is missing from either."
- "The `lang` attribute on `<html>` follows the choice."
- "Item names stay English" in both languages: cookies, pets, treasures, boosts, random boosts, cookie powers and episodes (`BOOST_LABELS`, `RANDOM_BOOST_LABELS`, `COOKIE_POWER_LABELS`, `EPISODE_LABELS`, the catalog's names) stay in `src/lib/combi/labels.ts` and `catalog.ts`, untranslated.
- "A saved note is never translated."
- "Today's labels in `labels.ts`, `describe.ts` and `hints.ts` move into the catalogue where they are interface text."
- Settings → Appearance: "Language (ไทย, English) and Theme (System, Dark, Light), switched in place."
- About: "Built" follows the current language's date format.
- Labels are sentence case, no letter spacing (`tests/styles/look.test.ts` already enforces it).
- The combi wire format does not change: `codec.ts`, `catalog.ts`, `loadout.ts`, `full-code.ts` keep their tables and order.
- Storage key for the language: `lang`, values `th` or `en`. Anything else, or storage that throws, reads as `th`.
- Never name an element, class or id "cookie", "consent" or "gdpr" (an ad blocker hides them).
- Atomic tiers (`tests/components/atomic.test.ts`): an atom imports no component; `src/lib/` imports from no component, layout or page.
- Imports: `#lib/*` without extension; `.astro` and `.svelte` imports with theirs.

## Review Focus

1. **A stored `lang` of `"TH"`, `"fr"` or `""`, or storage that throws** should read as Thai and still switch for the visit. Pinned in Task 1.
2. **An English visitor's first paint** should show English text, never Thai first. The boot script must sit in `<head>` before `<body>` and set `lang` before any text paints. Pinned in Task 2 (the order test).
3. **Screen readers and copy-paste** should get only the shown language. The hidden span must be `display: none`, not just visually hidden, so it drops out of the accessibility tree and out of a text selection. Pinned in Task 2 (the CSS rule test).
4. **Switching language with the About panel open** should re-render the panel, the page title (`document.title`) and the ☰ button's name at once, without a reload. Pinned in Task 3.
5. **Thai text at 390px** should fit or wrap in the top-bar title, the Settings rows and the segmented buttons, with no sideways scroll. This is layout no test computes, so it goes on the PR's preview checklist.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/lang.ts` (create) | `Lang`, the storage key, read/write, `applyLang` on the DOM, the change event, locales |
| `src/lib/i18n/en.ts` (create) | The English catalogue; its type is `Messages` |
| `src/lib/i18n/th.ts` (create) | The Thai catalogue, typed `Messages` |
| `src/lib/i18n/messages.ts` (create) | `Messages`, `Pick`, `messagesFor`, `both`, `l10nAttr` |
| `src/styles/lang.css` (create) | Hides the language `<html lang>` does not name |
| `src/components/atoms/Text.astro` (create) | One string in both languages |
| `src/layouts/BaseLayout.astro`, `AppLayout.astro` | `lang="th"`, boot script, bilingual title, attribute pass |
| `src/components/atoms/NavItem.astro`, `molecules/ToolCard.astro`, `organisms/TopBar.astro`, `organisms/Sidebar.astro` | Bilingual text and attributes |
| `src/pages/*.astro` | Titles and copy from the catalogue |
| `src/lib/tools.ts` | Drops `name` and `tagline` (they move to `tools.<slug>` in the catalogue) |
| `src/components/organisms/SettingsApp.svelte` | Language row; every string from the catalogue; follows changes |
| `src/lib/build-info.ts` | Environment labels and "Unknown" leave for the catalogue; `formatBuilt` takes a locale |
| `src/lib/combi/labels.ts`, `describe.ts`, `hints.ts` | Goal, mode and action labels and all describe/hint wording move to `combi.*`; the functions take `Messages` |

---

### Task 1: Language core and the frame catalogue

**Files:**
- Create: `src/lib/lang.ts`, `src/lib/i18n/en.ts`, `src/lib/i18n/th.ts`, `src/lib/i18n/messages.ts`
- Modify: `AGENTS.md` (layout table: `src/lib/` gains `lang.ts` and `i18n/`; one line under "What this project is" that Thai is the default language)
- Test: `tests/lib/lang.test.ts`, `tests/lib/i18n/messages.test.ts`

**Interfaces:**
- Produces, in `#lib/lang`:
  - `type Lang = "th" | "en"`
  - `LANGS: readonly Lang[] = ["th", "en"]`
  - `DEFAULT_LANG: Lang = "th"`
  - `LANG_KEY = "lang"`
  - `LANG_NAMES: Record<Lang, string> = { th: "ไทย", en: "English" }`
  - `LOCALES: Record<Lang, string> = { th: "th-TH", en: "en-US" }`
  - `isLang(value: unknown): value is Lang`
  - `readLang(store?: Storage | null): Lang`
  - `writeLang(lang: Lang, store?: Storage | null): void`. This writes `th` too: unlike theme, the default is not "absent", so a later default change cannot flip a visitor who chose Thai.
  - `currentLang(doc: Document): Lang`, read from `doc.documentElement.lang`.
  - `applyLang(lang: Lang, doc: Document): void`. It sets `<html lang>`, sets `document.title` from `<html data-title-<lang>>` when present, runs `localizeAttrs`, and dispatches `new CustomEvent("langchange", { detail: lang })` on `doc`.
  - `localizeAttrs(doc: Document, lang: Lang): void`. For each `[data-l10n]` element, it copies every `data-<name>-<lang>` attribute to `<name>`.
  - `onLangChange(doc: Document, listener: (lang: Lang) => void): () => void`, which returns the unsubscribe.
  - `store` defaults use `localStore()` from `#lib/storage`, as in `#lib/theme`.
- Produces, in `#lib/i18n/messages`:
  - `type Messages = typeof en`
  - `type Pick = (m: Messages) => string`
  - `messagesFor(lang: Lang): Messages`
  - `both(pick: Pick): Record<Lang, string>`
  - `l10nAttr(name: string, pick: Pick): Record<string, string>`, which returns `{ [name]: pick(th), [`data-${name}-th`]: pick(th), [`data-${name}-en`]: pick(en), "data-l10n": "" }`. Thai is the attribute's own value, matching the HTML's default language.
- Produces, in `#lib/i18n/en`: `export const en = { … }`. Write it without `as const`, so strings widen to `string` and Thai can differ. Functions are allowed for interpolated text. Task 1's keys:

```ts
site: { name: "Cookie Run tools", intro: "Small tools for what the game doesn't write down. Everything stays in your browser." },
frame: { menu: "Menu", nav: "Site", home: "Home", settings: "Settings", close: "Close", resize: "Resize panel" },
tools: { "combi-name": { name: "Combi name codes", title: "Cookie Run combi codes", tagline: "<today's TOOLS tagline, verbatim>" } },
settings: {
  title: "Settings", appearance: "Appearance", language: "Language",
  theme: "Theme", themes: { system: "System", dark: "Dark", light: "Light" },
  about: "About",
  rows: { environment: "Environment", built: "Built", source: "Source", commit: "Commit", changelog: "Changelog" },
  environments: { development: "Development", local: "Local", preview: "Preview", production: "Production" },
  unknown: "Unknown",
},
```

  `tools` is typed `Record<ToolSlug, { name: string; title: string; tagline: string }>` (a type-only import from `#lib/tools`), so a new tool fails `astro check` until both catalogues name it.
- Thai for these keys:

```ts
site: { name: "เครื่องมือ Cookie Run", intro: "เครื่องมือเล็ก ๆ สำหรับสิ่งที่เกมไม่ได้จดไว้ให้ ทุกอย่างเก็บอยู่ในเบราว์เซอร์ของคุณ" },
frame: { menu: "เมนู", nav: "เมนูหลัก", home: "หน้าแรก", settings: "ตั้งค่า", close: "ปิด", resize: "ปรับขนาดแผง" },
tools: { "combi-name": { name: "โค้ดชื่อคอมโบ", title: "โค้ดคอมโบ Cookie Run", tagline: "เก็บการตั้งค่าการวิ่ง ทั้งโหมด ตอน บูสต์ บูสต์สุ่ม พลังคุกกี้+ และแอ็กชันเริ่มต้น ไว้ในชื่อคอมโบ 10 ตัวอักษร" } },
settings: {
  title: "ตั้งค่า", appearance: "การแสดงผล", language: "ภาษา",
  theme: "ธีม", themes: { system: "ตามระบบ", dark: "มืด", light: "สว่าง" },
  about: "เกี่ยวกับ",
  rows: { environment: "สภาพแวดล้อม", built: "สร้างเมื่อ", source: "ซอร์สโค้ด", commit: "คอมมิต", changelog: "บันทึกการเปลี่ยนแปลง" },
  environments: { development: "ระหว่างพัฒนา", local: "บิลด์ในเครื่อง", preview: "พรีวิว", production: "ใช้งานจริง" },
  unknown: "ไม่ทราบ",
},
```

- [ ] **Step 1: Write the failing tests**

`tests/lib/i18n/messages.test.ts`:
- `"Thai and English name the same keys"`: walk both objects recursively. Collect leaf paths (string or function), and assert the sorted path lists are equal. For a function leaf, also assert `th` and `en` have the same `.length`. Run the walk itself on a fixture `{ a: { b: "x", c: () => "y" } }` and assert `["a.b", "a.c"]`, so a walk that returns nothing cannot pass.
- `"no string is empty in either language"`: every string leaf has `.trim().length > 0`.
- `"messagesFor picks the catalogue"`: `messagesFor("th").frame.home === "หน้าแรก"`, `messagesFor("en").frame.home === "Home"`.
- `"both gives each language's text"`: `both((m) => m.frame.menu)` equals `{ th: "เมนู", en: "Menu" }`.
- `"l10nAttr defaults to Thai and carries both"`: `l10nAttr("aria-label", (m) => m.frame.menu)` equals `{ "aria-label": "เมนู", "data-aria-label-th": "เมนู", "data-aria-label-en": "Menu", "data-l10n": "" }`.

`tests/lib/lang.test.ts` (happy-dom; build a fresh `Window` per test, as `tests/lib/frame.test.ts` does):
- `"reads Thai when nothing is stored"`.
- `"reads a stored choice"`: `en` reads `en`; `th` reads `th`.
- `"anything else reads as Thai"`: test each of `"TH"`, `"fr"`, `""` and `"en "`.
- `"storage that throws reads Thai and writes nothing"`: use the throwing store from `tests/lib/frame.test.ts`. `readLang` returns `th`, and `writeLang` does not throw.
- `"writeLang stores Thai too"`: `writeLang("th", store)` leaves `store.getItem("lang") === "th"`.
- `"applyLang sets lang, the title and every localized attribute, then tells listeners"`:
  - Setup: `<html data-title-th="ตั้งค่า" data-title-en="Settings">` and a `<button data-l10n aria-label="เมนู" data-aria-label-th="เมนู" data-aria-label-en="Menu">`.
  - Subscribe with `onLangChange`.
  - Then `applyLang("en", doc)`. Assert: `documentElement.lang === "en"`; `doc.title === "Settings"`; the button's `aria-label === "Menu"`; the listener was called once with `"en"`.
  - Unsubscribe, then `applyLang("th", doc)`. The listener is not called again, and `aria-label` is back to `"เมนู"`.
- `"currentLang reads <html lang>, and anything else as Thai"`: `"en"` reads `en`; `""` and `"de"` read `th`.

- [ ] **Step 2: Run them, and watch them fail for the missing modules**

Run: `mise exec -- pnpm run test tests/lib/lang.test.ts tests/lib/i18n/messages.test.ts`
Expected: FAIL, because `#lib/lang` and `#lib/i18n/messages` cannot be resolved.

- [ ] **Step 3: Implement `#lib/lang`, `#lib/i18n/en`, `#lib/i18n/th` and `#lib/i18n/messages` per the Interfaces block**

- [ ] **Step 4: Run them, and see them pass; then `mise exec -- pnpm run check`**

Expected: PASS, and 0 errors. Delete one key from `th.ts` and confirm both `check` and the parity test fail, then restore it.

- [ ] **Step 5: Update `AGENTS.md`, format, commit**

`git commit -m "feat(lang): thai and english catalogues, thai by default"`

---

### Task 2: The frame and static pages in both languages

**Files:**
- Create: `src/styles/lang.css`, `src/components/atoms/Text.astro`
- Modify:
  - `src/styles/global.css`: import `./lang.css`.
  - `src/layouts/BaseLayout.astro`, `src/layouts/AppLayout.astro`.
  - `src/components/atoms/NavItem.astro`, `src/components/molecules/ToolCard.astro`, `src/components/organisms/TopBar.astro`, `src/components/organisms/Sidebar.astro`.
  - `src/pages/index.astro`, `src/pages/settings/index.astro`, `src/pages/combi-name/index.astro`.
  - `src/lib/tools.ts`: drop `name` and `tagline` from `Tool` and `TOOLS`.
  - `.claude/skills/project-components/SKILL.md`, `project-layouts/SKILL.md`, `project-pages/SKILL.md`: a "Text in two languages" section on `Text`, `both`, `l10nAttr` and `Pick` titles. There are no hard-coded strings in components, layouts or pages.
- Test:
  - `tests/components/atoms/Text.test.ts`, `tests/components/atoms/NavItem.test.ts` (create if absent).
  - `tests/components/organisms/TopBar.test.ts`, `tests/components/organisms/Sidebar.test.ts`, `tests/components/molecules/ToolCard.test.ts`.
  - `tests/layouts/BaseLayout.test.ts`, `tests/layouts/AppLayout.test.ts`.
  - `tests/build/output.test.ts`, `tests/lib/tools.test.ts`, `tests/styles/lang.test.ts`.

**Interfaces:**
- Consumes: Task 1's `Pick`, `both`, `l10nAttr`, `LANG_KEY`, `DEFAULT_LANG`, `localizeAttrs`, `currentLang`.
- Produces:
  - `Text.astro` (atom), props `{ pick: Pick }`. It renders `<span data-lang="th">{pick(th)}</span><span data-lang="en">{pick(en)}</span>`, with no wrapper element.
  - `NavItem.astro` (atom) props become `{ href, icon, label: Record<Lang, string>, current? }`. It renders both label spans itself, since an atom imports no component. `title` comes through `l10nAttr`-style attributes built from `label`.
  - `BaseLayout` and `AppLayout` prop `title: Pick`, replacing `title: string`.
  - `TopBar` prop `title: Pick`.
  - `ToolCard` props become `{ slug, icon }`. It reads `tools[slug]` through `Text`.
- `lang.css`: `:root:not([lang="en"]) [data-lang="en"], :root[lang="en"] [data-lang="th"] { display: none !important; }`. It carries no other rule.
- `BaseLayout`:
  - `<html lang="th" data-title-th={title(th)} data-title-en={title(en)} …>` and `<title>{title(th)}</title>`.
  - An inline boot script in `<head>`, placed before GTM and after the theme boot. It passes `LANG_KEY` through `define:vars` and does this:

    ```js
    try { if (localStorage.getItem(LANG_KEY) === "en") { const r = document.documentElement; r.lang = "en"; document.title = r.dataset.titleEn } } catch {}
    ```

    Only `en` needs action, because the HTML is already Thai.
- `AppLayout`'s module script calls `localizeAttrs(document, currentLang(document))` before `initFrame`.
- The ☰ button's name is `l10nAttr("aria-label", (m) => m.frame.menu)`. The sidebar `<nav>` is `l10nAttr("aria-label", (m) => m.frame.nav)`.
- The Home page's h1 is `site.name` and its intro is `site.intro`. Settings' title is `settings.title`. The combi page's title and h1 are `tools["combi-name"].title`.

- [ ] **Step 1: Write the failing tests**

All the Container tests below are `// @vitest-environment node`, parsing with happy-dom's `Window` as the existing ones do.
- `Text.test.ts` `"renders both languages, each marked"`: render with `pick={(m) => m.frame.home}`. There are exactly two spans: `[data-lang="th"]` with text `หน้าแรก` and `[data-lang="en"]` with text `Home`.
- `NavItem.test.ts` `"label and tooltip in both languages"`: given `label={ th: "หน้าแรก", en: "Home" }`, both spans are present. `title === "หน้าแรก"`, `data-title-en === "Home"`, and `data-l10n` is present.
- `TopBar.test.ts` `"the menu button is named in both languages"`: the button has `aria-label="เมนู"` and `data-aria-label-en="Menu"`. The title renders both spans.
- `BaseLayout.test.ts`:
  - `"html starts Thai, carrying both titles"`: `lang="th"`, `data-title-th`, `data-title-en`, and `<title>` is the Thai title.
  - `"the language boot runs in head, before body"`: an inline script in `<head>` contains `"lang"` (the key) and `"en"`, and appears before `<body>` in the raw HTML string.
- `tests/styles/lang.test.ts` `"the language not chosen is display none"`: read `src/styles/lang.css` and match both selectors and `display:\s*none`. Also check that `global.css` imports `./lang.css`.
- `output.test.ts`: the built `dist/index.html` contains `<html lang="th"`, `เครื่องมือ Cookie Run` and `Cookie Run tools`.
- `tools.test.ts`: TOOLS entries have only `slug` and `icon`, and both catalogues have `tools[slug]` for every slug.
- Update every existing test that passed `title="…"` strings to pass a `Pick`.

- [ ] **Step 2: Run them, and see them fail for the right reason**

Run: `mise exec -- pnpm run test tests/components tests/layouts tests/styles tests/lib/tools.test.ts`
Expected: the new tests FAIL. `Text.astro` is missing, the attributes are absent, and `lang="en"` is still hard-coded.

- [ ] **Step 3: Implement per the Interfaces block**

- [ ] **Step 4: Run the whole suite, then build and run the output test**

Run: `mise exec -- pnpm run test && mise exec -- pnpm run build && mise exec -- pnpm run test tests/build`
Expected: PASS.

- [ ] **Step 5: Format, check, and commit**

`git commit -m "feat(frame): pages and frame in thai and english"`

---

### Task 3: Settings in both languages, with the language switch

**Files:**
- Modify: `src/components/organisms/SettingsApp.svelte`, `src/lib/build-info.ts`
- Test: `tests/components/organisms/SettingsApp.test.ts`, `tests/lib/build-info.test.ts`

**Interfaces:**
- Consumes:
  - From Task 1: `messagesFor`, `currentLang`, `applyLang`, `writeLang`, `onLangChange`, `LANGS`, `LANG_NAMES`, `LOCALES`.
  - From piece 1: `Segmented` (`{ label, options, value, onchange }`) and `Panel` (`closeLabel`, `resizeLabel`).
- Produces, in `#lib/build-info`:
  - `AboutRow.text` holds data only: the branch and `#n`, the short commit, the ISO instant, or `kamontat/cr-tools`. For `environment` it holds the `Environment` id; for `built` with no time, it is `""`.
  - Delete `LABELS`. SettingsApp turns ids into words with `m.settings.environments[id]` and `m.settings.unknown`.
  - `formatBuilt(at: Date, locale?: string, timeZone?: string)` is unchanged. SettingsApp passes `LOCALES[lang]`.
- SettingsApp:
  - `let lang = $state(currentLang(document))` and `const m = $derived(messagesFor(lang))`.
  - An `$effect` subscribes with `onLangChange` and returns its unsubscribe.
  - Appearance shows Language first, then Theme. Language uses `Segmented` with options `LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }))`.
  - Choosing a language calls `writeLang(l)` and then `applyLang(l, document)`. The event updates `lang`.
  - The About summary is `[m.settings.environments[info.environment], shortCommit]` joined by `" · "`, as now.
  - Panel gets `closeLabel={m.frame.close}` and `resizeLabel={m.frame.resize}`.

- [ ] **Step 1: Write the failing tests**

`SettingsApp.test.ts`:
- `"starts in Thai"`: with `<html lang="th">`, the heading `ตั้งค่า`, the buttons `ไทย` and `English` with `ไทย` pressed, and the theme button `ตามระบบ` are present.
- `"choosing English switches the page in place and remembers it"`:
  - Click `English`. Then `document.documentElement.lang === "en"`, `localStorage.getItem("lang") === "en"`, the heading reads `Settings`, and the theme button reads `System`.
- `"with About open, switching language re-renders it"`:
  - Open About, then call `applyLang("en", document)` from outside the component.
  - The dialog's rows read `Environment` and `Built`, and the close button's name is `Close`.
- `"Built follows the language's date format"`:
  - Use `builtAt` `2026-11-19T10:00:00Z`, and pin `timeZone` by mocking `formatBuilt`'s caller. Simpler: pin `Intl.DateTimeFormat`'s default time zone, with `process.env.TZ = "Asia/Bangkok"` set in the test file header.
  - In Thai the Built row contains `พ.ย.` and `2569`. In English it contains `Nov` and `2026`.

`build-info.test.ts`: the environment row's `text` is `"preview"` / `"production"` (ids), and an unknown built time gives `text === ""`.

- [ ] **Step 2: Run them, and see them fail**

Run: `mise exec -- pnpm run test tests/components/organisms/SettingsApp.test.ts tests/lib/build-info.test.ts`

- [ ] **Step 3: Implement per the Interfaces block**

- [ ] **Step 4: Run them, and see them pass; then run the full list**

Run the full list: `format`, `check`, `test`, `build`.

- [ ] **Step 5: Commit**

`git commit -m "feat(settings): language switch, and settings in thai and english"`

---

### Task 4: Combi interface text into the catalogue

**Files:**
- Modify:
  - `src/lib/combi/labels.ts`: remove `GOAL_LABELS`, `MODE_LABELS` and `ACTION_LABELS`.
  - `src/lib/combi/describe.ts`, `src/lib/combi/hints.ts`.
  - `src/lib/i18n/en.ts`, `src/lib/i18n/th.ts`.
- Test: `tests/lib/combi/labels.test.ts`, `describe.test.ts`, `hints.test.ts`, and `tests/lib/i18n/messages.test.ts`
- Read first: the `project-combi-codec` skill.

**Interfaces:**
- Produces, under `combi` in both catalogues:
  - `goals: Record<Goal, string>`, `modes: Record<Mode, string>` and `actions: Record<Action, string>`. The English values are today's `GOAL_LABELS`, `MODE_LABELS` and `ACTION_LABELS`, verbatim.
  - `describe`: every interface string in `describe.ts`, as keys:
    - `none`, `anyGoal`, `goalsJoin`, `anyEpisode` and `anyFloor`.
    - `floor: (n: number) => string` and `notUsed`.
    - `relayCookie`, `retired: (name: string) => string` and `orTreasure`, the `" or "` join.
    - `fields: { goal, mode, episode, floor, boosts, randomBoost, cookiePower, action, cookie, relay, pet, treasures, treasuresOrdered }`.
  - `hints`: every interface string in `hints.ts`:
    - The slot names `slot1Mode`, `slots23Goal`, `slot4Episode`, `slots57Floor`, `slots810Reserved`, `slots510Boosts`, `slot5Boosts`, `slots67RandomBoost` and `slots810CookiePower`.
    - `formatVersion`, `treasureOrder`, `treasureSlot: (n: number) => string` and `separator`.
- Produces in code:
  - `describeCombi(combi, m: Messages)`, `describeLoadout(loadout, m)`, `describeBuild(full, m)` and `describeRun(full, m)`.
  - `goalsText(goals, m)` and `floorText(floor, m)`.
  - `hintsFor(code, m)`.
  - `GOALS_JOIN` and `NOT_USED` stop being exports. Read them from `m.combi.describe`.
  - `shortEpisode` stays English: episodes are item names.
  - `src/lib/combi/saved.ts` filters on the worded run chips (`runFacets`, `facetParts`). It passes `en` to `describeRun` and splits on `en.combi.describe.goalsJoin`, so its behaviour and its tests stay as they are.
    - Ruling: piece 3 replaces these worded facets with goal, mode and episode ids, so nothing here translates them.
    - If that ruling is wrong, the cost is a facet filter that keeps English wording until piece 3.
- The `cookie` key and the field names "Cookie", "Relay" and "Pet" are interface words. The names of the cookie, relay and pet themselves stay English.

- [ ] **Step 1: Change the tests first**
  - Every existing `describe*`/`hintsFor`/`goalsText`/`floorText` call passes `en` (`import { en } from "#lib/i18n/en"`). The expected strings stay exactly as they are; this is the regression check that English did not change.
  - `labels.test.ts` replaces the goal, mode and action rows with `en.combi.goals` / `modes` / `actions` and `th.combi.*`, against `ALL_GOALS`, `ALL_MODES` and `ALL_ACTIONS`.
  - New: `"describes in Thai, keeping item names English"`. Take a combi with `mode: "auto"`, `goals: ["money"]`, `episode: "episode3"` and `boosts: ["fastStart"]`. The `th` rows use `th.combi.describe.fields.*` for the fields and `th.combi.modes.auto` / `th.combi.goals.money`. The values still say `Episode 3` and `Fast Start`.
  - New: `"hints read in Thai"`. `hintsFor("<a valid 10-char code from hints.test.ts>", th)[0].name === th.combi.hints.slot1Mode`.
- [ ] **Step 2: Run them, and see them fail.** The functions do not take `m` yet, so `check` fails, and the Thai tests fail at runtime.
- [ ] **Step 3: Implement.** Move the strings, thread `m` through, and write the Thai.
  - Thai wording: natural Thai as Thai Cookie Run players say it. Keep game terms players use in English untranslated where Thai players do (`Exp`, `Boost` may stay as บูสต์).
  - Slot numbers stay digits.
- [ ] **Step 4: Run the full list.** That includes the exhaustive combi test, which must still pass unchanged.
- [ ] **Step 5: Commit** `refactor(combi): interface text from the catalogue`

---

### Task 5: The combi page's strings, ready for piece 3

**Files:**
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/th.ts`
- Test: `tests/lib/i18n/combi-page.test.ts`

**Interfaces:**
- Produces, under `combi`. The keys come from the spec's Combi page section; English wording is the builder's within the spec's words:
  - `list`:
    - `newCode`, `search`, and `allGoals`.
    - `sort: { newest, oldest, money, code }`, which reads "Newest", "Oldest", "Highest average money" and "Code A–Z".
    - `copy` and `share`.
    - `copied`, the feedback after a copy.
    - `empty`, shown when no code is saved.
    - `noMatch`, shown when search or filter hides everything.
    - `rounds: (n: number) => string` and `average`.
    - `columns: { code, loadout, note, goal, money, rounds, saved }`.
  - `editor`:
    - `newTitle` ("New code") and `editTitle` ("Edit code").
    - `tabs: { main, cookies, treasures, boosts, runLog }`.
    - `save`, `update`, `more`, `typeCode`, `reset` and `help`, the `?` button's name.
    - `note`.
  - `share`: `title`, `link`, `fullCode`, `shareToApp` and `copy`.
  - `help`: one short explanation per field, keyed `mode`, `goal`, `episode`, `floor`, `action`, `cookie`, `relay`, `pet`, `treasures`, `boosts`, `randomBoost`, `cookiePower` and `rounds`.
    - Write them from the old help drawer: `git show origin/main:src/routes/combi-name/index.html`, the `#help-drawer` section.
    - Each says what the field does in one or two sentences, and names its slot numbers where it has them.
    - Leave out the character tables: the controls show the values.

- [ ] **Step 1: Write the failing test** `tests/lib/i18n/combi-page.test.ts`:
  - `"every field has help in both languages"`: each of the 13 help keys is a non-empty string in `en` and `th`.
  - `"help names its slots"`: in both languages, `help.mode` contains `1`, `help.goal` contains `2-3`, `help.episode` contains `4`, `help.boosts` contains `5`, `help.randomBoost` contains `6-7`, `help.cookiePower` contains `8-10`, and `help.floor` contains `5-7`.
  - `"counts read naturally"`: `en.combi.list.rounds(1) === "1 round"`, `en.combi.list.rounds(3) === "3 rounds"` and `th.combi.list.rounds(3) === "3 รอบ"`.
- [ ] **Step 2: Run it, and see it fail.** The keys are missing.
- [ ] **Step 3: Add the keys to both catalogues.**
- [ ] **Step 4: Run it, and see it pass; then run the full list.**
- [ ] **Step 5: Commit** `feat(lang): combi page strings in thai and english`

---

## Then

Push, then open the PR into `redesign` with the preview checks from Review Focus unticked:
- The Thai first paint.
- English after a reload, with no Thai flash.
- Switching with About open.
- 390px Thai layout.
- Screen reader names.

Wait for `deploy`, report the preview URL, and stop for approval.
