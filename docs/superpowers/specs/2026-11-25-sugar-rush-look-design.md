# Sugar Rush: one look for every page, panel and pop-up

The owner picked this direction from four interactive directions (Sugar Rush, Night Run,
Frosting, Tray), then asked for it compact. The kit they chose from is the claude.ai
artifact "cr-tools Component Kit"; its HTML is not in the repository. Where this document
and the kit disagree, this document wins.

## Why

The redesign finished with every component styling itself. Only about 100 lines of CSS
are shared (`tokens.css`, `lang.css`, `global.css`), and the rest sits in each
component's `<style>`:

- The three pop-up kinds share nothing. `Panel` is the side panel. `CombiFilter` builds
  its own bottom sheet (`.sheet`, `.sheet-head`, `.sheet-body`, `.sheet-foot`). There is
  no centred dialog.
- Surfaces are styled one by one: `ShareBox`'s `.box`, the four Settings boxes,
  `SettingsRow`, the saved-list rows in `CombiList`.
- `CombiList` alone has 42 radius, shadow or background declarations and 124 raw `px`
  values. `CombiFilter` and `CombiEditor` follow.
- Colours bypass the tokens in `Sidebar`, `CombiFilter`, `CombiList`, `Toast`,
  `Segmented` and `Button`. Raw `z-index` values sit in `Panel`, `CombiEditor` and
  `CombiFilter`.

The owner wants every page, panel and dialog to come from the same parts and to look like
one site, and wants that look to be more than a tidy-up of today's.

## Goals

1. One token set for colour, type, shape and spacing. A component reads tokens, never
   literals.
2. One overlay with three placements (sheet, side, dialog) behind every pop-up.
3. One surface for every card, box and row.
4. The Sugar Rush look in both themes: thick outlines, a hard offset shadow that presses
   in, yellow for the picked option, Mitr headings.
5. Compact: the density the owner approved, with full tap targets on touch screens.

## Non-goals

- No change to behaviour, copy, routes, storage or the combi wire format.
- No change to which pop-up kind a feature uses. The editor and the filter still dock
  beside the list as a `Panel` from 1100px. Settings rows still open in place.
- Dark stays the default theme. Light still follows the system or an explicit
  `data-theme="light"`.

## Anti-goals

- Thai renders worse than today: clipped marks, a font with no Thai, or letter-spacing on
  Thai text.
- Any phone width from 390px clips or scrolls sideways.
- A tap target on a touch screen drops below `--tap` (2.75rem).

## The look

Candy stickers. Every surface has a thick outline in `--ink` and a hard shadow offset down
and right in the same colour, so it reads as a sticker on the page. A button's shadow is
smaller and disappears when pressed: the button moves into the space the shadow held. The
picked option in a segmented control, a chip or the current saved code turns yellow
(`--pick`). The page background has a faint dot grid. Headings and controls use Mitr; body
text uses IBM Plex Sans Thai; codes use JetBrains Mono.

Labels stay sentence case with no letter-spacing (`tests/styles/look.test.ts`). Only codes
may be spaced.

### Colour

Token names already in `tokens.css` keep their names. `--line` keeps its role as the soft
divider; the outline colour is the new `--ink`.

| Token | Dark (default) | Light | Use |
| --- | --- | --- | --- |
| `--bg` | `#1d1129` | `#fff4f9` | page |
| `--surface` | `#2a1a3a` | `#ffffff` | cards, rows, pop-ups |
| `--surface-2` | `#231432` | `#ffe6f1` | sunken: inputs, segmented track, code tiles |
| `--hover` | `#34214a` | `#fff0f7` | hovered surface |
| `--text` | `#fbeaff` | `#2b1638` | |
| `--muted` | `#bda6ca` | `#7a5f86` | secondary text |
| `--line` | `#3d2952` | `#f3cfe0` | dividers, dot grid |
| `--ink` | `#7c5a99` | `#2b1638` | outlines and sticker shadows |
| `--accent` | `#ff5c95` | `#ff3d7f` | primary button, current-item mark, focus ring |
| `--on-accent` | `#1d1129` | `#2b1638` | text on `--accent` |
| `--pick` | `#ffd23f` | `#ffd23f` | picked option |
| `--on-pick` | `#2b1638` | `#2b1638` | text on `--pick` |
| `--code` | `#c9a7ff` | `#6b25d9` | combi codes |
| `--danger` | `#ff6b7e` | `#d92d4a` | |
| `--on-danger` | `#1d1129` | `#ffffff` | text on `--danger` |
| `--success` | unchanged | unchanged | |
| `--scrim` | `rgb(5 2 10 / 0.6)` | `rgb(43 22 56 / 0.35)` | behind a pop-up |

`--evolved`, `--blessed` and the `--env` colours stay as they are. The kit's `--accent-2`
mint had no use outside the kit and is dropped.

### Type

| Token | Value |
| --- | --- |
| `--font-head` | `"Mitr", "IBM Plex Sans Thai", system-ui, sans-serif`, weight 600 |
| `--font-ui` | same as `--font-head`, weight 500, for buttons, tabs, chips and labels |
| `--font-body` | `"IBM Plex Sans Thai", system-ui, sans-serif` |
| `--mono` | `"JetBrains Mono", ui-monospace, sfmono-regular, menlo, monospace` |

All three faces cover Thai or are only used for codes. They are self-hosted from
`@fontsource` packages (Mitr 500 and 600, IBM Plex Sans Thai 400 and 600, JetBrains Mono
500 and 700) and imported by `global.css`. Fetching from Google Fonts would add a third
party to every page view.

Sizes: body 14px with line height 1.45, labels 13px, tags 11px, headings 15–16px.

### Shape and spacing

| Token | Value | Use |
| --- | --- | --- |
| `--radius` | 14px | cards, rows, pop-ups |
| `--radius-sm` | 10px | inputs, list rows, tiles |
| `--radius-ctl` | 999px | buttons, segmented, chips, tags, toast |
| `--border` | 2.5px | outline width |
| `--shadow` | `3px 3px 0 var(--ink)` | surfaces |
| `--shadow-pop` | `5px 5px 0 var(--ink)` | pop-ups, toast |
| `--shadow-btn` | `2px 2px 0 var(--ink)` | buttons; `none` when pressed, with `translate(2px, 2px)` |
| `--pad` | 12px | inside a surface |
| `--gap` | 10px | between items in a surface |
| `--stack` | 8px | between sibling surfaces in a list |
| `--ctl` | 32px | button height (26px for segmented, chips) |

`--radius-lg` goes; its users move to `--radius`. `--tap` stays at 2.75rem, and on
`(pointer: coarse)` every button, chip, segmented option, input and icon button grows to
it.

## Shared parts

Tiers follow `tests/components/atomic.test.ts`.

### Atoms

| Part | Status | What it is |
| --- | --- | --- |
| `Surface` | new | the sticker container: `kind` = `card` (outline + shadow), `sunken` (`--surface-2`, no shadow) or `row` (smaller shadow). Every card, box and row uses it. |
| `Button` | restyle | `plain`, `primary` (`--accent`), `danger`, and a new `ghost` (no fill, no outline, `--muted`). Pill, `--shadow-btn`, presses in. |
| `IconButton` | new | square, no outline, `--muted` until hovered. Close, back and "more" buttons. |
| `Segmented` | restyle | sunken outlined track; the picked option is `--pick` with an inner `--ink` outline. |
| `Chips` | restyle | outlined pills; a picked chip is `--pick` and starts with a check mark. |
| `Tabs` | restyle | underline in `--accent`, 4px, rounded top. |
| `Tag` | new | the small sunken pill on a saved-list row (mode, goal, episode). |
| `CodeTiles` | new | a combi name as ten tiles in `--mono` and `--code`, at most 340px wide. |
| `Toast` | restyle | `--pick` fill, `--ink` outline and `--shadow-pop`. Fixes its hardcoded colour. |

### Molecules

| Part | Status | What it is |
| --- | --- | --- |
| `Overlay` | new | the one pop-up. `place` = `sheet` (from the bottom, top corners rounded, a grab handle), `side` (from the right, full height) or `dialog` (centred). Scrim in `--scrim`, header with title and `IconButton` close, scrolling body, footer with a `--line` divider. Takes focus on open, returns it on close, shuts on Escape and on the scrim, stacks on `--z-sheet`. A `danger` flag outlines it and casts its shadow in `--danger`, for confirming what cannot be undone. |
| `Panel` | restyle | stays the docked column. Its head, body and foot take `Overlay`'s spacing and type, so a docked panel and a sheet look alike. Its raw `z-index: 1` moves to a token. |
| `SettingsRow` | restyle | a `Surface` row. When open, the body sits under a dashed `--line` divider, with `--gap` above and `--pad` below. |
| `CodeDisplay` | restyle | uses `CodeTiles`. |
| `Field` | restyle | label in `--font-ui`; input sunken with an outline, a 3px accent ring on focus. |
| `EntryPicker`, `LoadoutIcons`, `ToolCard` | restyle | read the new tokens; `ToolCard` is a `Surface`. |

### Organisms and the frame

- `CombiFilter` drops its own `.sheet*` markup and opens in `Overlay place="sheet"` below
  1100px.
- `CombiList` rows become `Surface` rows with `Tag`s. The current row turns `--pick` at
  30% over `--surface`. Its raw colours and `px` values move to tokens.
- `ShareBox`, `StorageBox`, `BackupBox`, `RestoreBox`, `DeleteAllBox` and `HomeSaved` use
  `Surface`. Their behaviour does not change.
- `TopBar` and `Sidebar` get the `--ink` bottom or side edge, Mitr for the site name, and
  lose `Sidebar`'s hardcoded colours. The sidebar drawer is an `Overlay place="side"` only
  if that keeps its current behaviour; otherwise it keeps its own markup and the tokens.
- `BaseLayout`'s body gets the dot grid:
  `radial-gradient(var(--line) 1.6px, transparent 1.9px) 0 0 / 22px 22px`.

## Checks

`tests/styles/look.test.ts` gains three checks over every component, layout and page:

1. No colour literal (`#…`, `rgb(`, `hsl(`) outside `src/styles/tokens.css`.
2. No numeric `z-index`; only `var(--z-…)`.
3. No `border-radius` or `box-shadow` value that is not a token, `0` or `none`.

`tests/components/atomic.test.ts` keeps the tiers honest for the new parts. Each new atom
and `Overlay` gets a Testing Library test. `Overlay` is tested on focus, Escape, the scrim
and each `place`.

Colour, shadow and layout cannot be tested headless. Each pull request lists them as
preview checks, in both themes, at 390px and at 1280px.

## Pieces

Each piece is its own pull request against `main`.

1. **Tokens and type.** New `tokens.css`, the fonts, the dot grid, the three look checks
   (with an allow-list of today's offenders that later pieces empty).
2. **Atoms.** `Surface`, `IconButton`, `Tag`, `CodeTiles`, and the restyled `Button`,
   `Segmented`, `Chips`, `Tabs`, `Toast`.
3. **Overlay and Panel.** `Overlay`, then `CombiFilter`'s sheet on it, and `Panel`
   matched to it.
4. **Combi page.** `CombiList`, `CombiEditor` and its tabs, `TreasureSlot`, `ShareBox`,
   `CodeDisplay`, `EntryPicker`.
5. **Home, Settings and the frame.** `HomeSaved`, `ToolCard`, `SettingsRow` and the four
   Settings boxes, `TopBar`, `Sidebar`. The allow-list is empty at the end.

## Open questions

- Should Delete all confirm in an `Overlay place="dialog"` instead of in place? The look
  allows it. This spec does not change it.
