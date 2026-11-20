# Redesign piece 3: Combi page and Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The combi page becomes the saved list, with New code, search, a goal filter and a sort. Building or editing a code happens in an editor pop-up with tabs, field help and a fixed footer, docked beside the list on wide screens. A Share pop-up hands a code on. Home shows the latest three saved codes.

**Architecture:**
- **Logic.** Every rule a page needs lives framework-free in `src/lib/combi/`, tested without a DOM:
  - list search, filter and sort, and the loadout icons (`list.ts`);
  - the editor's draft model (`draft.ts`);
  - codec warnings and errors as ids with values (`issues.ts`).
- **Svelte.** Components, in atomic tiers, only render and dispatch. One organism, `CombiApp`, owns the page's state: the list, the open editor, Share, the address bar, paste and notices.
- **Panel.** It grows a portal, a scroll lock and a docked mode.

**Tech Stack:** Astro 7 (static), Svelte 5 runes (`client:only="svelte"`), Vitest (happy-dom and node), @testing-library/svelte, Biome, `astro check`. Commands run as `mise exec -- pnpm …`.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md`, sections Combi page, Home, Pop-ups, Look, Language, Rounds (for what piece 4 changes), Order of work (piece 3).

**Look reference:** the approved prototype `/Users/kamontat/Personal/cr-tools/.superpowers/brainstorm/14057-1795099736/content/prototype-v14.html`. Read its CSS and markup for the list rows, table, editor, tabs, chips and sheet. It is the look to match, not code to copy.

## Global Constraints

- The combi wire format does not change: the codec tables, their order, the loadout grammar and the full-code form stay as they are. `tests/lib/combi/exhaustive.test.ts` must keep passing. Read the `project-combi-codec` skill before touching `src/lib/combi/`.
- "Copy always copies the 10 characters, the part typed into the game." That is `combiSectionOf(code)`.
- Old links keep opening: `/combi-name/#CODE?note=…&money=12000-15000` must open that code with its note and stats.
- Saved codes in a visitor's browser are never lost or silently changed. Piece 3 keeps reading and writing `combi-name:saved` through `src/lib/combi/saved.ts`. Piece 4 adds rounds and the v2 key.
- Thai and English for every interface string, Thai by default. Every string goes through `src/lib/i18n/en.ts` and `th.ts`; a missing key fails `astro check`.
  - Write the Thai best-effort: natural, and consistent with the catalogue (การวิ่ง, เหรียญ, กล่อง, การจัดทีม, ตอน). The owner improves wording later.
  - Item names stay English: cookies, pets, treasures, boosts, random boosts, cookie powers, episodes.
  - A saved note is never translated.
- Svelte islands follow `SettingsApp`'s pattern: `let lang = $state(currentLang(document))`, `$effect(() => onLangChange(document, (l) => (lang = l)))`, `const m = $derived(messagesFor(lang))`.
- Icons are static files at `/assets/<image>` from `catalog.ts`'s `imageFor` and from `art.ts` with base `"/assets/"`. They are never inlined, and `#assets/index.json` is not imported outside `catalog.ts`. Read `project-assets`.
- Atomic tiers (`tests/components/atomic.test.ts`): an atom imports no component, a molecule only atoms, an organism atoms, molecules and organisms. `src/lib/` imports no component, layout or page.
- Breakpoints: phone under 700px (`RAIL_MIN_WIDTH`), docked editor at 1400px and up (new `DOCK_MIN_WIDTH = 1400` in `#lib/frame`). The site works at 390px with nothing clipped and no sideways scroll.
- Look: 1px borders, 8–10px radius, no block shadows, one pink accent, monospace only for codes (yellow code colour), sentence case. `letter-spacing` and uppercase are banned by `tests/styles/look.test.ts`, except `letter-spacing` on monospace codes, which this piece allows (see Task 4).
- Never name an element, class or id "cookie", "consent" or "gdpr". Use "entry", "build", "loadout" and so on.
- Storage keys: `combi-name:saved` (unchanged), `combi-name:tab` (now also `runLog`), and a new `combi-name:list-sort`. The old `combi-name:code`, `combi-name:full-code` and `combi-name:saved-sort` are no longer read.
- Panel widths: the editor 360px to 70% of the page, other panels up to 60% (already in `#lib/panel-width`).

## Review Focus

1. **A saved code that no longer reads** (a retired treasure, a malformed entry) should still list. It shows its code and note, has no broken icon, and opening it says why it cannot be edited instead of crashing the page. Pinned in Tasks 1 and 9.
2. **An old share link with a note and a money range** opens the editor on that code, fills the note and stats, and says that Save keeps them. Opening it twice does not duplicate the saved entry. Pinned in Task 9.
3. **The clipboard is refused** (the permission is denied, or `navigator.clipboard` is missing). Copy says so and shows the text to copy by hand, with no unhandled rejection. Pinned in Tasks 8 and 9.
4. **Two saved entries with the same 10 characters and different loadouts** (the recovered pair, Episode 253 and 2608) must look different in the list, because the icons differ. Both open their own loadout. Pinned in Tasks 1 and 8.
5. **A phone at 390px:** New code and search span the width, filter and sort share a row, rows wrap, the editor is a bottom sheet, and the footer stays visible. This is layout, so it goes on the PR's preview checklist.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/combi/issues.ts` (create) | `Issue` ids and values for every codec, full-code, loadout and stats warning or error; `CodeError`; `issueText(issue, m)` |
| `src/lib/combi/list.ts` (create) | Search, goal filter, list sorts, the average money, row loadout icons, the list-sort key |
| `src/lib/combi/draft.ts` (create) | The editor's pure draft model: fields to full code, limits, verdict, tab badges, field setters |
| `src/lib/combi/state.ts` | `TabName` gains `runLog`; drops `combi-name:code` and `full-code` use |
| `src/lib/frame.ts` | `DOCK_MIN_WIDTH = 1400` |
| `src/components/molecules/Panel.svelte` | Portal to `<body>`, scroll lock, `docked` mode, focus fixes |
| `src/lib/modal.ts` | Focus containment skips hidden elements |
| atoms | `Chips.svelte`, `Tabs.svelte`, `HelpToggle.svelte`, `Toast.svelte`, `EntryIcon.svelte` |
| molecules | `Field.svelte`, `EntryPicker.svelte`, `TreasureSlot.svelte`, `LoadoutIcons.svelte`, `CodeDisplay.svelte` |
| organisms | `CombiEditor.svelte`, `CombiList.svelte`, `ShareDialog.svelte`, `CombiApp.svelte`, `HomeSaved.svelte` |
| `src/pages/combi-name/index.astro`, `src/pages/index.astro` | Mount the islands |
| `src/lib/i18n/en.ts`, `th.ts` | `combi.issues`, `combi.notices`, `combi.editor.*` additions, `combi.stats`, `home.saved` |

---

### Task 1: List logic

**Files:**
- Create: `src/lib/combi/list.ts`
- Test: `tests/lib/combi/list.test.ts`

**Interfaces:**
- Consumes:
  - `SavedCode` from `#lib/combi/saved`.
  - `decodeFull` and `combiSectionOf` from `#lib/combi/full-code`.
  - `imageFor`, `labelFor`, `isAnyId` and `nameFor` from `#lib/combi/catalog`.
  - `Goal` from `#lib/combi/codec`.
- Produces:
  - `LIST_SORTS = ["newest", "oldest", "money", "code"] as const` and `type ListSort`.
  - `LIST_SORT_KEY = "combi-name:list-sort"`.
  - `readListSort(store: Storage | null): ListSort`, which reads `newest` for anything else.
  - `writeListSort(sort: ListSort, store: Storage | null): void`.
  - `averageMoney(entry: SavedCode): number | null`, the midpoint of `stats.money`, or `null`. This matches piece 4's conversion of a range into two rounds, min and max.
  - `sortList(entries: readonly SavedCode[], sort: ListSort): SavedCode[]`:
    - `newest` / `oldest` by `savedAt`.
    - `money` by `averageMoney`, highest first, with entries that have none last, in their existing order.
    - `code` by `combiSectionOf(code)`, then by the full code.
  - `type GoalFilter = Goal | "all"`.
  - `filterList(entries, query: string, goal: GoalFilter): SavedCode[]`:
    - Each whitespace-separated word, case-insensitive, must appear in the full code, the cookie name, the pet name or the note. Cookie and pet names come from `nameFor` on the decoded loadout.
    - `goal` keeps entries whose decoded goals include it.
    - An entry that no longer decodes matches only on its code and note, and is dropped by any goal other than `all`.
  - `type RowIcon = { src: string | null; name: string; round?: true; more?: number }`.
  - `type RowLoadout = { cookie: RowIcon | null; pet: RowIcon | null; treasures: RowIcon[] }`.
  - `rowLoadout(code: string): RowLoadout | null`, which is `null` when the code does not decode:
    - `src` is `"/assets/" + image`, or `null` when `imageFor` is null or the id is the Any id.
    - `name` is `labelFor`.
    - The pet has `round: true`.
    - Each treasure slot gives its first pick's icon, with `more = alternatives - 1` when that is above 0.

- [ ] **Step 1: Write the failing tests.** Build entries with real full codes from `tests/lib/combi/full-code.test.ts`.
  - `"sorts by average money, empty last"`: the money ranges `{min:10,max:20}` → 15 and `{min:30,max:30}` → 30, plus one entry with no stats. The order is 30, 15, then none.
  - `"Code A–Z sorts by the 10 characters, then the full code"`: two entries share their 10 characters and differ in loadout, and a third has smaller characters. The order is the third, then the two by full code.
  - `"search matches the cookie name, the note and the code, every word"`: a query with a cookie name from the catalog finds the entry. A query of two words where only one matches finds nothing.
  - `"goal filter keeps runs aiming for it"`: a money+exp run passes for `money` and `exp` and not for `score`. `all` keeps everything.
  - `"an entry that no longer reads still lists"`: `filterList` with `""`/`all` keeps it, and `rowLoadout` returns `null` for it.
  - `"row loadout: icons, round pet, +n for alternatives, no src for Any"`: the src values start `/assets/`, the pet has `round`, a slot with two alternatives has `more: 1`, and the Any cookie has `src: null` with the name `"Any cookie"`.
  - `"same 10 characters, different loadouts, different icons"`: `rowLoadout` of the two differs.
  - `"list sort is remembered; anything else reads newest"`.
- [ ] **Step 2: Run them and see them fail.** `mise exec -- pnpm run test tests/lib/combi/list.test.ts`. They fail because the module is missing.
- [ ] **Step 3: Implement `list.ts`.**
- [ ] **Step 4: Run them and see them pass, then run the full list:** `format`, `check`, `test`, `build`.
- [ ] **Step 5: Commit** `feat(combi): list search, goal filter, sorts and row icons`

---

### Task 2: Codec messages as ids

**Files:**
- Create: `src/lib/combi/issues.ts`
- Modify: `src/lib/combi/codec.ts`, `full-code.ts`, `loadout.ts`, `stats.ts`, `saved.ts` (`parseSaved`'s skipped reasons), `src/lib/i18n/en.ts`, `th.ts`
- Test: `tests/lib/combi/issues.test.ts`, plus the existing codec, full-code, loadout, stats and saved tests
- Read first: `project-combi-codec`

**Interfaces:**
- Produces:
  - `type Issue = { id: IssueId; values?: Record<string, string | number> }`.
  - `IssueId` is a union with one id per distinct sentence listed in the reference below.
  - `class CodeError extends Error { readonly issue: Issue }`. Its `message` is the English text, so logs and old callers still read it.
  - `issueText(issue: Issue, m: Messages): string`.
- `decode`, `decodeFull` and `fitLoadout` return `warnings: Issue[]` instead of `string[]`. Every `throw new Error(…)` that a visitor can meet becomes `throw new CodeError({ id, values })`.
- `parseStat` returns `{ ok: false, issue: Issue }` in place of its `error` string.
- `parseSaved`'s `skipped[].reason` becomes an `Issue`.
- Catalogue `combi.issues.<id>` in both languages. Messages with values are functions, such as `unknownChar: (slot: string, char: string) => string`.
- The English text reproduces today's sentences verbatim, so the existing tests change only from string to id plus `issueText(…, en)`.
- The sentences to cover:
  - codec.ts: 349, 393, 401, 442, 447, 453, 478, 518, 526, 544, 548.
  - full-code.ts: 83, 110, 113, 126.
  - loadout.ts: 135 and its uses, 256, 260, 271, 272, 274.
  - stats.ts: 55–76 and 112.
  - Read each file; the line numbers are approximate.

- [ ] **Step 1: Change the tests first.**
  - Every existing assertion on a warning or error string asserts the `id` instead. It also asserts `issueText(issue, en)` equals the old sentence verbatim, which proves English did not change.
  - New `issues.test.ts`:
    - `"every IssueId has text in both languages"`: walk a list of every id.
    - `"a thrown CodeError keeps the English message"`.
    - `"Thai text differs from English"`, checked on one id.
- [ ] **Step 2: Run them and see them fail.** `check` fails on the types, and the tests fail.
- [ ] **Step 3: Implement.** Thread `Issue` through. Do not change any table or the order of checks, so decoding takes exactly the same branches.
- [ ] **Step 4: Run the full list.** The exhaustive test must pass unchanged.
- [ ] **Step 5: Commit** `refactor(combi): warnings and errors as ids, worded from the catalogue`

---

### Task 3: The editor's draft model

**Files:**
- Create: `src/lib/combi/draft.ts`
- Modify: `src/lib/combi/state.ts` (`TabName` adds `"runLog"`), `src/lib/frame.ts` (`DOCK_MIN_WIDTH = 1400`)
- Test: `tests/lib/combi/draft.test.ts`, `tests/lib/combi/state.test.ts`

**Interfaces:**
- Produces:
  - `type Draft = { full: FullCode; note: string; stats: StatsDraft; from: string | null }`. `from` is the saved code being edited, or `null` for a new one.
  - `newDraft(): Draft`, the default build: today's default form, `[score]`, manual, any episode, empty loadout.
  - `draftFrom(entry: SavedCode): { draft: Draft; warnings: Issue[] }`, which throws `CodeError` when the code no longer reads.
  - `draftFromCode(code: string, note?: string, stats?: RunStats): { draft; warnings }`.
  - `codeOf(draft): string`, which is `encodeFull`.
  - `limitsFor(draft): EpisodeLimits`.
  - `verdictOf(draft): AutoVerdict | null`, which is `describeBuild` minus wording: return `{ semi, reasons: ReasonId[] }`, where `ReasonId = "fastStart" | "randomBoost" | "action" | "relay"`.
  - `tabBadges(draft): Record<TabName, string>`, matching the old page: cookies counts the set roles, treasures is `n/3`, boosts counts every pick, and main and runLog are empty.
  - `tabEnabled(draft, tab): boolean`: boosts off when `!limits.boosts`; treasures off when `!limits.treasures`.
  - Setters, each returning a new normalized `Draft` (`fitLoadout` and `normalize` applied, so an illegal combination cannot be held):
    - `setMode`, `setGoals` (score is exclusive; the goal options follow the mode as `goalOptions(draft)`), `setEpisode`, `setFloor`, `setAction` (ignored unless auto).
    - `setRole(role: "cookie"|"relay"|"pet", id|null)`.
    - `setTreasureSlot(index, picks)`, `setOrdered`.
    - `toggleBoost`, `setRandomBoost`, `toggleCookiePower`.
    - `setNote`, `setStat`.
  - `isDirty(draft, saved: SavedCode | null): boolean`, true when the code, note or stats differ from the entry. It drives Update's visibility.

- [ ] **Step 1: Write the failing tests.**
  - `"a new draft encodes to today's default code"`.
  - `"choosing Special Episode 1 drops the relay and boosts"`: limits apply, and the relay is null.
  - `"score is exclusive and auto offers no score"`.
  - `"a relay makes an auto run semi-auto, with reason relay"`.
  - `"tab badges and disabled tabs follow the episode"`.
  - `"draftFrom a saved entry carries its note and stats, and from"`.
  - `"draftFrom a code that no longer reads throws CodeError"`.
  - `"isDirty is false for an unchanged entry and true after setNote"`.
  - `"storedTab accepts runLog"`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** Port the rules from the old page (`git show origin/main:src/routes/combi-name/index.ts`: `readForm`, `writeForm`, `readLoadout`, the render logic), without DOM.
- [ ] **Step 4: Run the full list.**
- [ ] **Step 5: Commit** `feat(combi): the editor's draft model`

---

### Task 4: Panel for pop-ups over pop-ups and the docked editor

**Files:**
- Modify: `src/components/molecules/Panel.svelte`, `src/lib/modal.ts`, `tests/styles/look.test.ts`
- Test: `tests/components/molecules/Panel.test.ts`, `tests/lib/modal.test.ts`

**Interfaces:**
- Panel gains `docked?: boolean`, default false.
  - **Docked:** it renders in place as a `<section aria-labelledby>`, not a dialog. There is no scrim, no portal, no focus trap and no scroll lock. Escape with focus inside still calls `onclose`. The left-edge resize still works, and the width is remembered under the same key.
  - **Not docked:**
    - It mounts at the end of `<body>` (a portal through an attachment that moves the node, or `mount` into `document.body`). A Share panel opened from inside the editor then stacks above it and is not clipped by it.
    - It sets `document.documentElement.style.overflow = "hidden"` while open, and restores the previous value on close. A count keeps two open panels from unlocking early.
- `modal.ts` `focusables(root)` skips elements that are `hidden`, inside `[hidden]`, `inert`, or have `display: none` from a style attribute. happy-dom has no layout, so it does not check computed styles.
- `look.test.ts` allows `letter-spacing` inside a rule whose selector contains `code` or `.code`, the monospace codes. It still bans it everywhere else, and still bans uppercase.

- [ ] **Step 1: Write the failing tests.**
  - `"a closed-to-open panel is a child of body, not of its parent"`.
  - `"the page does not scroll while a panel is open, and does again after"`.
  - `"two open panels unlock only when both close"`.
  - `"docked: a section, no dialog role, no scrim, and Tab leaves it"`.
  - `"docked: Escape inside closes"`.
  - `focusables` `"skips hidden and inert elements"`.
  - `look.test` `"letter-spacing is allowed on code selectors only"`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the full list.** The existing Panel tests stay green.
- [ ] **Step 5: Commit** `feat(frame): panels stack over each other, lock the page, and dock`

---

### Task 5: Atoms for the combi page

**Files:**
- Create: `src/components/atoms/Chips.svelte`, `Tabs.svelte`, `HelpToggle.svelte`, `Toast.svelte`, `EntryIcon.svelte`
- Test: one file per atom under `tests/components/atoms/`

**Interfaces:**
- **`Chips`**, props `{ label: string; options: { value: string; label: string; icon?: string | null; disabled?: boolean }[]; value: string[]; multiple?: boolean; onchange: (value: string[]) => void }`.
  - It renders a `role="group"` of `aria-pressed` buttons. Single mode replaces the value. Multiple mode toggles.
  - A disabled option is `disabled`.
- **`Tabs`**, props `{ label; tabs: { value; label; badge?: string; disabled?: boolean }[]; value; onchange }`.
  - `role="tablist"` of pill `role="tab"` buttons with `aria-selected`, and arrow keys that move and select, skipping disabled tabs.
  - It renders the tabs only. The caller renders the panel with `role="tabpanel"`.
- **`HelpToggle`**, props `{ label: string; controls: string; expanded: boolean; ontoggle }`. A small `?` button with `aria-expanded` and `aria-controls`.
- **`Toast`**, props `{ message: string | null; tone: "info" | "warn" | "error"; ondismiss }`. A `role="status"` region (`role="alert"` for error), always in the DOM so it announces. The message is shown while non-null.
- **`EntryIcon`**, props `{ src: string | null; name: string; round?: boolean; size?: number }`. An `<img loading="lazy" alt={name} title={name}>`, or, when `src` is null, a placeholder tile carrying the name as `aria-label` and `title`.

- [ ] **Step 1: Write the failing tests:**
  - Chips: single replaces, multiple toggles, disabled does not fire.
  - Tabs: roles, arrows skip disabled, and `aria-selected`.
  - HelpToggle: `aria-expanded` follows the prop, and a click calls `ontoggle`.
  - Toast: the role per tone, and the text shows.
  - EntryIcon: the img with alt and title, and the placeholder when there is no src.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, styled per the prototype.
- [ ] **Step 4: Run the full list.**
- [ ] **Step 5: Commit** `feat(components): chips, tabs, help toggle, toast and entry icon`

---

### Task 6: Molecules for the combi page

**Files:**
- Create: `src/components/molecules/Field.svelte`, `EntryPicker.svelte`, `TreasureSlot.svelte`, `LoadoutIcons.svelte`, `CodeDisplay.svelte`
- Test: one file per molecule under `tests/components/molecules/`

**Interfaces:**
- **`Field`**, props `{ id: string; label: string; help: string; helpLabel: string; note?: string; children: Snippet }`.
  - A label row with `HelpToggle`. When it is toggled, the help paragraph (`id={id}-help`) shows under the label. `note` shows a muted line, such as "Special Episode 1 takes none."
- **`EntryPicker`**, props `{ label; searchLabel; options: { id; name; src: string | null }[]; value: string | null; onpick: (id: string) => void; noneLabel?: string; onclear?: () => void }`.
  - A search box filtering by name, case-insensitive, over a grid of `EntryIcon` buttons with `aria-pressed`.
  - It stays usable with 300+ options: lazy images, and no layout work per keystroke beyond filtering.
- **`TreasureSlot`**, props `{ index; label; picks: { id; name; src; levels: number[] }[]; options; onchange: (picks) => void; labels: { add; remove; allLevels; level: (n) => string } }`.
  - Add or remove alternatives through an `EntryPicker`.
  - Each pick has a +0..+9 level strip. A click toggles one level, never the last one. Shift-click selects a range from the last pressed level. "All levels" toggles all of them, then back to +0.
  - Ruling: the old page's drag and long press are dropped. Shift-click and the All button cover ranges. If that is wrong, it costs touch users a faster range gesture.
- **`LoadoutIcons`**, props `{ loadout: RowLoadout | null; size?: number }`.
  - Cookie, then the pet (round), a divider, and one icon per slot with a `+n` badge.
  - For `null`, it renders nothing.
- **`CodeDisplay`**, props `{ code: string; summary: string; hints: CharHint[]; onjump: (group: string) => void; canJump: (group: string) => boolean }`.
  - It shows the 10 characters large in monospace and the code colour, with the summary and the full code in small type under them.
  - Each hint group is a button (tooltip = hint) that calls `onjump`, or a plain span when `canJump` is false.

- [ ] **Step 1: Write the failing tests:**
  - Field: the help is hidden, then shows on toggle with the right id.
  - EntryPicker: search narrows, a click picks, and Clear calls `onclear`.
  - TreasureSlot: a level toggle never empties, shift-click gives a range, and All toggles.
  - LoadoutIcons: the order, the round pet and the `+1`.
  - CodeDisplay: there are 10 large characters, a jumpable group calls `onjump` with its group, and an inert one is a span.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the full list.**
- [ ] **Step 5: Commit** `feat(components): field, entry picker, treasure slot, loadout icons and code display`

---

### Task 7: The editor

**Files:**
- Create: `src/components/organisms/CombiEditor.svelte`
- Modify: `src/lib/i18n/en.ts`, `th.ts`. Add what the editor needs that is missing:
  - verdict sentences built from `ReasonId`s;
  - "takes none" notes per limit, with the episode name as a value;
  - the stat field labels and placeholders;
  - "Save as new", "Delete", and "Type or paste a code." / "n of 10 characters";
  - "Any order" / "Exact order", "Any slot" / "Slot n", "No relay here", and "Only an auto run starts with an action."
- Test: `tests/components/organisms/CombiEditor.test.ts`

**Interfaces:**
- Props `{ draft: Draft; saved: SavedCode | null; onchange: (draft: Draft) => void; oncopy: () => void; onshare: () => void; onsave: () => void; onupdate: () => void; onsaveasnew: () => void; ondelete: () => void; onreset: () => void; ontypecode: (code: string) => void }`.
  - It renders inside a `Panel`, which the caller supplies.
  - It renders the body (code display and tabs) and exposes the footer as a snippet export, or takes a `footer` region. Choose one; the caller places it in `Panel`'s `footer`.
- **Header area:** the `CodeDisplay` of `codeOf(draft)`. The summary is `describeRun(draft.full, m)` joined by ` · `. Jumping selects the owning tab and focuses its control.
- **Tabs** (`Tabs`, remembered in `combi-name:tab`, falling back to `main` when disabled):
  - **Main:** Mode (Chips, manual/auto, showing Semi-auto when the build is semi-auto), with the verdict line `aria-live` under it. Goal (Chips multiple, per `goalOptions`). Episode (an icon grid of `episodeArt`). Floor (a number 1–100, empty for any), shown only when `limits.floor`. Starting action (Chips), disabled with its note unless auto.
  - **Cookies:** Cookie, Relay and Pet, each an `EntryPicker` with Any first. Relay is disabled with "No relay here" when `!limits.relay`.
  - **Treasures:** Order (Chips, any or exact), and three `TreasureSlot`s labelled "Slot n" when ordered, else "Any slot".
  - **Boosts:** Boosts (Chips with `boostArt`), Random boost (Chips with None first), and Cookie power+ (Chips with `cookiePowerArt`).
  - **Run log:** Note (a textarea, max 500), and today's five stats as text inputs validated by `parseStat`. An invalid stat gets `aria-invalid` and its issue text under it.
    - Piece 4 replaces the stats with rounds.
- Every field is a `Field` with its `combi.help.*` text.
- Pickers are built from `optionsFor`. A saved build carrying a retired id gets that id appended to its picker's options (the `project-assets` rule).
- **Footer**, always visible:
  - **Copy.**
  - **Share.**
  - **Save** when `saved` is null.
  - **Update** when `isDirty`.
  - **⋯**, a menu: Type a code (an inline input, uppercased; it calls `ontypecode` on Enter or a valid read), Reset, Save as new (when editing and the code differs from the entry), and Delete (when editing).
  - Ctrl/Cmd+Enter saves or updates.

- [ ] **Step 1: Write the failing tests** (render with a `newDraft()`):
  - The tabs and their panels are present.
  - Picking Special Episode 1 disables Boosts and shows its note.
  - The help toggle shows `combi.help.mode`.
  - Jumping from the code display to the episode group selects Main.
  - Choosing a relay on auto shows the semi-auto verdict.
  - Save shows for a new draft, and Update only when dirty.
  - ⋯ → Type a code with a valid code calls `ontypecode`.
  - Thai is the default text, and switching to English changes the labels.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, styled per the prototype.
- [ ] **Step 4: Run the full list.**
- [ ] **Step 5: Commit** `feat(combi): the editor`

---

### Task 8: The list and Share

**Files:**
- Create: `src/components/organisms/CombiList.svelte`, `ShareDialog.svelte`
- Modify: `src/lib/i18n/en.ts`, `th.ts`. Add the notice strings, and fix `list.sort.money` to "Highest average money" if it differs.
- Test: `tests/components/organisms/CombiList.test.ts`, `ShareDialog.test.ts`

**Interfaces:**
- **`CombiList`**, props `{ entries: SavedCode[]; current: string | null; onnew; onopen: (entry) => void; oncopy: (entry) => void; onshare: (entry) => void }`.
  - It owns its query, goal filter and sort (`readListSort`/`writeListSort`).
  - **Top:** `+ New code`, then search, then the goal filter (All goals, Score, Money, Exp, Box) and the sort. Under 700px, New code and search span the width, and filter and sort share a row.
  - **Rows:** the 10 characters large, `LoadoutIcons`, the note's first line (or the goals text when there is no note), the average money when there is one, and the Share (↗) and Copy buttons.
    - At 1100px and up the list is a table with the columns code, loadout, note, goal, average money and saved date.
    - The rounds column arrives in piece 4.
    - A row opens with `onopen` on a click or Enter. Its Copy and Share do not open it. `aria-current` marks `current`.
  - The empty and no-match states use `list.empty` / `list.noMatch`.
- **`ShareDialog`**, props `{ entry: { code: string; note: string; stats: RunStats } | null; onclose }`.
  - A `Panel id="share"` with Link and Full code, each showing its value in full with its own Copy.
  - Link = `location.origin + location.pathname + shareHashFor(code, note, stats)`.
  - Full code = the code.
  - "Share to app" appears only when `typeof navigator.share === "function"`, and calls `navigator.share({ title, text?, url })`. A rejection is ignored.
  - Copy uses `navigator.clipboard.writeText`. On refusal, or when the API is missing, it shows the issue in a `Toast` and selects the value's text so it can be copied by hand.

- [ ] **Step 1: Write the failing tests:**
  - **List:**
    - Rows render the 10 characters and icons.
    - Search narrows the rows.
    - The goal filter narrows the rows.
    - The sort persists.
    - Copy on a row calls `oncopy` and not `onopen`.
    - The empty state.
    - Two same-10-character entries render different icons.
  - **Share:**
    - The link contains `#CODE?note=`.
    - The full code shows.
    - Share to app is hidden without `navigator.share`.
    - A clipboard rejection shows the error toast and does not throw.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the full list.**
- [ ] **Step 5: Commit** `feat(combi): the saved list and share`

---

### Task 9: The combi page

**Files:**
- Create: `src/components/organisms/CombiApp.svelte`
- Modify: `src/pages/combi-name/index.astro` (it mounts `CombiApp client:only="svelte"`, keeps the title, and lets the page use the wide wrap), `src/layouts/AppLayout.astro` (a `wide` prop: at 1400px and up the wrap fills the width, so the list and the docked editor sit side by side), `src/lib/i18n/en.ts`, `th.ts`
- Test: `tests/components/organisms/CombiApp.test.ts`, `tests/pages/pages.test.ts`

**Interfaces / behaviour:**
- **State:** the `entries` (from `readSaved(localStore())`), the `draft: Draft | null` (the editor is open when non-null), the `share` entry, and the `notice`.
- **New code** opens the editor on `newDraft()`. A row opens `draftFrom(entry)`. On a `CodeError` the editor stays closed, and the notice says "<code> no longer reads: <issue>".
- **Address bar:**
  - While the editor is open, `history.replaceState(null, "", hashFor(codeOf(draft)))`.
  - On close, `replaceState(null, "", location.pathname)`.
  - On load and on `hashchange`, a hash with a code opens the editor on `draftFromCode(codeInHash, noteInHash, statsInHash)`.
  - When that code is already saved, it opens that entry instead.
  - It notices "This link came with a note / run stats / both. Save keeps them." when they came, and "This link's code is already saved as <name>." for a saved one.
- **Paste anywhere:** when no input or textarea is focused and no modal is open, the pasted text is trimmed and uppercased. If it decodes, the editor opens on it with the notice "Code pasted.". An unreadable paste is ignored.
- **Save:** `saveCode`; Update: `updateSaved` (its "missing" and "taken" results are worded as on the old page); Save as new: `saveCode` and the entry becomes `from`; Delete: `removeSaved`, which closes the editor.
  - Each one refreshes `entries` and notices the result.
  - A storage refusal (`stored: false`) notices that the change is listed for this visit only.
- **Copy:** `navigator.clipboard.writeText(combiSectionOf(code))`, with "Copied <code>." On refusal it notices the issue and shows the code to copy by hand.
- **Layout:** under 1400px the editor is a `Panel id="editor"` over the page. At 1400px and up (`DOCK_MIN_WIDTH`) it is `docked` in a column beside the list, with its remembered width. Share is always a pop-up.
- Warnings from decoding show as a warn notice: "Read with changes", plus each `issueText`.

- [ ] **Step 1: Write the failing tests.** Seed `localStorage` with two entries.
  - The list shows both.
  - New code opens the editor.
  - Save adds a third, and Copy copies the 10 characters; mock the clipboard.
  - An old-style hash `#CODE?note=<b64>&money=12000-15000` opens the editor with the note and the money filled, and notices that Save keeps them. Saving twice keeps one entry.
  - An unreadable saved entry lists, and opening it notices instead of throwing.
  - A clipboard rejection notices and does not throw.
  - A paste of a valid code opens it.
  - At width 1440 the editor is docked (no dialog role). At 1000 it is a dialog.
  - The page test checks that `dist/combi-name/index.html` mounts the island.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the full list.**
- [ ] **Step 5: Commit** `feat(combi): the combi page`

---

### Task 10: Home saved codes, and docs

**Files:**
- Create: `src/components/organisms/HomeSaved.svelte`
- Modify: `src/pages/index.astro`, `src/lib/i18n/en.ts`, `th.ts` (`home.saved.{title, seeAll}`), `AGENTS.md`, the `.claude/skills/project-components`, `project-pages` and `project-combi-codec` SKILL.md files (the new modules, components, `Issue`, and the docked panel)
- Test: `tests/components/organisms/HomeSaved.test.ts`, `tests/build/output.test.ts`

**Interfaces:**
- `HomeSaved`, with no props. It reads `readSaved(localStore())` and takes the first three.
  - It renders nothing when there are none.
  - Each item has the 10 characters, `LoadoutIcons`, the note's first line and Copy.
  - "See all" links to `/combi-name/`.
  - On wide screens the items lay out as a grid.
  - It sits between the intro and the tool cards.

- [ ] **Step 1: Write the failing tests:**
  - It shows nothing with no saved codes.
  - With five codes it shows three, newest first.
  - Copy copies the 10 characters.
  - See all goes to `/combi-name/`.
  - Built Home contains the island.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement, and update the docs.**
- [ ] **Step 4: Run the full list.**
- [ ] **Step 5: Commit** `feat(home): latest saved codes`

---

## Then

Push and open the PR into `redesign`, with the Review Focus preview checks unticked:
- 390px phone layout;
- the docked editor at 1440px;
- an old share link;
- the Thai and English switch on the page;
- the same-10-character pair.

Wait for `deploy`, report the preview URL, and stop for approval.
