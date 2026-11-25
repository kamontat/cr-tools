# Redesign piece 5: back up and restore — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings gains a "Combi codes data" section — Storage, Back up, Restore, Delete all — each opening in place under its row, and About moves to the same in-place pattern, so the site has no pop-ups.

**Architecture:** Framework-free helpers in `src/lib/combi/backup.ts` (storage use, the saved list's counts, the restore preview, the backup file name, gist links and fetching) and `src/lib/download.ts` (save text as a file). A molecule `SettingsRow` is a row that expands its body in place. Four organisms — `StorageBox`, `BackupBox`, `RestoreBox`, `DeleteAllBox` — fill the rows, using the existing `formatSaved`, `parseSaved`, `importSaved` and `clearSaved` from `saved.ts`.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest with happy-dom, `@testing-library/svelte`.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md`, sections "Settings" and "Back up and restore". The owner's change of 2026-11-25: the data rows and About open **in place** under their row, not as pop-ups.

## Global Constraints

- Every data row opens in place under itself, one at a time or several — a second press folds it. No pop-up, no dialog role, no scrim on the Settings page.
- Storage row: `<used> / <limit> (<percent>)` and a bar. localStorage use is every key's and value's length × 2 bytes (UTF-16). The limit is 5 MiB (5 × 1024 × 1024), said to be approximate. Opened: saved codes, rounds logged, codes with rounds, codes with a note, first and last save date; localStorage use against the limit; total site storage from `navigator.storage.estimate()` as usage / quota and percent, or "not reported" when unavailable.
- Back up: **Download file** (a `.txt` of `formatSaved`'s text) or **As text** (the same text in a read-only box with Copy).
- Restore sources: **Clipboard** (`navigator.clipboard.readText()`; refused or missing shows a paste box with the reason), **File** (`<input type="file" accept=".txt,text/plain">`), **Link** (fetched from the browser; a gist page URL read through the Gist API). A failed link says why and shows the paste box. No proxy, no Worker code.
- Every source first shows what it found — "Found 3 codes: 2 new, 1 already saved", plus any skipped lines with their reasons — and adds nothing until **Restore** is pressed. Restoring merges and skips codes already saved (`importSaved`).
- Delete all: says it cannot be undone and asks for a typed word, `delete` in English, `ลบ` in Thai (the current language's), trimmed and case-insensitive; the button stays disabled until it matches.
- Thai is the default language; every new string goes into both `en.ts` and `th.ts`. Labels sentence case, no letter spacing.
- Never name an element, class or id "cookie", "consent" or "gdpr".
- Components follow the atomic tiers; `src/lib/` imports no component. Every Svelte component reading storage is mounted `client:only`.
- The page works at 390px with nothing clipped and no sideways scroll.

## Review Focus

1. A browser whose clipboard read throws or is missing (Firefox, an insecure origin) shows the paste box and a reason, never a silent nothing.
2. A link that fails cross-site (fetch throws `TypeError`) says the site blocks reading and offers the paste box; a 404 says the link was not found.
3. Restore text with no readable code shows "Found no codes" with the skipped lines, and the Restore button is not offered.
4. A storage that refuses writes (`importSaved` / `clearSaved` give `stored: false`) says the change could not be saved, and the list shown is unchanged.
5. Typing `Delete`, ` delete ` or (in Thai) `ลบ` enables Delete all; `delet` or the other language's word does not.

## Decisions (builder's calls the spec leaves open)

- **File name:** `cr-tools-combi-codes-YYYY-MM-DD.txt`, the local date.
- **Gist links:** `https://gist.github.com/<user>/<id>` or `https://gist.github.com/<id>` (optionally with `#file…` or a trailing slash) read through `https://api.github.com/gists/<id>`; the first file's `content` is the text, or its `raw_url` fetched when `truncated` is true. Any other `https://` URL is fetched as is. Anything that is not an `http(s)` URL is refused before fetching.
- **After restoring or deleting,** the open box shows the result ("Added 2 codes." / "Deleted 14 codes.") and the Storage numbers refresh. The combi page reads storage on load, so nothing else needs telling.
- **About** becomes a `SettingsRow` like the rest; `SettingsApp` stops importing `Panel`. `Panel`'s pop-up mode then has no user; removing it is a later clean-up, not part of this piece.
- **Download:** `src/lib/download.ts` makes a `Blob` and clicks a temporary `<a download>`; it returns `false` when the browser throws, and the box then says so and points to As text.

---

### Task 1: `backup.ts` — counts, storage use, file name, restore preview

**Files:**
- Create: `src/lib/combi/backup.ts`
- Test: `tests/lib/combi/backup.test.ts`

**Interfaces — Produces:**
- `LOCAL_LIMIT = 5 * 1024 * 1024`
- `localUse(store: Storage | null): number` — bytes, `(key.length + value.length) * 2` summed over every key; `0` for `null` or a store that throws.
- `type SavedCounts = { codes: number; rounds: number; withRounds: number; withNote: number; first: number | null; last: number | null }` and `savedCounts(entries: readonly SavedCode[]): SavedCounts` — `first`/`last` the smallest and largest `savedAt`.
- `backupFileName(now: Date): string` — `cr-tools-combi-codes-2026-11-25.txt` from the local date.
- `type RestorePreview = { entries: ParsedCode[]; fresh: number; kept: number; skipped: SkippedLine[] }` and `previewRestore(text: string, existing: readonly SavedCode[]): RestorePreview` — `parseSaved`, then counts against `existing` by code.

- [ ] **Step 1: Write the failing tests** — `localUse` of a two-key store (`{"a": "bc", "de": "f"}` gives `(1+2+2+1)*2 = 12`) and of `null` (`0`); `savedCounts` over three entries (one with two rounds and a note, one with a note, one bare) gives `{ codes: 3, rounds: 2, withRounds: 1, withNote: 2, first, last }`, and `[]` gives zeros with `null` dates; `backupFileName(new Date(2026, 10, 5))` is `cr-tools-combi-codes-2026-11-05.txt`; `previewRestore` of two codes where one is saved gives `fresh: 1, kept: 1`, and of `"junk"` gives no entries and one skipped line.
- [ ] **Step 2: Run** `pnpm run test tests/lib/combi/backup.test.ts` — fails, no module.
- [ ] **Step 3: Implement** `backup.ts`, importing `parseSaved` and the types from `./saved`.
- [ ] **Step 4: Run the test** — passes.
- [ ] **Step 5: Commit** `feat(combi): counts, storage use and a restore preview for backups`

### Task 2: links, fetching and download

**Files:**
- Modify: `src/lib/combi/backup.ts`
- Create: `src/lib/download.ts`
- Test: `tests/lib/combi/backup.test.ts`, `tests/lib/download.test.ts`

**Interfaces — Produces:**
- `type LinkTarget = { kind: "gist"; id: string; api: string } | { kind: "url"; url: string }`
- `linkTarget(input: string): LinkTarget | null` — trims; `null` for anything not `http:`/`https:`; gist page URLs as in Decisions.
- `type FetchResult = { ok: true; text: string } | { ok: false; reason: "blocked" | "notFound" | "failed" | "empty" }`
- `fetchBackup(target: LinkTarget, fetcher: typeof fetch = fetch): Promise<FetchResult>` — a thrown `TypeError` is `blocked`; HTTP 404 `notFound`; other non-OK `failed`; blank text `empty`. A gist reads the API JSON's first file (by key order) and fetches its `raw_url` when `truncated`. Never rejects.
- `readClipboard(): Promise<{ ok: true; text: string } | { ok: false; reason: "missing" | "refused" }>` — never rejects.
- `downloadText(name: string, text: string, doc: Document = document): boolean`

- [ ] **Step 1: Write the failing tests** — `linkTarget("https://gist.github.com/kamontat/abc123")` and `("https://gist.github.com/abc123/")` give `{ kind: "gist", id: "abc123", api: "https://api.github.com/gists/abc123" }`; `("https://example.com/x.txt")` gives `{ kind: "url", url }`; `("ftp://x")`, `("not a link")` give `null`. `fetchBackup` with a stub `fetcher`: a gist JSON `{ files: { "a.txt": { content: "1-MM0A000000", truncated: false } } }` gives `{ ok: true, text: "1-MM0A000000" }`; a truncated file fetches its `raw_url`; a fetcher that throws `TypeError` gives `blocked`; 404 `notFound`; 500 `failed`; `"  "` `empty`. `readClipboard` with no `navigator.clipboard` gives `missing`, with a rejecting `readText` `refused`. `downloadText` creates and clicks an `<a download="name">` whose `href` is a `blob:` URL, then removes it.
- [ ] **Step 2: Run** the two test files — fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — pass.
- [ ] **Step 5: Commit** `feat(combi): read backups from links and the clipboard, and save them as files`

### Task 3: catalogue strings

**Files:**
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/th.ts`
- Test: the existing catalogue key test (`tests/lib/i18n/`) covers both languages having every key

**Interfaces — Produces** `m.settings.data`:
`title` ("Combi codes data" / "ข้อมูลโค้ดคอมโบ"), `storage`, `backUp`, `restore`, `deleteAll`, `usage(used, limit, percent)`, `approximate`, `notReported`, `counts: { codes, rounds, withRounds, withNote, first, last }`, `siteStorage`, `localStorage`, `download`, `asText`, `copy`, `copied`, `copyFailed`, `downloadFailed`, `fromClipboard`, `fromFile`, `fromLink`, `linkLabel`, `fetch`, `paste`, `pasteLabel`, `read`, `found(total, fresh, kept)` ("Found 3 codes: 2 new, 1 already saved"), `foundNone`, `skipped(n)`, `restoreButton(n)`, `restored(n)`, `notStored`, `clipboardMissing`, `clipboardRefused`, `linkInvalid`, `linkBlocked`, `linkNotFound`, `linkFailed`, `linkEmpty`, `deleteWarning(n)`, `deleteWord` ("delete" / "ลบ"), `deletePrompt(word)`, `deleteButton`, `deleted(n)`, `nothingSaved`. Thai wording best effort; an episode is ด่าน.

- [ ] **Step 1:** Add the keys to `en.ts` first and run `pnpm run test tests/lib/i18n` — fails, Thai missing.
- [ ] **Step 2:** Add the Thai.
- [ ] **Step 3:** Run — passes. Commit `feat(settings): the data rows' words in Thai and English`

### Task 4: `SettingsRow`, a row that opens in place

**Files:**
- Create: `src/components/molecules/SettingsRow.svelte`
- Test: `tests/components/molecules/SettingsRow.test.ts`

**Interfaces — Produces:** props `label: string`, `value?: string` (muted, right side), `aside?: Snippet` (under the label, such as the storage bar), `children: Snippet` (the body), `open?: boolean` (bindable, default `false`). A `<button aria-expanded aria-controls>` row with a chevron that turns when open; the body is a region labelled by the row, rendered only when open.

- [ ] **Step 1: Write the failing test** — closed: one button named by the label with `aria-expanded="false"`, no body; a press opens it (`aria-expanded="true"`, body text present, `aria-controls` names the body's id); a second press folds it; no `dialog` role anywhere.
- [ ] **Step 2–4:** Run, implement (styles as `SettingsApp`'s `.row.nav`), pass.
- [ ] **Step 5: Commit** `feat(settings): a row that opens in place`

### Task 5: `StorageBox` and `BackupBox`

**Files:**
- Create: `src/components/organisms/StorageBox.svelte`, `src/components/organisms/BackupBox.svelte`
- Test: `tests/components/organisms/StorageBox.test.ts`, `tests/components/organisms/BackupBox.test.ts`

**Interfaces:** both take `entries: SavedCode[]` and `m: Messages`; `StorageBox` also `store: Storage | null` and a `refresh` counter prop it re-reads on. `StorageBox` exports nothing else; the row's summary text and bar come from a pure helper in `backup.ts` added here: `usageText(used: number, limit: number, locale: string): { used: string; limit: string; percent: string; ratio: number }` (kB/MB with one decimal, percent whole).

- [ ] **Step 1: Write the failing tests** — `StorageBox` lists the six counts and the localStorage line, and "not reported" when `navigator.storage` is missing, then usage / quota when `estimate` resolves. `BackupBox`: Download calls `downloadText` with `backupFileName` and `formatSaved(entries)` (spy the module); As text shows the text in a read-only `<textarea>` and Copy copies it; with no entries both say `nothingSaved` and offer neither.
- [ ] **Step 2–4:** Run, implement, pass.
- [ ] **Step 5: Commit** `feat(settings): storage use and back up`

### Task 6: `RestoreBox`

**Files:**
- Create: `src/components/organisms/RestoreBox.svelte`
- Test: `tests/components/organisms/RestoreBox.test.ts`

**Interfaces:** props `store: Storage`, `m: Messages`, `onrestored: (entries: SavedCode[]) => void`. Three source buttons; Link shows a URL input with Fetch; any failure shows its reason and the paste box (`<textarea>` + Read). Read text → preview (`previewRestore` against `readSaved(store)`): the found line, the skipped lines with reasons (`issueText`), and `restoreButton(fresh)` only when `fresh > 0`. Restore → `importSaved`; `stored: false` shows `notStored`; else `restored(added)` and `onrestored(entries)`.

- [ ] **Step 1: Write the failing tests** — clipboard success previews "Found 2 codes: 1 new, 1 already saved" and Restore adds one (storage holds 2 after); clipboard missing shows the paste box and `clipboardMissing`; a pasted junk line shows `foundNone` and one skipped line, and no Restore button; a file input `change` with a `File` previews it; a link whose fetch throws shows `linkBlocked` and the paste box; an invalid link shows `linkInvalid` without fetching; a refusing storage shows `notStored`.
- [ ] **Step 2–4:** Run, implement, pass.
- [ ] **Step 5: Commit** `feat(settings): restore from the clipboard, a file or a link`

### Task 7: `DeleteAllBox`

**Files:**
- Create: `src/components/organisms/DeleteAllBox.svelte`
- Test: `tests/components/organisms/DeleteAllBox.test.ts`

**Interfaces:** props `store: Storage`, `count: number`, `m: Messages`, `ondeleted: () => void`. Shows `deleteWarning(count)`, an input labelled `deletePrompt(word)`, and a danger button disabled until the trimmed, lower-cased input equals `m.settings.data.deleteWord`. Pressing it calls `clearSaved`; `stored: false` shows `notStored`; else `deleted(count)` and `ondeleted()`. With `count` 0 it shows `nothingSaved` only.

- [ ] **Step 1: Write the failing tests** — the five Review Focus inputs for the word (English and Thai); pressing clears storage to `[]`; a refusing storage keeps the entries and says `notStored`.
- [ ] **Step 2–4:** Run, implement, pass.
- [ ] **Step 5: Commit** `feat(settings): delete all, after a typed word`

### Task 8: Settings puts it together, About in place

**Files:**
- Modify: `src/components/organisms/SettingsApp.svelte`
- Test: `tests/components/organisms/SettingsApp.test.ts`, `tests/build/output.test.ts` if it names Settings' markup

**Interfaces — Consumes:** Tasks 4–7. `SettingsApp` reads `localStore()` once (falling back to an in-memory store as `CombiApp` does), holds `entries = readSaved(store)`, and refreshes them and a `refresh` counter after `onrestored` / `ondeleted`. Sections in order: Appearance, Combi codes data (Storage with its usage as `value` and the bar as `aside`, Back up, Restore, Delete all), About (a `SettingsRow` whose `value` is today's summary and body today's `<dl>`). `Panel` is no longer imported.

- [ ] **Step 1: Write the failing tests** — the data section's four rows and About are buttons with `aria-expanded`; pressing About shows Environment in place and there is no `dialog`; restoring through the box updates the Storage row's code count; existing About tests move from the dialog to the region.
- [ ] **Step 2–4:** Run, implement, pass.
- [ ] **Step 5: Commit** `feat(settings): the combi codes data section, and About in place`

### Task 9: docs, checks, screenshots

**Files:**
- Modify: `docs/superpowers/specs/2026-11-19-site-redesign-design.md` (owner's change 2026-11-25: Settings rows open in place), `AGENTS.md` (component list, `backup.ts`, `download.ts`; the redesign is complete), `README.md`, `.claude/skills/project-components/SKILL.md` (the in-place row)

- [ ] **Step 1:** Update the docs.
- [ ] **Step 2:** `pnpm run format && pnpm run check && pnpm run test && pnpm run build` — all pass.
- [ ] **Step 3:** Serve `dist/`; in Chrome at 390 and 1440px, open each row, back up as text, restore it by paste (found 0 new), delete all with the word, restore again; no sideways scroll, no dialog.
- [ ] **Step 4: Commit** `docs: back up and restore, and Settings rows that open in place`
