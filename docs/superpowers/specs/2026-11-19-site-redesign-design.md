# Site redesign on the Astro template

The owner's design, worked out across fourteen clickable prototypes. The last one
is `.superpowers/brainstorm/64427-1795058759/content/prototype-v14.html`, which
is git-ignored and local to the owner's machine. This document turns it into
something a builder can plan from. Where this document and the prototype
disagree, this document wins: the prototype fakes codes, names and data.

## Why

The owner uses the site mostly on a phone, and mostly to **pull up a saved code**
to type into the game; building a new code comes second. Today's combi page puts
the code panel, a note, five stat inputs and a summary above the controls, keeps
saved codes in a drawer, and clips at 390px wide. The owner's words: it "feels
cluttered" and is "awkward on a phone".

Moving the site to `cr-tools.kc.in.th` also lost every saved code, because
localStorage belongs to one domain and the page had no visible backup path. The
codes were recovered by hand from the browser's files. Backup and restore are now
first-class.

The owner also wants the project on their own `bun-astro-template`, rendered in
the browser (no server rendering), with Svelte for the interactive parts.

## Goals

1. Saved codes are the combi page's main content. Copying one takes one tap.
2. Building or editing a code happens in a panel, so the list stays the page.
3. The site works at 390px with nothing clipped, and uses the room on wide
   screens.
4. Thai and English, Thai by default.
5. A Settings page holds appearance, the data tools and build details.
6. Run results are logged per round, with averages.
7. Saved data can be backed up as a file or as text, and restored from the
   clipboard, a file or a link.
8. The non-production builds say what they are, at a glance.

## Non-goals

- **No change to the combi wire format.** The codec, its character tables, the
  loadout grammar and the full-code form stay exactly as they are
  (`src/routes/combi-name/codec.ts`, `catalog.ts`, `loadout.ts`,
  `full-code.ts`). Their tests carry over.
- **Game item names stay in English** in both languages: cookies, pets,
  treasures, boosts, cookie powers and episodes. They come from cookierunhub.com,
  which has English names only. The owner was asked and did not ask for Thai
  names.
- No accounts, no server, no sync. Data stays in the browser.
- No new tools. The sidebar is built to hold more, but none is added.

## Anti-goals

These would make the work a failure even if every feature exists:

- A shared link or a backup made today stops opening.
- Saved codes in a visitor's browser are lost or silently changed by the move.
  This includes old stats ranges, which must convert (see Rounds).
- The phone layout clips, or needs sideways scrolling.
- The site starts rendering on a server, or ships a Worker that fetches
  arbitrary URLs.

## Constraints

- **Template.** `kamontat/bun-astro-template` and its `GET_START.md`: Astro 7 with
  `output: "static"`, Vitest with happy-dom, `astro check`, Biome with
  `@kcconfigs/biome`, mise-pinned Bun, components as `.astro` files in
  `atoms/`, `molecules/` and `organisms/` enforced by
  `tests/components/atomic.test.ts`, its own CI workflows and its own skills.
- **Rendering in the browser.** Astro renders the page frame at build time.
  Every part that reads localStorage or reacts to input is a Svelte component
  loaded with `client:only="svelte"`. Nothing runs on a server.
- **Svelte.** Through `@astrojs/svelte`. Component tests use
  `@testing-library/svelte` on Vitest.
- **Hosting is unchanged:** Cloudflare Workers static assets, `wrangler.jsonc`
  worker `cr-tools` on `cr-tools.kc.in.th`, preview aliases
  `pr-<n>-cr-tools.kcinth.workers.dev`, Google Tag Manager in production only.
- **Old URLs keep working.** Shared links today look like
  `/combi-name/#CODE?note=…&money=12000-15000`. The template's defaults
  (`build.format: "file"`, `trailingSlash: "never"`) would serve
  `/combi-name`. Either keep `build.format: "directory"`, or redirect
  `/combi-name/` to `/combi-name`, **keeping the hash** (a redirect cannot see
  it, so it must be a client-side redirect or the folder form). The builder
  picks; old links must open the right code with its note and stats.
- **Storage keys.** Today's keys are `combi-name:saved`, `combi-name:code`,
  `combi-name:full-code`, `combi-name:saved-sort`, `combi-name:tab` and
  `combi-name:drawer-width:*`, plus `theme`. The redesign reads `theme` as it
  is, and reads `combi-name:saved` once to convert it (see Rounds). The others
  may be dropped or replaced.

## Approaches considered

**Stack (owner's choice).** Three ways to draw the interactive parts were
weighed:

- Astro components and plain TypeScript scripts. Fits the template's rules
  exactly, but the editor and run log need a lot of hand-written update code.
- Astro for the frame, Preact islands. Small, app-like, with signals for state.
- Astro for the frame, Lit custom elements. Closest to today's code, but outside
  the template's `.astro` component rules, and every component is redrawn for
  the new design anyway.

The owner picked a fourth: **Astro components plus Svelte**. Svelte compiles
away, its stores fit the shared state here (saved list, settings, the open
editor), and `.svelte` files sit naturally beside `.astro` ones in the atomic
tiers.

**How to get there.** Port today's Lit pages to Astro first and redesign after,
or build the new design directly on the template. Porting first means building
the old interface twice, so the **new design is built directly on the
template**. The work lands as several pull requests into a long-lived
`redesign` branch, each with its own preview. `main` keeps serving today's site
until the combi page is complete, then `redesign` merges into `main` in one go.

**Navigation.** A top-bar tool switcher (today), top-bar links, and a left
sidebar were mocked. The owner chose the **left sidebar with a ☰ toggle**.

**Combi page shape.** "Saved first" with Saved/Build tabs at the bottom, and
"builder first" with a Saved drawer, were mocked. The owner moved past both to
**the list as the page and the editor in a panel**.

## The design

### Look

Simpler than today's arcade look: 1px borders, 8–10px rounded corners, no block
shadows, one pink accent (`#ff3d7f` dark, `#d81b60` light), quiet surfaces.
Monospace is used only for codes, which keep the yellow code colour. Labels are
normal sentence case, not spaced capitals, which also keeps Thai readable. Choices
use segmented buttons; tabs are pills. Dark is the default, with a light
variant; theme is System, Dark or Light. Exact values are in the prototype's
CSS and are the builder's to refine.

### Frame (every page)

- **Top bar:** ☰, the page name, and nothing else site-wide.
- **Environment line:** a 3px line under the top bar. Blue for Development,
  purple for Local, amber for Preview, none for Production. In Preview only, a
  `pr-<n>` badge sits after the page name. Colours are the builder's call
  (these were proposed and not objected to).
- **Left sidebar:** Home, then each tool (icon and name; the current one
  marked), and ⚙ Settings pinned to the bottom. No footer: what was in it moved
  to Settings → About.
  - Desktop (1100px and up): ☰ switches between the full sidebar and a
    60px icon rail.
  - 700–1100px: always the rail; ☰ opens the full sidebar over the page.
  - Phone (under 700px): hidden; ☰ slides it in over the page with a scrim.
  - Open or closed is remembered per browser.

### Pop-ups

All secondary content opens in one kind of pop-up:

- **Phone:** a sheet sliding up from the bottom, rounded top, grab handle,
  up to about 92% of the height.
- **Larger:** a panel sliding in from the right, over a scrim.
- **Resizable** on larger screens by dragging its left edge: the editor between
  360px and 70% of the page width, other panels up to 60%. Each width is
  remembered per browser, as today's `drawer-width.ts` does.

### Home

A short title and one-line intro, **Saved codes** (the latest three, each with
Copy; "See all" goes to the combi page; hidden when there are none), and the
tools as cards. On wide screens the saved codes lay out as a grid.

### Combi page

The page is the **saved list**:

- **Top:** `+ New code` first, then search, then a goal filter (All goals,
  Score, Money, Exp, Box) and a sort (Newest, Oldest, Highest average money,
  Code A–Z). On a phone, New code and search span the width and filter and sort
  share a row.
- **Rows:** the 10-character game code large, then the loadout **as icons**
  (owner's choice, not names): cookie, pet (round), a divider, and one icon
  per treasure slot. A slot that accepts several treasures shows the first with
  a `+n` badge; every icon's name is its `alt` and tooltip. Two entries can
  share the same 10 characters with a different loadout, and the recovered data
  already has one such pair (Episode 253 and 2608, which differ only in
  treasures), so the icons are what tell them apart. Then the note (or goal),
  average money with the round count, **Share** (↗) and **Copy**. On desktop the
  list is a table with columns for code, loadout icons, note, goal, average
  money, rounds and saved date. The icons are the combi page's static
  `/assets/...` files, not inlined (see the `assets` and `build-and-deploy`
  skills).
- **Copy always copies the 10 characters**, the part typed into the game.
- **Share** opens a pop-up with two ways to hand the code on, each with its own
  Copy button and the value shown in full:
  - **Link:** today's share link (code, note and rounds), plus "Share to app"
    through `navigator.share` where the browser has it.
  - **Full code:** the loadout and the 10 characters, which "Type a code" reads
    back with cookie, pet and treasures.
  This replaces today's "Show full code" setting (`combi-name:full-code`).
- Search matches the full code, the cookie and pet names, and the note.
  "Code A–Z" sorts by the 10 characters, then the full code. Filtering and
  sorting are the builder's to extend (episode, for one) without asking.

**The editor** opens from New code or a row, in the pop-up:

- Header: "New code" or "Edit code", and ✕.
- The 10-character code, large, with a one-line summary and the full code in
  small type under it.
- Tabs: **Main** (mode, goal, episode, floor for the tower, starting action),
  **Cookies** (cookie, relay, pet), **Treasures**, **Boosts** (boosts, random
  boost, cookie power+), **Run log** (note and rounds). Each control writes
  the same field it writes today; this is a re-skin of the current controls,
  not a new data model.
- **Help by field:** a small `?` after each field label (Mode, Goal, Episode,
  Starting action, Cookie, Treasures, Boosts, rounds, and any other field)
  toggles a short explanation under the label, in the current language. It
  replaces today's help drawer. The slot numbers live in these explanations.
- Footer, always visible: **Copy** (the 10 characters), **Share** (the same
  pop-up as a row's), **Save** (or **Update**), and **⋯** with Type a code and
  Reset.
- **Wide screens (1400px and up):** the editor docks beside the list instead of
  covering it, so the list stays usable while it is open. It keeps its
  resizable width.

### Settings

A short page of rows; each data row opens a pop-up.

- **Appearance:** Language (ไทย, English) and Theme (System, Dark, Light),
  switched in place.
- **Combi codes data:**
  - **Storage** row: `<used> / <limit> (<percent>)` and a bar, for this site's
    localStorage. Its pop-up shows counts (saved codes, rounds logged, codes
    with rounds, codes with a note, first and last save date), localStorage use
    against the limit, and total site storage from
    `navigator.storage.estimate()` (usage / quota and percent). The
    localStorage limit is not reported by browsers; use 5 MiB and say it is
    approximate. Show "not reported" when the estimate is unavailable.
  - **Back up**, **Restore**, **Delete all** rows (below).
- **About:** one row showing the environment (and the short commit where there
  is one); its pop-up holds the list:

  | Item | Development | Local | Preview | Production |
  | --- | --- | --- | --- | --- |
  | Environment, as one word | ✓ | ✓ | ✓, plus `pr-<n>` | ✓ |
  | Built, in the viewer's time zone | – | ✓ | ✓ | ✓ |
  | Source, linking the repository | ✓ | ✓ | branch and `#<n>` | ✓ |
  | Commit, linking it | – | – | ✓ | ✓ |
  | Changelog | – | – | – | ✓ |

  "Built" follows the current language's date format. "Changelog" links
  `CHANGELOG.md` on GitHub.

### Language

Thai and English for every interface string, Thai by default, chosen in
Settings and remembered per browser. Strings live in one typed catalogue per
language, and a test fails when a key is missing from either. The `lang`
attribute on `<html>` follows the choice. Item names stay English (Non-goals).
A saved note is never translated. Today's labels in `labels.ts`,
`describe.ts` and `hints.ts` move into the catalogue where they are interface
text.

### Rounds

The run log replaces the single stats entry with a list of **rounds**. Each
round holds score, money, exp, boxes and time, all optional. The editor shows
them as a table with **+ Add round**, ✕ per round, and an **Average** row that
counts only filled-in values. The list shows the average money and the round
count.

- **Conversion of saved data (owner's choice):** an old entry with ranges
  becomes **two rounds**, one with every range's minimum and one with every
  maximum. Time, which was never a range, goes into both. A field that was a
  single value (min equals max) appears in both rounds. An entry without stats
  gets no rounds. Conversion happens when the entry is read, so old backups and
  old share links convert the same way.
- *Writer's call:* an entry whose stats hold **no range at all** (every field a
  single value, or only time) becomes **one** round, not two identical ones, so
  the round count does not claim runs that never happened.
- *Writer's call:* converted entries are written under a **new key**,
  `combi-name:saved:v2`. On first load, when the new key is absent, the old
  `combi-name:saved` is read, converted and written to the new key; the old key
  is left untouched and never written again. Rolling back to today's site then
  shows the codes as they were at the move, rather than every stat dropped
  (today's `readStats` discards fields it does not know). Codes saved after the
  move do not appear on a rolled-back site; that is accepted.
- **Share links** must still read today's `money=12000-15000` form, as above.
  How new links carry several rounds is the builder's call, as long as the old
  form still reads.
- **Backup text** likewise: today's export format must still import.

### Back up and restore

- **Back up:** **Download file** (a `.txt` in today's export format,
  extended for rounds) or **As text** (the same text in a box with Copy).
- **Restore:**
  - **Clipboard:** reads `navigator.clipboard.readText()`. When the browser
    refuses, the pop-up says so and shows a paste box instead.
  - **File:** a file picker.
  - **Link:** a URL that serves backup text, such as a GitHub Gist. The page
    fetches it from the browser. A gist page URL is turned into its raw URL (or
    read through the Gist API) automatically. Sites that block cross-site reads
    (Pastebin, as far as known) fail with a message that says why and offers the
    paste box. **No proxy:** the Worker stays static, so it cannot be used to
    fetch arbitrary pages through the site's domain.
  - Every path shows what was found before anything is added ("Found 3 codes:
    2 new, 1 already saved"), then restores. Restoring merges into the existing
    list and skips codes already saved, as today's import does.
- **Delete all:** a pop-up that explains it cannot be undone and asks for a
  typed confirmation word ("delete", or "ลบ" in Thai).

### Build information (CI)

Today the build inlines only `BUN_PUBLIC_COMMIT_SHA` and `BUN_PUBLIC_BUILT_AT`.
The template uses Astro's `PUBLIC_*` variables. The builder adds:

- the environment: `development` under `astro dev`, `local` for a build with no
  CI values, `preview` and `production` from the two deploy workflows;
- for previews, the PR number (`github.event.number`) and the head branch
  (`github.head_ref`);
- the commit and build time, as today.

`src/lib/build-info.ts` and its tests carry over and grow these fields.

## Order of work

Each piece is its own pull request into `redesign`, with a preview link, and its
own short plan. Pieces 4 and 5 do not depend on 3.

1. **Template and frame.** Move the repository onto the template (tooling, CI,
   skills, `AGENTS.md`, `@astrojs/svelte`, the atomic-tier test extended to
   `.svelte`), carry over the framework-free modules and their tests, keep old
   URLs working, and build the frame: look, sidebar, pop-up, Settings with
   Appearance and About, the environment line and badge, and the CI build
   information.
2. **Language.** The catalogue, Thai and English, Thai by default, for the frame
   and every string the combi page will need.
3. **Combi page and home.** The saved list with new, search, filter and sort;
   the editor with its tabs, field help and footer; the docked wide layout; and
   the home page.
4. **Rounds.** The data model, conversion, share-link and backup reading, and
   the run-log table.
5. **Back up and restore.** The Settings data pop-ups: storage, back up,
   restore (clipboard, file, link) and delete all.

When all five are in `redesign` and the owner approves its preview, `redesign`
merges into `main`.

## Left to the builder

- Exact colours, spacing and type sizes, within the look above.
- Whether old URLs are kept by folder output or a client-side redirect.
- How new share links encode several rounds.
- Which Svelte store shapes and component boundaries to use, within the atomic
  tiers.
- Extra filters or sorts on the saved list.
- Wording of messages and help text, in both languages, within the meaning
  above.
