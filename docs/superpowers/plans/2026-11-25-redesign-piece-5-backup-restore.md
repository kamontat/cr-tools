# Redesign piece 5: back up and restore — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings gains a "Combi codes data" section — Storage, Back up, Restore, Delete all — each opening in place under its row, and About moves to the same in-place pattern, so the site has no pop-ups. A backup is one JSON file for the whole site, with the combi codes under their own field.

**Architecture:** Framework-free helpers: `src/lib/backup.ts` (the site backup file: its shape, writing and reading, the file name), `src/lib/combi/backup.ts` (the combi codes' part of it, storage use, counts, the restore preview), `src/lib/backup-link.ts` (reading a backup from a link, after cc-tracking's DD-208) and `src/lib/download.ts` (save text as a file). A molecule `SettingsRow` is a row that expands its body in place. Four organisms — `StorageBox`, `BackupBox`, `RestoreBox`, `DeleteAllBox` — fill the rows, using the existing `parseSaved`, `importSaved` and `clearSaved` from `saved.ts`.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest with happy-dom, `@testing-library/svelte`.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md`, sections "Settings" and "Back up and restore". The owner's changes of 2026-11-25: the data rows and About open **in place**; a backup is **JSON**, `cr-tools-YYYY-MM-DD.json`, with a `combi-codes` field so later tools add theirs to the same file; restoring from a link follows cc-tracking's link restore (`kamontat/cc-tracking` PRD, DD-208).

## Global Constraints

- Every data row opens in place under itself; a second press folds it. No pop-up, no dialog role, no scrim on the Settings page.
- Storage row: `<used> / <limit> (<percent>)` and a bar. localStorage use is every key's and value's length × 2 bytes (UTF-16). The limit is 5 MiB (5 × 1024 × 1024), said to be approximate. Opened: saved codes, rounds logged, codes with rounds, codes with a note, first and last save date; localStorage use against the limit; total site storage from `navigator.storage.estimate()` as usage / quota and percent, or "not reported" when unavailable.
- **Backup file:** `cr-tools-YYYY-MM-DD.json` (local date), pretty-printed with two spaces, shaped exactly:
  ```json
  {
    "combi-codes": [{ "code": "1-MS0A000000", "description": "…", "savedAt": 1764000000000, "rounds": [{ "money": 12000, "time": 245 }] }],
    "version": 1,
    "exportedAt": "2026-11-25T08:00:00.000Z"
  }
  ```
  `combi-codes` is the first field; each later tool adds its own field beside it. An entry with no rounds has no `rounds` field. **As text** is the same JSON in a read-only box with Copy.
- **Restore reads** the JSON above (a file with no `combi-codes` field restores no codes and says so; an unknown higher `version` is refused, naming it), **and still reads today's text export** (`parseSaved`'s format, old stat lines included) — a backup made before this change must keep restoring.
- A JSON entry is checked like a text line: its code must decode (written back in canonical form), its description cleaned (`cleanDescription`), its rounds read (`readRounds`), `savedAt` kept when a positive number. An entry that fails is skipped and reported with its position (`combi-codes[3]`) and reason; the rest restore. A file that is not JSON and has no readable line is "not a backup".
- Restore sources: **Clipboard** (`navigator.clipboard.readText()`; refused or missing shows the paste box with the reason), **File** (`<input type="file" accept=".json,application/json,.txt,text/plain">`), **Link** (below), **Paste by hand** (a text box).
- **Link restore (after cc-tracking DD-208):** an address field, a one-line hint that the site must let other sites read the file, naming where to save a copy — GitHub Gist (`https://gist.github.com/`) and PasteFox (`https://pastefox.com/create`) — as links opening in a new tab; Back and Restore, Restore waiting until the field holds an http(s) address, Enter submits. A link typed without a scheme is read over https; its host must contain a dot or be `localhost`. Anything else is refused before fetching (`notAddress`). Two sites' share pages are read from their raw address: a gist page `gist.github.com/<user>/<id>#file-<name>-<ext>` from `gist.githubusercontent.com/<user>/<id>/raw/<name>.<ext>` (the anchor's last dash back to a dot; with no anchor `…/raw`, the gist's first file), and a PasteFox page `pastefox.com/<code>` from `pastefox.com/api/pastes/<code>/raw` (not PasteFox's own pages: `create`, `docs`, `login`, `signup`, `pricing`, `about`, `api`). The copy is named by the gist's file (else its id), the paste's code, else the link's last path segment (else its host). Failures: a fetch that never answers (thrown) is `unreachable` — elsewhere it says the site probably does not allow cross-site reads and suggests downloading the file or using GitHub Gist or PasteFox; on Gist or PasteFox it names the site and says to check the connection. An error status: on Gist or PasteFox 404/410 `missing`, 401/403 `private`, else `status` naming it; elsewhere `status` naming it. Text that is no backup: on Gist or PasteFox `notBackup` (save the As text text there), elsewhere the general "not a backup". A failure stays on the link step with the address kept; nothing is written. The link is never stored.
- Every source first shows what it found — "Found 3 codes: 2 new, 1 already saved", with the copy's name for a file or link, plus any skipped entries or lines with their reasons — and adds nothing until **Restore** is pressed. Restoring merges and skips codes already saved (`importSaved`).
- Delete all: says it cannot be undone and asks for a typed word, `delete` in English, `ลบ` in Thai (the current language's), trimmed and case-insensitive; the button stays disabled until it matches.
- Thai is the default language; every new string goes into both `en.ts` and `th.ts`. Labels sentence case, no letter spacing.
- Never name an element, class or id "cookie", "consent" or "gdpr".
- Components follow the atomic tiers; `src/lib/` imports no component. Every Svelte component reading storage is mounted `client:only`. No proxy and no Worker code: every fetch runs in the browser.
- The page works at 390px with nothing clipped and no sideways scroll.

## Review Focus

1. A backup text file made before this change (`formatSaved` text with `round:` and old `money: 1200-1500` lines) restores exactly as it does today.
2. A JSON file with one bad entry among good ones restores the good ones and names the bad one's position.
3. A browser whose clipboard read throws or is missing shows the paste box and a reason, never a silent nothing.
4. `pastefox.com/create` and `gist.github.com/` (no id) are fetched as ordinary links, not rewritten; `pastefox.com/206br1` typed without a scheme reads `https://pastefox.com/api/pastes/206br1/raw`.
5. Typing `Delete`, ` delete ` or (in Thai) `ลบ` enables Delete all; `delet` or the other language's word does not.

## Decisions (builder's calls the spec leaves open)

- **`version` is 1** and **`exportedAt`** is an ISO time; a file whose `version` is a number above 1 is refused ("made by a newer version of the site"), one with no `version` but a `combi-codes` array is read as version 1.
- **Skip and report, not reject:** unlike cc-tracking, one bad entry does not reject the file; the combi list has always skipped and reported a bad line, and restoring merges rather than overwrites, so a partial restore loses nothing.
- **No Merge or Replace question:** the spec keeps today's merge-and-skip; Delete all then Restore is the replace.
- **After restoring or deleting,** the open box shows the result ("Added 2 codes." / "Deleted 14 codes.") and the Storage numbers refresh. The combi page reads storage on load.
- **About** becomes a `SettingsRow` like the rest; `SettingsApp` stops importing `Panel`. `Panel`'s pop-up mode then has no user; removing it is a later clean-up.
- **Download:** `src/lib/download.ts` makes a `Blob` (`application/json`) and clicks a temporary `<a download>`; it returns `false` when the browser throws, and the box then says so and points to As text.
- `formatSaved` stays (Home and tests use the text form nowhere else; it is kept for the old format's round-trip tests and removed later if unused).

---

### Task 1: the site backup file

**Files:**
- Create: `src/lib/backup.ts`
- Test: `tests/lib/backup.test.ts`

**Interfaces — Produces:**
- `BACKUP_VERSION = 1`
- `type SiteBackup = { "combi-codes"?: unknown; version: number; exportedAt: string }` (unknown parts are validated by each tool)
- `backupFileName(now: Date): string` — `cr-tools-2026-11-05.json` from the local date.
- `writeBackup(parts: { "combi-codes": unknown }, now: Date): string` — JSON, two-space indent, keys in the order `combi-codes`, `version`, `exportedAt`.
- `type ReadBackup = { kind: "json"; parts: Record<string, unknown> } | { kind: "text"; text: string } | { kind: "newer"; version: number }`
- `readBackup(text: string): ReadBackup` — JSON objects become `json` (no `version` read as 1), `version > 1` is `newer`, anything that is not a JSON object is `text` (for the old format).

- [ ] **Step 1: Write the failing tests** — the file name; `writeBackup` output's first key is `combi-codes` and it parses back with `version: 1`; `readBackup` of that is `json`; of `{"version": 2}` is `newer` 2; of `"1-MM0A000000\n> note"` and of `[1,2]` is `text`.
- [ ] **Step 2: Run** `pnpm run test tests/lib/backup.test.ts` — fails, no module.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — passes.
- [ ] **Step 5: Commit** `feat: a site backup file, one JSON for every tool`

### Task 2: the combi codes' part — export, import, counts, storage use

**Files:**
- Create: `src/lib/combi/backup.ts`
- Modify: `src/lib/combi/saved.ts` (export the canonical-code helper `codeOnLine` is built on, as `canonicalCode(text: string): string`, throwing `CodeError` as today)
- Test: `tests/lib/combi/backup.test.ts`

**Interfaces — Produces:**
- `exportCodes(entries: readonly SavedCode[]): unknown[]` — `{ code, description, savedAt, rounds? }` each.
- `type RestorePreview = { entries: ParsedCode[]; fresh: number; kept: number; skipped: SkippedLine[]; newer?: number }` (a JSON entry's `SkippedLine` has `line` = its index + 1 and `text` = `combi-codes[<index>]`)
- `previewRestore(text: string, existing: readonly SavedCode[]): RestorePreview` — `readBackup`; `json` reads `parts["combi-codes"]` entry by entry; `text` goes through `parseSaved`; `newer` returns no entries and `newer: version`. Counts `fresh`/`kept` against `existing` by code.
- `LOCAL_LIMIT = 5 * 1024 * 1024`; `localUse(store: Storage | null): number`
- `type SavedCounts = { codes; rounds; withRounds; withNote; first: number | null; last: number | null }`; `savedCounts(entries): SavedCounts`
- `usageText(used: number, limit: number, locale: string): { used: string; limit: string; percent: string; ratio: number }` — B, kB or MB with one decimal; percent whole.

- [ ] **Step 1: Write the failing tests** — round trip: `previewRestore(writeBackup({ "combi-codes": exportCodes(list) }, now), [])` gives the same codes, notes and rounds; JSON with a bad code at index 1 restores the others and skips `combi-codes[1]` with its issue; a JSON file with no `combi-codes` finds nothing; `{"version": 2}` gives `newer: 2`; today's text export (with `round:` and `money: 1200-1500` lines) previews the same entries `parseSaved` gives; `fresh`/`kept` against an existing list; `localUse` of `{"a": "bc", "de": "f"}` is 12 and of `null` 0; `savedCounts` of three entries; `usageText(12_288, LOCAL_LIMIT, "en-US")`.
- [ ] **Step 2–4:** Run, implement, pass.
- [ ] **Step 5: Commit** `feat(combi): the combi codes' part of a backup, its counts and storage use`

### Task 3: restoring from a link

**Files:**
- Create: `src/lib/backup-link.ts`
- Test: `tests/lib/backup-link.test.ts`

**Interfaces — Produces:**
- `type Platform = "gist" | "pastefox" | null`
- `type ResolvedLink = { url: string; name: string; platform: Platform }`
- `resolveLink(input: string): ResolvedLink | null` — the rules in Global Constraints; `null` is `notAddress`.
- `type LinkFailure = { reason: "unreachable" | "missing" | "private" | "status"; platform: Platform; status?: number }`
- `fetchLink(link: ResolvedLink, fetcher: typeof fetch = fetch): Promise<{ ok: true; text: string } | { ok: false; failure: LinkFailure }>` — never rejects; 404/410 and 401/403 map to `missing`/`private` only with a platform, else `status`.

- [ ] **Step 1: Write the failing tests** — `resolveLink("https://gist.github.com/kamontat/abc123#file-codes-json")` → `{ url: "https://gist.githubusercontent.com/kamontat/abc123/raw/codes.json", name: "codes.json", platform: "gist" }`; without the anchor → `…/raw`, name `abc123`; `"pastefox.com/206br1"` → `https://pastefox.com/api/pastes/206br1/raw`, name `206br1`; `"https://pastefox.com/create"` → ordinary, platform `null`; `"https://example.com/b/cr.json"` → name `cr.json`; `"https://example.com/"` → name `example.com`; `"localhost:4321/x"` → https; `"ftp://x"`, `"nodot"`, `""` → `null`. `fetchLink` with stub fetchers: thrown `TypeError` → `unreachable`; gist 404 → `missing`, gist 403 → `private`, plain 404 → `status` 404; 200 → text.
- [ ] **Step 2–4:** Run, implement, pass.
- [ ] **Step 5: Commit** `feat: read a backup from a link, Gist and PasteFox pages included`

### Task 4: clipboard and download

**Files:**
- Create: `src/lib/download.ts`; Modify: `src/lib/clipboard.ts` (add `readClipboard`)
- Test: `tests/lib/download.test.ts`, `tests/lib/clipboard.test.ts`

**Interfaces — Produces:**
- `readClipboard(): Promise<{ ok: true; text: string } | { ok: false; reason: "missing" | "refused" }>` — never rejects.
- `downloadText(name: string, text: string, type = "application/json", doc: Document = document): boolean`

- [ ] **Step 1: Write the failing tests** — no `navigator.clipboard` → `missing`; rejecting `readText` → `refused`; resolving → text. `downloadText` creates and clicks an `<a download="name">` with a `blob:` href, then removes it; a throwing `URL.createObjectURL` → `false`.
- [ ] **Step 2–4:** Run, implement, pass.
- [ ] **Step 5: Commit** `feat: read the clipboard and save a file`

### Task 5: catalogue strings

**Files:** Modify `src/lib/i18n/en.ts`, `src/lib/i18n/th.ts`. Test: the existing catalogue key test.

**Interfaces — Produces** `m.settings.data`: `title` ("Combi codes data" / "ข้อมูลโค้ดคอมโบ"), `storage`, `backUp`, `restore`, `deleteAll`, `approximate`, `notReported`, `counts: { codes, rounds, withRounds, withNote, first, last }`, `siteStorage`, `localStorage`, `download`, `fileName(name)`, `asText`, `copy`, `copied`, `copyFailed`, `downloadFailed`, `fromClipboard`, `fromFile`, `fromLink`, `byHand`, `back`, `restoreButton`, `pasteLabel`, `linkLabel`, `linkHint` (with the two site names as separate keys `gist`, `pastefox`), `found(total, fresh, kept)` ("Found 3 codes: 2 new, 1 already saved"), `foundIn(name)`, `foundNone`, `notBackup`, `newer(version)`, `skipped(n)`, `restored(n)`, `notStored`, `clipboardMissing`, `clipboardRefused`, `link: { notAddress, unreachable, status(code), platform: { missing(site), private(site), status(site, code), unreachable(site), notBackup(site) } }`, `deleteWarning(n)`, `deleteWord` ("delete" / "ลบ"), `deletePrompt(word)`, `deleteButton`, `deleted(n)`, `nothingSaved`. Thai wording best effort.

- [ ] **Step 1:** Add to `en.ts`, run `pnpm run test tests/lib/i18n` — fails. **Step 2:** Add the Thai. **Step 3:** Pass; commit `feat(settings): the data rows' words in Thai and English`

### Task 6: `SettingsRow`, a row that opens in place

**Files:** Create `src/components/molecules/SettingsRow.svelte`; Test `tests/components/molecules/SettingsRow.test.ts`

**Interfaces — Produces:** props `label: string`, `value?: string` (muted, right side), `aside?: Snippet` (under the label, such as the storage bar), `children: Snippet` (the body), `open?: boolean` (bindable, default `false`). A `<button aria-expanded aria-controls>` row with a chevron that turns when open; the body is a region labelled by the row, rendered only when open.

- [ ] **Step 1: Write the failing test** — closed: a button named by the label, `aria-expanded="false"`, no body; a press opens it (`aria-expanded="true"`, body present, `aria-controls` names the body's id); a second press folds it; no `dialog` role.
- [ ] **Step 2–4:** Run, implement, pass. **Step 5:** Commit `feat(settings): a row that opens in place`

### Task 7: `StorageBox` and `BackupBox`

**Files:** Create `src/components/organisms/StorageBox.svelte`, `BackupBox.svelte`; Tests beside them in `tests/components/organisms/`.

**Interfaces:** both take `entries: SavedCode[]`, `m: Messages`; `StorageBox` also `store: Storage | null` and a `refresh: number` it re-reads on.

- [ ] **Step 1: Write the failing tests** — `StorageBox` lists the six counts and the localStorage line, "not reported" with no `navigator.storage`, usage / quota when `estimate` resolves. `BackupBox`: the Download row shows the file name; pressing it calls `downloadText` with `backupFileName(now)` and `writeBackup({ "combi-codes": exportCodes(entries) }, now)` (spy the module); As text shows that JSON in a read-only `<textarea>` with Copy; with no entries, `nothingSaved` and neither action.
- [ ] **Step 2–4:** Run, implement, pass. **Step 5:** Commit `feat(settings): storage use and back up`

### Task 8: `RestoreBox`

**Files:** Create `src/components/organisms/RestoreBox.svelte`; Test `tests/components/organisms/RestoreBox.test.ts`

**Interfaces:** props `store: Storage`, `m: Messages`, `onrestored: (entries: SavedCode[]) => void`. A start step: From the clipboard, Choose a file, From a link, Paste by hand. The link step and the paste step each have Back. Any text → the preview step: `found(...)` (with `foundIn(name)` for a file or link), skipped entries with reasons, `newer`/`notBackup`/`foundNone` when nothing reads, and Restore only when `fresh > 0`. Restore → `importSaved`; `stored: false` shows `notStored`; else `restored(added)` and `onrestored(entries)`.

- [ ] **Step 1: Write the failing tests** — clipboard JSON previews "Found 2 codes: 1 new, 1 already saved" and Restore leaves storage with 2; clipboard missing goes to the paste step with `clipboardMissing`; pasted junk shows `notBackup` and no Restore; a file `change` with a `.json` `File` previews it named by the file; the link step's Restore is disabled for `"nodot"` and enabled for `pastefox.com/206br1`, Enter submits; a link whose fetch throws shows `link.unreachable` and keeps the address; a gist 404 shows `link.platform.missing("GitHub Gist")`; a refusing storage shows `notStored`; an old text export restores.
- [ ] **Step 2–4:** Run, implement, pass. **Step 5:** Commit `feat(settings): restore from the clipboard, a file, a link or by hand`

### Task 9: `DeleteAllBox`

**Files:** Create `src/components/organisms/DeleteAllBox.svelte`; Test `tests/components/organisms/DeleteAllBox.test.ts`

**Interfaces:** props `store: Storage`, `count: number`, `m: Messages`, `ondeleted: () => void`. `deleteWarning(count)`, an input labelled `deletePrompt(word)`, a danger button disabled until the trimmed, lower-cased input equals `m.settings.data.deleteWord`. Press → `clearSaved`; `stored: false` → `notStored`; else `deleted(count)` and `ondeleted()`. With `count` 0, `nothingSaved` only.

- [ ] **Step 1: Write the failing tests** — Review Focus 5 in both languages; pressing clears storage to `[]`; a refusing storage keeps the entries and says `notStored`.
- [ ] **Step 2–4:** Run, implement, pass. **Step 5:** Commit `feat(settings): delete all, after a typed word`

### Task 10: Settings puts it together, About in place

**Files:** Modify `src/components/organisms/SettingsApp.svelte`; Tests `tests/components/organisms/SettingsApp.test.ts`

**Interfaces — Consumes:** Tasks 6–9. `SettingsApp` reads `localStore()` once (an in-memory store when there is none, as `CombiApp` does), holds `entries = readSaved(store)`, and refreshes them and a `refresh` counter after `onrestored` / `ondeleted`. Sections in order: Appearance; Combi codes data (Storage with its usage as `value` and the bar as `aside`, Back up, Restore, Delete all); About (a `SettingsRow` whose `value` is today's summary and body today's `<dl>`). `Panel` is no longer imported.

- [ ] **Step 1: Write the failing tests** — the four data rows and About are buttons with `aria-expanded`; pressing About shows Environment in place and there is no `dialog`; restoring through the box updates the Storage row's code count; the existing About tests move from the dialog to the region.
- [ ] **Step 2–4:** Run, implement, pass. **Step 5:** Commit `feat(settings): the combi codes data section, and About in place`

### Task 11: docs, checks, screenshots

**Files:** Modify the spec (owner's changes of 2026-11-25: rows in place, JSON backup, link restore), `AGENTS.md` (components, `backup.ts`, `backup-link.ts`, `download.ts`, `combi/backup.ts`; the redesign is complete), `README.md`, `.claude/skills/project-components/SKILL.md` (the in-place row).

- [ ] **Step 1:** Update the docs.
- [ ] **Step 2:** `pnpm run format && pnpm run check && pnpm run test && pnpm run build` — all pass.
- [ ] **Step 3:** Serve `dist/`; in Chrome at 390 and 1440px open each row, back up as text, paste it back (found 0 new), delete all with the word, restore by paste, restore an old text export; no sideways scroll, no dialog.
- [ ] **Step 4: Commit** `docs: back up and restore, and Settings rows that open in place`
