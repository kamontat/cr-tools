# Changelog

What changed in this project and why, newest first.

## 2026-11-25: Clean-ups after the redesign

### Improvements

- Share, Back up, Restore and Delete all share one button style, which shows a focus ring
  for keyboards.

### Bug fixes

- Between 641 and 1099px the editor in place of the saved list stopped at 640px; it now
  fills the page.
- Restore's main button keeps its colour on hover; it had turned light on light.

### Decisions

- The pop-up mode of panels is gone, with its focus trap: since the editor became a view
  and Settings opens in place, nothing used it.
- The old text export is gone; old text backups still restore.

## 2026-11-25: Back up and restore, in Settings

### Features

- Settings has a Combi codes data section (ข้อมูลโค้ดคอมโบ) with Storage, Back up, Restore
  and Delete all. Every row, About included, opens in place under itself.
- Storage shows this site's use against an approximate 5 MB, the saved codes, rounds, codes
  with rounds and with a note, the first and last save, and the site's whole storage.
- Back up downloads one JSON file for the whole site, `cr-tools-YYYY-MM-DD.json`, with
  `combi-codes` first, then `version` and `exportedAt`, or shows the same JSON as text with
  Copy.
- Restore reads from the clipboard, a file, a link or text pasted by hand. It shows what it
  found ("Found 3 codes: 2 new, 1 already saved") and any skipped entries before adding
  anything, then adds the new codes and skips those already saved. Old text backups,
  stat lines included, still restore.
- A link is read in the browser: one typed without `https://` works, and GitHub Gist and
  PasteFox share pages are read from their raw address. A failure says why (unreachable,
  not found, private, an error status, not a backup), keeps the address, and writes nothing.
- Delete all clears the saved codes after the word ลบ (delete) is typed; language and theme
  stay.

### Improvements

- Restored codes keep their save dates, and the list stays newest first.

### Decisions

- A backup is JSON with a field per tool, so later tools add theirs to the same file.
- One bad entry in a backup is skipped and named, not a reason to refuse the file:
  restoring only adds, so a partial restore loses nothing.
- Settings' rows open in place, as Share does on the combi page; the site has no pop-ups.

## 2026-11-25: One page title, and room for the editor's title on a phone

### Bug fixes

- A page's title shows once, in the top bar, which is now the page's heading. Home, the
  combi page and Settings repeated it under the bar.
- On a phone the editor's title has its own line with ←, and Copy, Share, Save and ⋯ take
  the row under it; the buttons had squeezed the title to one letter.

## 2026-11-25: Every treasure shows its kind

### Features

- A base, evolved or blessed treasure is framed in grey, green or gold, with N, E or B on
  its corner, in the picker, the editor's treasure slots and a saved row. An evolved
  treasure and its blessed form share a picture, so the picker's cells for them now differ.
- Where names show, the kind is written under the name in its colour: พื้นฐาน, วิวัฒน์ or
  ได้รับพร (Base, Evolved or Blessed).

### Improvements

- A saved row's treasures are square-framed like the picker's, base ones included, instead
  of round with a ring only for evolved and blessed ones.

## 2026-11-25: Saved codes keep rounds, with their averages

### BREAKING CHANGES

- A saved code keeps the rounds it was played instead of one set of ranges, stored under
  `combi-name:saved:v2`. The old list (`combi-name:saved`) is read once and converted, and
  is never written again, so a page from before this change no longer sees new saves.
- Share links carry one `round=` per round (`round=:12000::3:245`, values in the order
  score, money, exp, boxes, time). Old links with `money=12000-15000` still open, their
  ranges read as rounds.

### Features

- The editor's Run log tab is a table: a row per round with score, money, exp, boxes and
  time, a ✕ per round, + Add round, and an Average row under it.
- The saved list shows each code's averages and how many rounds it has; the money sort
  uses the average money.
- Backup text writes a `round: score=50000 money=12000` line per round, and still reads
  the old `money: 1200-1500` lines.

### Improvements

- Every average is a whole number, like every stat.

### Bug fixes

- A pasted link from before rounds followed by an old stat line keeps the link's stats;
  the two read as one set, field by field, as they did before.

### Decisions

- An old range becomes two rounds, its minimums then its maximums; stats with no range
  become one round. That keeps the old range's middle as the new average.

## 2026-11-24: The combi editor as a view of the page, with Share in place

### Features

- Below 1100px the editor replaces the saved list instead of opening as a pop-up or a
  bottom sheet, with a ← Back to saved codes; the browser's Back closes it too, and the
  list comes back where it was scrolled. From 1100px it sits beside the list, which keeps
  room for its rows however wide the editor is dragged.
- Share opens in place: under the editor's header, or inside an open saved row. Each has
  the share link and the full code with their own Copy, and Share to app where the browser
  offers it. The combi page has no pop-ups.
- The treasure order is one switch, Exact order, beside the Treasures label, instead of a
  row of its own.

### Improvements

- The combi page uses the whole width from 1100px screens.
- An open saved row's details start a step below its head, clear of its hover colour.

### Bug fixes

- The Share box's parts are spaced apart; they ran together.

### Decisions

- Nested pop-ups, sheets and side panels are gone from the combi page: the editor is a
  view of the page and Share opens where it was pressed (the owner's change of
  2026-11-22, recorded in the design).

## 2026-11-21: The combi page as a saved list, with an editor pop-up

### Features

- The combi page is the saved list. New code, a search (full code, cookie and pet names,
  note), a goal filter and a sort (newest, oldest, highest average money, code A–Z), with
  the filter and sort remembered in this browser.
- A closed row shows the cookie with its pet, the 10 characters, the mode and goals, the
  episode and the saved stats (score, money, exp, boxes, time).
- Pressing a row opens it, and several can be open at once. An open row lists Run, Results,
  Team, Treasures, Boosts, Random boost, Cookie power+ and Note as icon lines; pressing a
  line's pictures shows its names, and its › opens the editor on that tab. A treasure slot
  shows its first treasure and `+N` for its alternatives until pressed, and evolved and
  blessed treasures carry an E or B ring.
- The editor shows the 10 characters large with a summary and the full code (tapping part
  of the code jumps to its control), and five tabs: Main, Cookies, Treasures, Boosts and
  Run log, each field with a `?` help. Copy, Share, Save or Update and a ⋯ menu (Type a
  code, Reset, Save as new, Delete) sit top right. At 1400px and up it docks beside the
  list; below that it is a pop-up, and a bottom sheet on phones.
- A Share pop-up gives the share link and the full code, each with its own Copy, and Share
  to app where the browser offers it.
- Pasting a code anywhere on the page opens it, and old share links
  (`/combi-name/#CODE?note=…&money=…`) open with their note and stats.
- Home shows the latest three saved codes, with Copy and See all.
- Pop-ups stack (Share over the editor), lock the page behind them, and can dock.

### Improvements

- The combi page is up to 1100px wide from 700px screens.
- The code reader's warnings and errors are ids worded from the Thai and English
  catalogues; the English wording and the code format are unchanged.
- Notices show above pop-ups and are announced to screen readers.
- In Thai, an episode is ด่าน.

### Bug fixes

- Images keep their size while they load, since the reset's `img { height: auto }` had
  overridden their `width` and `height`, and every form field has a `name`; Chrome's issue
  report is empty on every page.

### Decisions

- Unsaved edits are never replaced without asking: paste, another row, New code or a link
  is refused with a notice.
- Picks an episode cannot use are kept in the editor and come back when the episode does;
  the code carries only what the episode allows.
- Until rounds arrive (piece 4), the Run log tab keeps the five stat boxes and "average
  money" is the middle of the saved money range. Back up and restore come with piece 5.
- Delete asks for a second press and has no undo, as on the old page.

## 2026-11-20: Thai and English, Thai by default

### Features

- The site speaks Thai and English. Thai is the default; Settings → Appearance has a
  ไทย / English switch that changes the page in place and is remembered in this browser.
  The page title, the ☰ button's name and the About panel follow it, and so does going
  Back to a page seen before the switch.
- Settings' About shows its build time in the chosen language, with Thai months and the
  Gregorian year (2026).
- The combi reader's interface words — goals, modes, actions, field names, "None", "Any
  goal" — come in both languages, ready for the combi page, along with that page's list,
  editor and share labels and a short help text for each field.

### Improvements

- Every interface string lives in one typed catalogue per language
  (`src/lib/i18n/en.ts` and `th.ts`); a key missing from either fails `astro check` and a
  test.
- An English visitor never sees Thai first: a script in `<head>` picks the language before
  the page paints, and the hidden language is removed from screen readers and copy-paste.
- The language buttons carry their own `lang`, so a screen reader says each in its own
  voice.
- A code set to any episode now reads "Any episode" rather than "Any", matching "Any goal"
  and "Any floor".

### Decisions

- Item names stay English in both languages (cookies, pets, treasures, boosts, cookie
  powers, episodes), as cookierunhub.com names them.
- Static pages ship both languages and CSS hides one, rather than swapping text in script,
  so nothing flashes and pages work before JavaScript runs.
- The combi reader's warning and error sentences, and the saved list's sort and filter
  words, stay English until the combi page is rebuilt; nothing shows them yet.

## 2026-11-20: The new frame, Home and Settings

### Features

- Every page sits in one frame: a top bar with ☰ and the page title, and a left sidebar
  linking Home, each tool and Settings. On wide screens (1100px and up) the sidebar is open
  beside the page and remembers being closed; from 700 to 1099px it is an icon rail that
  opens over the page; on phones it is a drawer that slides in with a dimmed backdrop.
- Previews mark themselves: an amber line under the top bar and a `pr-<number>` badge.
- A pop-up panel for details and editors: it opens from the right on larger screens, where
  its left edge drags (or arrow-keys) to resize and the width is remembered per panel, and
  slides up from the bottom on phones. Escape, the close button or the backdrop close it.
- Settings has a theme switch (System, Dark, Light), applied before the page paints, and an
  About row that opens the build details: environment, build time with its time zone, the
  source (a preview links its pull request) and the commit.
- Home shows the site's title, a one-line intro and a card for each tool.

### Decisions

- Dark is the default look; light follows the system or the Settings choice.
- Labels are sentence case with no letter spacing, so Thai text keeps its marks in place; a
  test refuses spaced capitals in any stylesheet.
- While the window is being resized the sidebar does not animate, so it never slides across
  the page as the width crosses a breakpoint.

## 2026-11-20: Redesign groundwork on the Astro template

### BREAKING CHANGES

- The project no longer runs on Bun. Install with `pnpm install` and run every script with
  `pnpm run <script>`; `package.json`'s `devEngines` pins Node.js 24.22.3 and pnpm 12.22.0,
  and `mise` reads them from there.
- The Lit components and `src/routes/` are gone. Pages live in `src/pages/` as Astro files,
  and interactive parts are Svelte. On the `redesign` branch the three pages are
  placeholders until the next pieces fill them in.
- The combi logic moved from `src/routes/combi-name/` to `src/lib/combi/`, imported as
  `#lib/combi/<module>`.

### Features

- Every build records its environment (Development, Local, Preview or Production), commit,
  build time, and on previews the pull request number and branch, for the coming Settings
  About list.

### Improvements

- The site is built on [ktemplates/astro](https://github.com/ktemplates/astro): Astro 7 with
  static output, Svelte 5, Vitest, `astro check` and Biome. Pages build to folders
  (`/combi-name/`), and `/combi-name` redirects there, so links already shared keep opening.
- Icons ship from `public/assets/` and are served at `/assets/...`, not inlined into the
  page. The favicon is Fairy Cookie again.
- CI installs with the pinned Node.js and pnpm and refuses a lockfile that does not match
  `package.json`.
- Agent docs and skills (`project-*`) describe the new layout.

### Decisions

- The combi wire format did not change: the codec, catalog, loadout and full-code modules
  moved as pure renames, and the exhaustive round-trip test over every combi still passes.
- Node.js and pnpm replace Bun to follow the template, because Astro, Vitest and Wrangler
  target Node.js and a second runtime only added friction.
- The asset scripts import each other through a new `#scripts/*` alias, because plain Node.js
  does not resolve extensionless relative imports and imports never carry `.ts`. A test keeps
  `src/` from importing it, so scraper code never reaches the site.

## 2026-11-20: Ube Ice Cookie and new treasures in the loadout picker

### Features

- The loadout picker offers the cookie, pet and 11 treasures cookierunhub.com added since the
  last sync, Ube Ice Cookie among them, with their icons. A few new treasures carry the
  site's own placeholder names (`Game Item 3a53490795`) until it publishes real ones.

## 2026-11-16: The site moves to cr-tools.kc.in.th

### BREAKING CHANGES

- The site is now served at `https://cr-tools.kc.in.th`, not `https://cookierun.kc.in.th`.
  Saved codes, the theme choice and the drawer width live in the browser per domain, so they
  do not follow: copy any saved code from the old address before it goes away.

### Improvements

- The project is named `cr-tools` throughout: the Cloudflare Worker, the package, the GitHub
  repository the footer's commit links open, and the preview URLs
  (`https://pr-<number>-cr-tools.kcinth.workers.dev/`).
- A test holds both deploy workflows' hand-written URLs to the Worker name in
  `wrangler.jsonc`, so a later rename cannot miss one.

## 2026-11-06: Update waits for a change, and saved codes sort by episode

### Features

- The Saved drawer sorts by Episode: Episode 1-7, then Special Episode 1-3, then Special Exp
  Episode. Any episode, and a code that no longer reads, come after every episode.

### Improvements

- While a saved entry is open, Update shows only once the code, the note or a stat differs
  from what is saved, and hides again when the change is undone. After Save as new both
  buttons hide, so focus moves to Reset.

### Decisions

- A stat box that does not read counts as a change, so Update is there to click and name
  the error rather than hiding it.

## 2026-10-28: A new combi code layout read letter by letter, and several goals per run

### BREAKING CHANGES

- The combi code has a new layout, and no code written before it decodes — saved codes and
  links included. Rebuild a build on the page and save it again. A code in an earlier layout
  is refused at slot 1, since `0`, `1` and `H` are no longer modes.
- The version character left the ten game characters. A full code now always opens with it,
  so a build with no loadout is `1-MS0A000000` in links, saved codes and exports, where it was
  the bare code before.
- `Combi.goal` is now `Combi.goals`, a set. `encode` throws on a set no code can say: Score
  beside another goal, or no goal at all.
- The Any goal is gone; every run aims for at least one goal.

### Features

- A run can aim for more than one goal. A manual run aims for Score, or for 1-3 of Money,
  Exp and Box; an auto run for 1-3 of Money, Exp and Box. Several goals read as
  "Money + Exp" in the summary, the code's hints and the saved rows, and the Saved drawer's
  goal filter matches a run on any one of its goals.
- `<chip-group>` has a `multiple` mode — checkbox chips, read and written through `values`,
  where the last chip on stays on — and an `exclusive` list of values that stand alone.

### Improvements

- The game code reads slot by slot: `M`, `A`, `S` or `J` for the mode, where `J` is a
  semi-auto run that jumps at the start, so the action slot is gone; two characters for the
  goals (`S0`, `M0`, `X0`, `B0`, `MX`, `MB`, `XB`, `AA`); `A` for Any episode; and two
  characters for the random boost (`2C`, `BS`, `HD`, `RV`, `CC`, `17`, `GC`, `CO`, `PO`,
  `MA`, `PL`, `00` for none).
- In the boost slot, HP Extension with Power Jelly is `2` and with Double XP as well `3`; the
  other pairs and triples take the characters left over.
- A whole cookie power+ group is `A`, so all seven read `AAA` rather than `411`.
- On Special Episode 2 the floor is slots 5-7, with `000` after it.
- The exhaustive test walks 10,621,776 combis to 5,310,888 codes, about 30s each, under a
  300s timeout.

### Decisions

- Every layout change here broke old codes rather than bumping the version or reading the old
  layout alongside: one layout to read and document was preferred over a migration path.
- Score stands alone among the goals, and an auto run never aims for it, because Score is
  played by hand; only the eight sets a run actually aims for have characters.
- The version lives only in the full code: the game field's ten characters are all spent on
  the run, and a bare code copied back out of the game is read as the current version.

## 2026-10-27: Saving opens the new entry, the code panel's buttons regrouped, sort and filter for saved codes, Delete all, and a Score stat

### Features

- `<code-bar>` has an `editable` property, beside `copyable`: set it to `false` to drop the
  bar's own Edit button for a page that opens the editor from somewhere else.
- The Saved drawer has **Sort by**: Newest, Oldest, Most money, Most exp, Most boxes and
  Longest. A stat sort ranks by the top of a range, then its floor, and puts entries without
  that stat last. The pick is remembered in this browser under `combi-name:saved-sort`.
- The Saved drawer can be filtered: a search box that needs every word somewhere in an entry's
  note, code or run, and Mode, Goal and Episode selects that offer only the values the list
  holds. **Clear** resets them, and the drawer says when nothing matches.
- The Saved drawer ends with **Delete all**, which empties the list after asking on the page:
  the question names how many codes go and suggests exporting first, and replaces the button
  until it is answered. Focus starts on **Keep them**. Confirming closes the entry open for
  editing, if any. The button hides while the list is empty.
- A saved code takes a **Score** stat, first of the five: a positive whole number or a range
  like `1200000-1500000`. It shows on the row's stats line, rides in a shared link as
  `&score=…` and in exported text as `score: …`, and the Saved drawer sorts by
  **Highest score**.

### Improvements

- **Save** no longer empties the note and stats. The entry it just added opens for editing,
  the way **Update** leaves one, so the panel reads **Editing saved code** and a second change
  is one more Update rather than a Load.
- The code panel's row is now the save actions and **Reset**: **Save** for a new code,
  **Update** and **Save as new** while a saved entry is open, then Reset and the ⋯ menu.
- The ⋯ menu holds **Edit code**, **Copy code**, **Copy link** and **Show full code**, plus
  **Cancel** while an entry is open. Edit left the panel's row for it.
- **New** is renamed **Save as new**, and saving through it opens the entry it adds.
- On a phone, the back-to-top button now focuses Save rather than the Edit that left the row.
- Below 48rem the stat boxes wrap to two rows — Score and Money a half each, then Exp, Boxes
  and Time a third each — rather than squeezing into one row until 26rem.

### Decisions

- **New** read as starting a blank code, but it saves the code on screen as an entry of its
  own; "Save as new" says that. "Duplicate" was rejected because it suggests copying the
  saved entry rather than what is on screen, and "Save copy" because it sits beside Copy code.
- Save and Update stay one button with a label that changes, so the row does not shift between
  modes. Cancel stays in the menu, as the one way to stop editing without resetting the build.
- Score is a range like Money and Exp, since a run's score varies as much as its coins. It
  comes first because it is the number a Score run is played for.
- Sorting and filtering change only what the drawer shows. The stored list, editing and export
  keep the saved order and every entry, so picking a sort never rewrites anyone's list. A
  manual reorder (move up and down) was offered and not chosen.
- The filter's Mode, Goal and Episode use the words a saved row's run chips use, so the
  choices match what the rows say. The filter is not remembered, unlike the sort, and the
  tools hide with fewer than two entries, clearing the filter so it cannot hide the last row.
- Delete all asks on the page rather than through `confirm()`, because a browser can switch
  its own dialogs off and then the question would answer itself. It deletes the whole list
  even while a filter narrows the drawer; the question states the full count.

## 2026-10-26: Resizable Saved and Help drawers on desktop, and a code panel that says whether you are editing, and the catalog synced from cookierunhub.com

### BREAKING CHANGES

- Every cookie, pet and treasure id a loadout carries changed. A loadout code written before
  this names different entries now, or none; only the ten-character combi section still means
  what it did. Rebuild saved loadouts by picking their cookie, pet and treasures again.
- The treasure `family` values are now `cookie`, `gacha`, `limited`, `pet` and `squirrel`;
  `consumable`, `draw` and `special` are gone from `assets/index.json`.
- `scripts/utils/cookierundb.ts` is removed, and `migrate` and `reconcile` are gone from
  `scripts/utils/asset-ids.ts`; `parseIndex` replaces `migrate` for reading the file.

### Features

- `bun run fetch:assets` and `bun run verify:assets` now read cookierunhub.com's encyclopedia
  through its JSON API, three requests in all. It is more up to date: 2 new cookies and about
  30 new treasures, for 96 cookies, 103 pets and 1,179 treasures.
- A loadout id is the entry's own number on cookierunhub.com in base 36, so treasure 50 is
  `01E` and its page is `/en/encyclopedia/treasures/50`. A blessed treasure, which the site
  keeps as a flag on its unblessed form, takes that number plus 23,328: `I1E`.

- On a wide screen with a mouse, the left edge of the combi page's **Saved** and **Help**
  drawers is a resize handle. Drag it, or focus it and press the arrow keys (Shift for bigger
  steps), to set the width anywhere from 288px to 90% of the window. Double-click it to go
  back to the default `22rem`.
- Each drawer remembers its own width under `combi-name:drawer-width:<id>`. A browser that
  refuses storage still resizes, and only forgets on reload.

### Improvements

- Inside a drawer, the sheet now scrolls instead of the dialog, so the resize handle stays
  on the drawer's edge however far the list has scrolled.
- The code panel's heading is now shown and reads **New code**, or **Editing saved code**
  while a saved entry is open, with the heading and the panel's edge in a dashed accent. The
  note's label is plain "Note"; it used to carry "new code" / "editing a saved code".
- **Update** no longer closes the entry: it stays open on its new code with the note and stats
  as typed, so a second change is one more Update rather than another Load.
- **Save as new** is now **New**, a button of its own beside Update in the code panel rather
  than an item in the ⋯ menu.
- Every cookie, pet and treasure icon is re-downloaded from cookierunhub.com, most as WebP, so
  the build ships `assets/**/*.{png,webp}`. The favicon is now `cookies/fairy_cookie.png`.
- The treasure picker offers every treasure, XP-Elixirs included: no family is hidden any
  more.
- A sync deletes icons no entry names, keeps the 12 treasures whose pictures the site lists
  but does not serve as `image: null` instead of failing, and saves the 8 Korean file names
  as `hub-<number>.png`.

### Bug fixes

- Saving an unchanged code "as new" overwrote the entry it was loaded from instead of adding a
  copy. **New** now shows only while the code on screen is one no entry holds.

### Decisions

- New is hidden for a saved code rather than refusing the save with a message: the list keeps
  each code once, so there is no copy it could make, and a button that cannot work is better
  not offered.

- The handle is only on a fine pointer at `48rem` and up. On a phone the drawer already takes
  90% of the screen, and a drag on its edge would fight the page's own swipe.
- The handle sits on the dialog rather than as a `position: fixed` child of the scrolling
  dialog: the fixed version left the mouse cursor stale over it.
- Ids moved to cookierunhub.com's numbers as a clean break, rather than keeping the old
  append-only ids behind a name-matching translation table. The site owns the numbering now,
  so nothing here assigns ids, and `verifyStructure` checks each id against its page url.
  `LOADOUT_VERSION` stays `1`.
- Treasure families follow the site's own categories rather than mapping them onto the old
  ones. Those categories put XP-Elixirs in `limited` beside equippable treasures, so the
  picker shows everything rather than hiding by name.
- Blessed ids are offset by half the 3-character space rather than prefixed with `B`, which
  would have capped the site's treasure numbers at 1,295.
- Every icon was re-downloaded rather than keeping the PNGs already on disk, so all of them
  come from one source.

## 2026-10-25: The workbench layout, with a top bar in place of the sidebar, and snackbar notifications, and run stats on saved codes, and the code as a character grid with saved rows that read as runs

### BREAKING CHANGES

- The sidebar is gone on every page. Navigation is now a tool menu in the top bar.
- The combi page's board and its fold are gone, and so is the `combi-name:board-collapsed`
  setting. The page no longer reads it.
- The `<entry-tile>` element is removed. Its shared styles and helpers (`tileStyles`,
  `glyphFor`, `lockPageScroll`) moved to `src/components/tile.ts`. Code that imports
  `#components/entry-tile` must import from `#components/tile` instead.
- `<build-summary>` has a new contract. It draws rows the page hands it (`rows`, `compact`,
  `hint`) and fires `summary-jump`. The old `verdict` and `collapsed` properties and its
  `toggle` event are gone.

### Features

- A top bar on every page. It holds the brand ("Cookie Run"), a tool menu that lists All
  tools and every registered tool with its tagline, the theme control (an icon on phones),
  and a slot for the page's own buttons. The combi page puts **Saved N** and **?** (Help)
  there.
- The combi page is laid out as a workbench, top to bottom: the code panel, the note, a
  summary of the build, and four tabs. The tabs are **Main**, **Cookies**, **Treasures**
  and **Boosts**. Each shows a count of what it holds and is disabled when the episode has
  no room for it. The open tab is remembered under `combi-name:tab`.
- The code panel is pinned under the top bar on desktop. On a phone it scrolls away with
  the page, the tab bar sticks to the top on its own, and a floating **↑** button at the
  bottom right brings the code back once it is out of view.
  - It shows the ten characters the game takes, with **Edit**, **Save** (or **Update**)
    and a **⋯** menu.
  - The menu holds **Show full code**, **Copy code**, **Copy link**, **Reset**, and
    **Save as new** and **Cancel** while a saved code is open.
  - Show full code swaps the panel, and Copy code with it, to the whole code with its
    loadout, remembered under `combi-name:full-code`.
- A summary under the note reads the build at a glance, one row per tab, in tab order.
  - Cookies, treasures, boosts and power+ are pictures in equal-sized boxes.
  - Clicking a row's pictures shows or hides that row's names. On the Run row the same
    click shows why a run is semi-auto.
  - An evolved or blessed treasure wears an **E** or **B** and a ring in its colour.
  - The **›** at the end of each row opens its tab.
  - On a phone the summary folds to one line until tapped.
- One notification banner carries every message, as a snackbar floated at the bottom
  centre of the window.
  - Info is green, warn yellow and error red, each with its own badge (`i`, `!`, `×`),
    through two new tokens, `--cr-success` and `--cr-warning`.
  - Info clears itself after a few seconds; warnings and errors stay until dismissed or
    replaced.
  - A message of several lines folds to its title and a count, such as "Read with changes
    (2) ▾", and opens on a tap.
  - While a drawer is open the banner moves into it and sits under the drawer's header.
- Saved codes and Help open as side drawers from the top bar. Saved codes keep Load, the
  row menu, and import and export as before. Help holds the slot reference and the page's
  intro.
- The episode, cookie, relay and pet pickers are grids drawn in place (`<entry-grid>`)
  instead of dialogs. The Cookies tab has cards for cookie → relay · pet that choose which
  grid shows. Random boost is a row of chips. Treasure slots keep their picker.
- Letters for parts of the code with nothing behind them are plain text and not clickable:
  the version character, the tower's reserved slots, and slots an episode doesn't use.
- A saved code keeps what a run of it brought home, in four optional boxes under the note:
  **Money** and **Exp** (a positive whole number or a range like `12000-15000`), **Boxes**
  (0 to 5, or a range) and **Time** (seconds). A saved row shows them on one line, and Load
  fills them back in.
- Run stats travel with a code. A shared link carries them as plain query values
  (`#CODE?note=…&money=12000-15000&time=245`) and offers them in the boxes like its note.
  Export writes them as `money: 12000-15000` lines under the code, and import reads them
  back.
- A saved row reads as the run it holds instead of its code: chips for the mode
  (Semi-auto when the build is, relay included), the goal, the episode as `EP. 3` or
  `S.EP. 2`, and the tower's floor, then its stats, then its note. A row with no note has
  no note line, and **Saved [date]** sits at the start of the row's button line.
- The code shows each treasure slot as its own run after the order flag, and tapping one
  opens the Treasures tab on that slot; tapping the order flag goes to the order switch.

### Improvements

- The code is a grid of character cells in monospace with no letter-spacing, and fields sit
  one empty cell apart, so every character keeps its column whether the code fits one line
  or wraps onto several. The long treasure run no longer wraps with a centred second line.
- Parts of the code you can tap are yellow and underlined; the parts you cannot are grey
  and plain, so the difference shows on a phone without a hover.
- Tapping part of the code says only its slot and field under the code, such as
  "Slot 2 · Mode", since the tap already opens the control that shows the value.

- The page is one centred column, and the sections keep the same spacing whichever tab is
  open.
- The tab bar stays one row on a phone and scrolls sideways only.
- The code's dotted underlines are drawn as text decoration, so they line up along a
  wrapped line on iOS.
- A long build stays tidy on a phone: the folded summary is one line, with the boost count
  ahead of the pictures, and nothing can widen the page.
- Loading a saved code says so once. The line under the note that repeated "Loaded from X"
  next to the banner's "Loaded X." is gone; the note's label and the **Update** button still
  show that an entry is open.
- A message no longer pushes the page down. The banner used to grow the code panel when it
  appeared and shrink it when it went, so everything under the panel jumped.
- The code panel's **Copy link** carries the note and stats in the boxes, not just the code,
  so a build can be sent before it is saved. A blocked clipboard shows the link itself,
  since the address bar holds only the code.

### Bug fixes

- The Cookies tab no longer vanishes for anyone using a content blocker (Brave Shields,
  uBlock Origin, AdGuard). Its panel was named `#panel-cookies`, an id that cookie-banner
  filter lists hide on every site. It is `#panel-roles` now, and a test fails if a page
  region is named after cookies again.
- Pressing Enter in the tower's floor box no longer reloads the page.
- An inline grid never scrolls inside its own box. On WebKit at 110% zoom the episode grid
  had become a one-pixel scrolling box.
- The theme dropdown no longer keeps a focus ring after a mouse pick.
- Exporting with nothing saved, or importing empty text, is a warning rather than an error.
  Nothing failed; error is kept for what the browser or a code refused.
- The folded summary on a phone no longer cuts off the **E**/**B** letter above a treasure
  picture or the **+N** badge below it.

### Decisions

- Mockups came first: the owner tried several layouts, then a version with real art and
  real codes, before settling on this one. The design and plan are in
  `docs/superpowers/specs/2026-10-23-combi-workbench-layout-design.md` and
  `docs/superpowers/plans/2026-10-24-combi-workbench-layout.md`.
- The panel shows only the game's ten characters by default. They are what goes into the
  game, the loadout is in the summary, and a full code took three lines of a phone's dock.
  Show full code is there when it is wanted.
- A summary sits beside the controls, against the earlier "one board, no second rendering"
  rule. It is drawn from the same decoded code in the same render, so it cannot disagree
  with the controls.
- The drawers are modal sheets on both widths rather than a desktop side column that
  pushes the page over. That keeps one implementation, and Escape and the focus trap come
  from the platform.
- Treasures keep their picker dialog, the owner's call. Every other picker became an
  inline grid.
- The banner went through three mockup rounds. A strip in the panel that always kept one
  line was built first, then dropped because the empty line was annoying. A card hanging
  off the panel and a message in the button row's free space were also mocked up. The
  owner picked the snackbar.
- The phone's bottom dock for the code panel was dropped, the owner's call. The panel
  sticks to the top as on desktop, and the bottom of the screen is left to the snackbar.
- A stat that does not read stops Save, Update and Copy link rather than being left out, so
  what is kept or sent is what was typed. Every bad box is outlined, not just the first.
- Stats are not part of the code. They belong to a saved entry and its link, so the wire
  format and `VERSION` are unchanged.
- A saved row leaves its code out, the owner's call: the code says nothing at a glance,
  while the mode, goal and episode do. Load, Copy link and Share still act on the code.
- Later the same day the phone's code panel was unpinned after all. A full code in a pinned
  panel took a third of the screen, and mockups of more compact codes (section rows,
  equal cells, labelled cells, one line that scrolls sideways, a smaller loadout line) were
  all still too tall on a phone. The owner chose a plain **↑** button over a floating pill
  showing the code.
- The code's cells had a light ground at first to mark them as tappable; it read badly on
  the dark theme, so the underline alone marks a tap. The **↑** button is filled with the
  text colour rather than the accent, because the accent fill is what a picked treasure
  level wears and the button floats over those strips.

## 2026-10-23: Treasure slots as rows with a one-line level strip, and saved codes you can update, share and move

### Features

- Each pick in a treasure slot shows its levels as one strip of ten cells, +0 to +9, with a
  summary beside it such as `+9`, `+7–9`, `+0, +2–4` or `any`, replacing the 5×2 button grid.
- Holding a level for half a second keeps that level alone, so +0 to +9 is one gesture.
  Dragging across the strip, or shift-pressing a level on desktop, selects a range.
- An `any` button beside each strip turns on all ten levels, and pressing it again goes
  back to +0.
- A filled treasure slot ends with a "+ Add alternative" button that opens the picker.
- Loading a saved code opens it in the save box with its note. **Update** writes the build
  on screen and the note back into that entry, in place, and **Save as new** keeps the
  original. A line above the box says what Update would do, including a code change, and
  an update onto a code another entry already holds is refused.
- **Copy link** on a saved entry copies a link that carries its note (`#CODE?note=…`).
  **Share** sends the same link through the share sheet where the browser has one. Opening
  such a link puts the note in the save box, one click from keeping it.
- **Import and export**, folded under the saved list, moves the whole list as plain text:
  each code on its own line with its note under it, every note line starting with `>`.
  Export copies it or downloads a `.txt`; import takes pasted text, a file, bare codes or
  shared links, adds only codes not already saved, and names the lines it skipped.
- The "Your build" heading folds the board away. The auto/semi-auto badge and verdict stay
  on show, the choice is remembered in this browser, and clicking a run of the code to jump
  to its control opens the board first.

### Improvements

- The three treasure slots stack as full-width rows instead of columns, so names show in
  full with their kind, and a dashed "or" separates alternatives. The slot's name sits on
  the left, or as a bar above the picks when the slot is narrow.
- The layout follows each slot's own width rather than the window's. The strip joins the
  name's line only with a mouse and at least 42rem of room. On touch, each cell is the full
  tap height.
- An empty treasure slot is clickable across its whole frame, not just its left column.
- The page behind an open picker no longer scrolls, even with the iOS keyboard up. Closing
  the picker returns the page to where it was.
- A saved row shows two buttons instead of a wall: **Load**, and a **⋯** menu holding Copy
  link, Share and Delete. The menu closes on a pick, on Escape, on a click elsewhere, and
  when another row's menu opens.
- **Reset** lets go of a loaded entry, so Update is never left aimed at it after starting
  over.

### Bug fixes

- On iOS, picker cells were only as tall as the tap size, so every name overlapped the
  picture in the row below. Rows now size to their content.
- On iOS, a picker was taller than the visible screen, so its title, Close, Clear and Done
  ended up behind the browser toolbars. Its height cap now uses `svh`.

### Decisions

- A plain press on a level toggles it rather than keeping only that level: a touch screen
  has no modifier key, and +2, +4, +6 has to be reachable there too. A long press keeps
  one level instead. A visible One/Many switch, and keeping tap-to-keep-one with written
  hints, were both considered and rejected.
- The ledger layout was chosen over two other mockups. Inventory cards hid level editing
  behind the dialog. A tabbed workbench with no dialog was rejected as well.
- Load and Edit were first two buttons, but they differed only in whether a later save
  wrote back into the entry, and the save box already asks that with Update and Save as
  new. So Load always opens the entry, and there is no Edit.
- A shared note travels as base64url of its UTF-8 bytes rather than percent-escaped. The
  link is then one run of letters, digits, `-` and `_`, with no space, `+` or `%` for a chat
  app to cut it at, and a Thai or emoji note comes out shorter than its escapes would.
- The export format is quoted plain text rather than JSON, so the same text reads well in
  a chat and imports back. The `>` quote is what tells a note from a code, so a note may
  say anything.
- Import never overwrites a code already saved: the note someone wrote for themselves
  outranks one that came from elsewhere, and an import that could overwrite a list is one
  nobody would run twice.
- Share appears only where the browser has a share sheet; elsewhere it would duplicate Copy
  link.
