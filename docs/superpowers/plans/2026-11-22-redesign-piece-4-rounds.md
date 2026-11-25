# Redesign piece 4: rounds — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A saved code keeps a list of rounds (score, money, exp, boxes, time, each optional) instead of one set of ranges, the editor's Run log edits them as a table with an Average row, and the list shows averages and the round count.

**Architecture:** A new framework-free `src/lib/combi/rounds.ts` owns the round type, reading, conversion from the old ranges, averages, and the two wire forms (share-link parameter and backup line). `saved.ts` moves to a new storage key and converts on read; `state.ts`, `draft.ts` and `list.ts` swap `stats` for `rounds`; the components follow.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest with happy-dom, `@testing-library/svelte`.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md`, section "Rounds" (and "Combi page" for where averages show).

## Global Constraints

- A round holds `score`, `money`, `exp`, `boxes`, `time`, all optional, each one whole number. Time is seconds. Limits as today: score, money, exp, time `1..MAX_SAFE_INTEGER`; boxes `0..5`.
- Average counts only filled-in values, per field. Boxes `0` is a filled value.
- Conversion of an old entry's ranges: no stats gives no rounds; any field with `min !== max` gives **two** rounds (every minimum, then every maximum, time in both, single values in both); stats with no range at all give **one** round.
- Conversion happens when an entry is read, so old storage, old backups and old share links convert the same way.
- Storage: converted entries live under `combi-name:saved:v2`. When that key is absent (`getItem` returns `null`), read `combi-name:saved`, convert, write `combi-name:saved:v2`. The old key is never written again. A refused write still returns the converted list.
- Share links still read `money=12000-15000` (and the other old stat parameters).
- Backup text still reads today's format (`money: 1200-1500` lines under a code).
- Thai is the default language; every new string goes into both `en.ts` and `th.ts`. Labels sentence case, no letter spacing; an episode is ด่าน.
- Never name an element, class or id "cookie", "consent" or "gdpr".
- Components follow the atomic tiers; `src/lib/` imports no component.

## Review Focus

1. An old entry whose stats hold only `time` (or only single values) becomes one round, not two.
2. `combi-name:saved:v2` holding `[]` (everything deleted after the move) must not re-import the old key.
3. A browser that refuses `setItem` during the move still shows the converted list.
4. A share link with a malformed `round=` value drops that round and keeps the rest; a link with both `round=` and old stat parameters uses the rounds.
5. A blank round added in the editor is neither saved nor makes the draft dirty, and it does not count towards the average.

## Decisions (builder's calls the spec leaves open)

- **Share link form:** one `round=` parameter per round, values in `STAT_FIELDS` order (score, money, exp, boxes, time) joined by `:`, blanks empty, trailing blanks trimmed: `#CODE?note=…&round=50000:12000::3:245&round=:13000`. The old per-field parameters are read only when no `round=` is present, and are never written.
- **Backup form:** under a code, one line per round, `round: score=50000 money=12000 boxes=3 time=245` (only filled fields, `STAT_FIELDS` order). Old `money: 1200-1500` lines still read and convert; they are never written.
- **Dead code:** the old drawer's `sortSaved`, `filterSaved`, `facetValues`, `runFacets`, `RUN_FACETS`, `SAVED_SORTS`, `SAVED_SORT_LABELS`, `SAVED_SORT_KEY`, `storedSort`, `rememberSort`, `isFiltering`, `NO_FILTER`, `SavedFilter`, and `stats.ts`'s `statsSentence` are used only by tests and read ranges. They are deleted with their tests rather than converted. `formatSaved`, `parseSaved`, `importSaved` and `clearSaved` stay: piece 5 uses them.
- **Averages are shown rounded** to a whole number with grouping (`12,500`); time as seconds with an `s`.

---

### Task 1: `rounds.ts`, the round model

**Files:**
- Create: `src/lib/combi/rounds.ts`
- Modify: `src/lib/combi/stats.ts` (export `inLimits`; delete `statsSentence`), `src/lib/combi/issues.ts` (new issue `roundValue: { field: StatField }`), `src/lib/i18n/en.ts`, `src/lib/i18n/th.ts` (its text)
- Test: `tests/lib/combi/rounds.test.ts`, `tests/lib/combi/stats.test.ts` (drop `statsSentence` tests)

**Interfaces — Produces:**
- `type Round = { readonly [F in StatField]?: number }`
- `type RoundDraft = { -readonly [F in StatField]?: number }`
- `isEmptyRound(round: Round): boolean`
- `parseRoundValue(field: StatField, text: string): { ok: true; value: number | null } | { ok: false; issue: Issue }` — blank is `null`; one whole number, commas and spaces as grouping allowed; a range or out-of-limits value is refused with `issue("roundValue", { field })`.
- `readRound(value: unknown): Round` — keeps well-formed fields only.
- `readRounds(value: unknown): Round[]` — non-arrays give `[]`; empty rounds dropped.
- `roundsFromStats(stats: RunStats): Round[]` — the conversion rule above.
- `averageOf(rounds: readonly Round[]): Round` — per-field mean of filled values (not rounded); a field no round fills is absent.
- `roundParam(round: Round): string` and `readRoundParam(text: string): Round | null` — the share form; `null` when any part does not read or the round is empty.
- `roundLine(round: Round): string` (`"score=50000 money=12000"`, no `round:` prefix) and `readRoundLine(text: string): Round | null` — the backup form; field names any case, values via `parseRoundValue`.

- [ ] **Step 1: Write failing tests** in `tests/lib/combi/rounds.test.ts`:
  - `roundsFromStats({})` → `[]`
  - `roundsFromStats({ money: {min: 12000, max: 15000}, exp: {min: 300, max: 300}, time: 245 })` → `[{money: 12000, exp: 300, time: 245}, {money: 15000, exp: 300, time: 245}]`
  - `roundsFromStats({ time: 245 })` → `[{time: 245}]`; `roundsFromStats({ money: {min: 5, max: 5} })` → `[{money: 5}]`
  - `averageOf([{money: 10000, boxes: 0}, {money: 15000}, {}])` → `{money: 12500, boxes: 0}`; `averageOf([])` → `{}`
  - `parseRoundValue("money", "12,000")` → `{ok: true, value: 12000}`; `"12000-15000"` refused with `roundValue`; `parseRoundValue("boxes", "6")` refused; `parseRoundValue("boxes", "0")` → `0`; `""` → `null`
  - `roundParam({money: 12000, boxes: 3})` → `":12000::3"`; `readRoundParam(":12000::3")` → `{money: 12000, boxes: 3}`; `readRoundParam("1:x")` → `null`; `readRoundParam("")` → `null`
  - `roundLine({score: 50000, time: 245})` → `"score=50000 time=245"`; `readRoundLine("Money=12,000  boxes=3")` → `{money: 12000, boxes: 3}`; `readRoundLine("money=1-2")` → `null`
  - `readRounds([{money: 1}, {money: "x"}, {}, 4])` → `[{money: 1}]`
- [ ] **Step 2:** `mise exec -- pnpm run test tests/lib/combi/rounds.test.ts` — FAIL (module missing).
- [ ] **Step 3:** Implement. Add `roundValue` to `issues.ts` (type, id list, wording switch) and to both catalogues (e.g. en "Money takes one whole number from 1." / boxes "0 to 5"; th to match). Delete `statsSentence` and its tests.
- [ ] **Step 4:** Tests pass, `mise exec -- pnpm run check` passes.
- [ ] **Step 5:** Commit `feat(combi): rounds, with conversion from saved ranges`.

### Task 2: saved list, share links and backup text carry rounds

**Files:**
- Modify: `src/lib/combi/saved.ts`, `src/lib/combi/state.ts`
- Test: `tests/lib/combi/saved.test.ts`, `tests/lib/combi/state.test.ts`

**Interfaces — Consumes:** Task 1. **Produces:**
- `SavedCode { code; description; rounds?: readonly Round[] /* left off when none */; savedAt }` — `stats` is gone.
- `SAVED_KEY = "combi-name:saved:v2"`, `LEGACY_SAVED_KEY = "combi-name:saved"`.
- `readSaved(storage)` — v2 key; when absent, the legacy key converted and written to v2. An entry is read from `rounds` when that is an array, else from a legacy `stats` through `roundsFromStats`.
- `saveCode(storage, code, note: { description: string; rounds?: readonly Round[] }, now?)`, `updateSaved(storage, code, change: { code; description; rounds? }, now?)`, `importSaved` — `ParsedCode` likewise has `rounds?` instead of `stats?`. Empty rounds are dropped when kept.
- `formatSaved` writes `round: <roundLine>` lines; `parseSaved` reads them, and still reads old stat lines (gathered into a `StatsDraft`, converted with `roundsFromStats`, appended after any `round:` lines). An unreadable `round:` line is skipped and reported with `roundValue`-style issue (`unreadableLine` is fine). A pasted link brings its rounds.
- `roundsInHash(hash: string): Round[]` — `round=` parameters in order (bad ones dropped); when none, `roundsFromStats` of the old parameters. `statsInHash` becomes module-private.
- `shareHashFor(code: string, note: string, rounds: readonly Round[] = [])`.
- Delete the dead drawer code listed in Decisions, with its tests.

- [ ] **Step 1: Failing tests:**
  - legacy key with `[{code, description, stats: {money: {min: 1, max: 2}}, savedAt}]` and no v2 key → `readSaved` gives `rounds: [{money: 1}, {money: 2}]`, and v2 now holds the converted list; legacy key unchanged.
  - v2 key holding `"[]"` with a non-empty legacy key → `readSaved` gives `[]` (Review Focus 2).
  - a storage whose `setItem` throws, legacy data present → `readSaved` still returns the converted list (Review Focus 3).
  - an entry in v2 with legacy `stats` (old backup restored by hand) converts too.
  - `saveCode(..., {description: "", rounds: [{}, {money: 3}]})` keeps `rounds: [{money: 3}]`; with `rounds: [{}]` the entry has no `rounds` key.
  - `formatSaved` of an entry with two rounds → `"CODE\nround: money=1\nround: money=2\n> note\n"`; `parseSaved` of that text round-trips; `parseSaved("CODE\nmoney: 1-2\ntime: 30")` → rounds `[{money: 1, time: 30}, {money: 2, time: 30}]`.
  - `roundsInHash("#C?round=:12000&round=bad&round=:13000::2")` → `[{money: 12000}, {money: 13000, boxes: 2}]`; `roundsInHash("#C?money=12000-15000")` → two rounds; `roundsInHash("#C?round=:1&money=5-9")` → `[{money: 1}]` (Review Focus 4).
  - `shareHashFor("c", "", [{money: 1}, {score: 5, time: 9}])` → `"#C?round=:1&round=5::::9"`.
- [ ] **Step 2:** Run both files — FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm run test tests/lib/combi` passes (fix other combi tests that built `stats` entries).
- [ ] **Step 5:** Commit `feat(combi)!: saved codes, links and backup text carry rounds` — the body says saved data moves to `combi-name:saved:v2`, and the old key is left as it was.

### Task 3: the draft and the list read rounds

**Files:**
- Modify: `src/lib/combi/draft.ts`, `src/lib/combi/list.ts`
- Test: `tests/lib/combi/draft.test.ts`, `tests/lib/combi/list.test.ts`

**Interfaces — Consumes:** Tasks 1-2. **Produces:**
- `Draft.rounds: RoundDraft[]` replaces `Draft.stats`; `draftFromCode(code, note = "", rounds: readonly Round[] = [])`.
- `setRoundValue(draft, index: number, field: StatField, value: number | null): Draft`, `addRound(draft): Draft` (appends `{}`), `removeRound(draft, index): Draft`. `setStat` is deleted.
- `keptRounds(draft): Round[]` — the rounds as saved: empty ones dropped.
- `isDirty` compares `keptRounds(draft)` with the entry's rounds field by field (Review Focus 5).
- `list.ts`: `averageMoney(entry)` is `averageOf(entry.rounds ?? []).money ?? null`; `roundCount(entry): number`; `GoalTarget` becomes `{ goal; field; value: number }` (the average).

- [ ] **Step 1: Failing tests:** `addRound` then `isDirty(draft, entry)` is false for a clean entry; `setRoundValue(d, 0, "money", 5)` on an `addRound`ed draft gives `rounds[0].money === 5` and is dirty; `removeRound` removes the right index; `keptRounds` drops `{}`; `averageMoney` of rounds `[{money: 10000}, {money: 15000}, {}]` is `12500`; `goalTargets` gives the average; `roundCount`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** pass.
- [ ] **Step 5:** Commit `feat(combi): the draft and the list read rounds`.

### Task 4: the Run log table

**Files:**
- Modify: `src/components/organisms/EditorRunLogTab.svelte`, `src/lib/i18n/en.ts`, `src/lib/i18n/th.ts`
- Test: `tests/components/organisms/EditorRunLogTab.test.ts` (create), `tests/components/organisms/CombiEditor.test.ts`

**Interfaces — Consumes:** Task 3's draft functions.

The tab keeps the note field, then a **Rounds** field (help `m.combi.help.rounds`, reworded to the five values) holding a table inside an `overflow-x: auto` wrapper: header row `#`, Score, Money, Exp, Boxes, Time (seconds), and an empty header for ✕; one row per round with an `<input inputmode="numeric" name=…>` per cell, `aria-label` "Round 2 money" (`editor.roundCell(n, label)`), errors under the cell as today (`aria-invalid`, `aria-describedby`); ✕ button per row (`editor.removeRound(n)`, "Remove round 2"); a footer **Average** row (`m.combi.list.average`) showing each field's average rounded and grouped, empty where no round has the field. Under the table, **+ Add round** (`editor.addRound`). A cell keeps what was typed (unfinished or `12,000`) and takes the draft's value only when the draft changes from elsewhere, as the stat boxes do today. Remove `editor.stats`, `editor.statPlaceholders` and `help.stats` from both catalogues if nothing else reads them.

- [ ] **Step 1: Failing tests:** with no rounds it shows the table header, no rows, and Add round; pressing Add round shows "Round 1 money"; typing `12,000` calls `onchange` with `rounds[0].money === 12000`; typing `1-2` shows the error and does not call `onchange` for that value; ✕ on round 1 removes it; the Average row shows `12,500` for money 10000 and 15000 and nothing for exp; every input has a `name`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** pass, plus `tests/components/markup.test.ts`.
- [ ] **Step 5:** Commit `feat(combi): the run log edits rounds as a table with an average`.

### Task 5: the page follows

**Files:**
- Modify: `src/components/organisms/CombiApp.svelte`, `CombiList.svelte`, `ShareDialog.svelte`, `src/lib/i18n/en.ts`, `th.ts`
- Test: `tests/components/organisms/CombiApp.test.ts`, `CombiList.test.ts`, `ShareDialog.test.ts`

- CombiApp: a link's rounds come from `roundsInHash`; the link notice says rounds (`linkStats`/`linkBoth` reworded: "This link came with rounds. Save keeps them." and Thai); save, update, share and reset carry `keptRounds(draft)` / `draft.rounds`.
- CombiList: a closed row's stats are the averages of each filled field (the goal-aimed ones marked as now) plus `list.rounds(n)`; the open row's Results line shows the same; an entry with no rounds shows neither.
- ShareDialog: `entry: { code; note; rounds: readonly Round[] }`.

- [ ] **Step 1: Failing tests:** an old link `#CODE?money=12000-15000` opens the editor with two rounds (12,000 and 15,000) on the Run log; a saved entry with rounds `[{money: 10000}, {money: 15000}]` shows `12,500` and "2 rounds" on its closed row; ShareDialog's link carries `round=:10000&round=:15000`; a legacy-key entry appears in the list after load.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** `format`, `check`, the full `test`, `build` pass.
- [ ] **Step 5:** Commit `feat(combi): the list shows averages and round counts, and links bring rounds`.

### Task 6: docs and preview

- Update `AGENTS.md` (`rounds.ts` in the `src/lib/combi/` list), the `project-combi-codec` skill (rounds, the v2 key and the two wire forms; drop the "redesign converts these ranges" sentence), and `README.md` if it describes stats.
- Push, open the PR into `main`, wait for the preview, and check in Chrome at 390 and 1440px: the table scrolls inside itself on a phone, nothing else scrolls sideways; an old-format entry seeded under `combi-name:saved` shows as rounds.
- Commit `docs: rounds`.
