---
name: project-components
description: Use when writing, editing or moving a component in src/components/ (atoms, molecules, organisms) — an .astro component or a Svelte one — deciding which atomic tier a component belongs to, adding client-side script, styling with src/styles/ or the CSS reset, writing a component test, or debugging a component that renders nothing, loses its styles or ships no JavaScript.
---

# Components

Layouts are the `project-layouts` skill; routes are the `project-pages` skill.

## The components today

| Component | Tier | Kind | What |
|---|---|---|---|
| `Text` | atom | `.astro` | One string in both languages: `pick` (a `Pick`). Renders `<span data-lang="th">…</span><span data-lang="en">…</span>` with no wrapper. See "Text in two languages". |
| `NavItem` | atom | `.astro` | One sidebar link: `href`, `icon`, `label` (`Record<Lang, string>`, from `both`), `current` (sets `aria-current="page"`). The label is a `.label` span, holding both language spans, that the sidebar hides in the rail; `title` is the tooltip in both languages. |
| `Segmented` | atom | `.svelte` | Segmented buttons: `label` (the group's name), `options` (`{ value, label, lang? }[]`), `value`, `onchange`. Each option is a `button` with `aria-pressed`; an option's `lang` goes on its button, for a label in another language than the page's (a language's own name). |
| `Chips` | atom | `.svelte` | A group of toggle chips: `label`, `options` (`{ value, label, icon?, disabled? }[]`), `value` (the picked values), `multiple`, `onchange`. |
| `EntryIcon` | atom | `.svelte` | One catalogue icon from `/assets/`: `src`, `name`, `round`, `size`; a missing `src` draws a placeholder. |
| `HelpToggle` | atom | `.svelte` | The `?` button that shows and hides a help line: `label`, `controls`, `expanded`, `ontoggle`. |
| `Tabs` | atom | `.svelte` | A tab strip with roving focus: `label`, `tabs` (`{ value, label, badge?, disabled? }[]`), `value`, `onchange`. |
| `Toast` | atom | `.svelte` | A dismissible message in a status or alert live region by `tone` (`info`, `warn`, `error`): `message`, `tone`, `ondismiss`. It moves itself inside the topmost open pop-up (`topModal` in `#lib/modal`), so `aria-modal` never hides it, and otherwise sits at the end of `<body>` on `--z-toast`, above every pop-up. |
| `ToolCard` | molecule | `.astro` | A Home card: `slug`, `icon` — a `TOOLS` entry spreads straight in. Name and tagline come from the catalogues' `tools[slug]` through `Text`. |
| `Panel` | molecule | `.svelte` | The one panel: a pop-up side panel (bottom sheet under 700px), or docked beside the page. See below. |
| `CodeDisplay` | molecule | `.svelte` | The full code drawn character by character with the field each belongs to: `code`, `summary`, `hints`, `onjump`, `canJump`. |
| `EntryPicker` | molecule | `.svelte` | A searchable grid of catalogue entries with icons: `label`, `searchLabel`, `options`, `value`, `onpick`, optional clear. |
| `Field` | molecule | `.svelte` | A labelled editor field with its help line and optional note: `id`, `label`, `help`, `helpLabel`, `note`, and a `children` snippet. |
| `LoadoutIcons` | molecule | `.svelte` | The cookie, pet and treasure icons of a saved code from `rowLoadout`: `loadout`, `size`. |
| `TopBar` | organism | `.astro` | ☰ (`#menu-toggle`, named through `l10nAttr`), the page `title` (a `Pick`, rendered with `Text`), the `pr-<n>` badge on previews, and the environment line under it. `env` is for tests; the build's own is the default. |
| `Sidebar` | organism | `.astro` | `nav#sidebar` (named through `l10nAttr`): Home, one `NavItem` per `TOOLS` entry (its `icon`, its name from `tools[slug].name`), Settings at the bottom. `current` is a `FramePage`. Its shape follows `<body data-sidebar>`, which `initFrame` sets. |
| `SettingsApp` | organism | `.svelte` | The Settings page island: Language, Appearance (theme) and About (a `Panel` of `aboutRows`). Its text comes from `messagesFor(lang)`, with `lang` following `<html lang>` through `onLangChange`; choosing a language calls `writeLang` and `applyLang`, so the page switches in place. Each language button carries its own `lang`. |
| `HomeSaved` | organism | `.svelte` | Home's latest three saved codes (code, `LoadoutIcons`, the note's first line, Copy for the 10 characters) and a See all link to `/combi-name/`; renders nothing with no saved codes. |
| `CombiApp` | organism | `.svelte` | The combi page island: holds the draft, the saved list, the address bar and the notices (`Toast`), and docks the editor from `DOCK_MIN_WIDTH` (1400px) or pops it up below. |
| `CombiList` | organism | `.svelte` | The saved list: search, goal filter, sort, rows with `LoadoutIcons`, and the New, Open, Copy and Share actions. |
| `CombiEditor` | organism | `.svelte` | The editor in a `Panel` (`docked` or pop-up): the code display, the verdict and five tabs (Main, Cookies, Treasures, Boosts, Run log), with Copy, Share, Save and Update. |
| `EditorMainTab`, `EditorRolesTab`, `EditorBoostsTab`, `EditorTreasuresTab`, `EditorRunLogTab` | organism | `.svelte` | One editor tab each: run settings, cookie / relay / pet, boosts, treasures, and the run log (stats and note). Each takes `uid`, `draft`, `m`, `onchange`. |
| `TreasureSlot` | organism | `.svelte` | One treasure slot's alternatives and levels, written in option order. |
| `ShareDialog` | organism | `.svelte` | The Share panel over the editor: the link with its note, the full code, Copy and Share to app. |

The redesign spec (`docs/superpowers/specs/2026-11-19-site-redesign-design.md`) lists the
components still to come and their tiers; the rules below are what every one follows.

### Panel

`Panel` takes `id`, `title`, `open`, `onclose`, a `children` snippet, an optional `footer`
snippet, an optional `docked` flag, and the required `closeLabel` / `resizeLabel` — the close button's and the resize
handle's names, which the caller passes in the page's language (`m.frame.close`,
`m.frame.resize`); there is no English default. It renders nothing while
`open` is false.

- `id` names the remembered width — `frame:panel-width:<id>` through `#lib/panel-width` —
  and the title's id. `id="editor"` gets the editor's wider default (640px) and share (70%
  of the window, 60% for the others); every width is clamped to at least 360px.
- `docked` draws it as a `<section>` in the page's flow (the combi editor beside the saved
  list from 1400px, `DOCK_MIN_WIDTH`): not modal, no scrim, no focus trap, and Escape from
  inside it calls `onclose` unless a control handled the key or a pop-up is open. Its left
  edge resizes the same way and measures from the section's right edge.
- On a wide screen the left edge is a `role="separator"` handle: drag, or ←/→ in 16px
  steps; double-click resets to the default. Under 700px (`RAIL_MIN_WIDTH`) it is a bottom
  sheet with no handle.
- A pop-up is `role="dialog" aria-modal="true"` with a scrim, and calls `holdFocus` from
  `#lib/modal`: focus moves in when it opens, Tab wraps inside it, Escape and the scrim
  call `onclose`, and focus returns on close to what held it before.
- Panels stack (Share over the editor): only the topmost handles Tab, focus and Escape,
  and the frame's Escape stands aside while any is open. Render a second panel as a
  sibling of the first, not inside its body: the slide-in animation transforms `.panel`,
  which makes it the containing block of a `position: fixed` layer opened inside it.

## Text in two languages

The site speaks Thai (the default) and English. There are no hard-coded strings in
components, layouts or pages: every string is a key in the catalogues `src/lib/i18n/th.ts`
and `src/lib/i18n/en.ts` (`Messages` is `typeof en`, so `th` must name the same keys), and
code names a string with a `Pick` — `(m: Messages) => string`, from `#lib/i18n/messages`.

An `.astro` file renders both languages into the HTML and lets CSS choose, so a static page
switches with no JavaScript and no flash:

- **Visible text** goes through the `Text` atom: `<Text pick={(m) => m.frame.home} />`
  renders `<span data-lang="th">หน้าแรก</span><span data-lang="en">Home</span>`, no
  wrapper. `src/styles/lang.css` hides the language `<html lang>` does not name (anything
  but `lang="en"` shows Thai). Put `Text` inside the element that styles it
  (`<span class="name"><Text … /></span>`).
- **An attribute** (`aria-label`, `title`) is spread from `l10nAttr(name, pick)`:
  `{...l10nAttr("aria-label", (m) => m.frame.menu)}` gives `aria-label` in Thai plus
  `data-aria-label-th`, `data-aria-label-en` and `data-l10n`. `localizeAttrs(doc, lang)`
  from `#lib/lang` (which `AppLayout` and `applyLang` call) copies the chosen pair over it.
- **A value handed to a component** that renders it itself is `both(pick)`, a
  `Record<Lang, string>`. An atom imports no component, so it cannot use `Text`: `NavItem`
  takes `label: Record<Lang, string>` and writes the two `data-lang` spans and the
  `l10nAttr`-shaped `title` attributes by hand.
- **A title** (`BaseLayout`, `AppLayout`, `TopBar`) is a `Pick`, never a string.

A tool's name, title and tagline live in the catalogues under `tools[slug]`, not in
`TOOLS`; `en.ts` types that map `Record<ToolSlug, ToolText>`, so a registered tool missing
from it fails `astro check`.

Test both languages: render, then query `[data-lang="th"]` and `[data-lang="en"]` (or the
`data-<name>-en` attribute) and compare against `th` / `en` from `#lib/i18n/*`.

## Shared logic in `src/lib/`

A component reaches for these rather than re-implementing them:

- **`#lib/storage`** — the one `localStorage` wrapper: `localStore()` (the store, or `null`
  when the browser refuses access), `readKey(key, store?)` and `writeKey(key, value, store?)`
  (`null` removes; `false` when the write failed). Every call is inside a `try`, and each
  takes the store as an argument so a test can hand in one that throws.
- **`#lib/theme`** — `Theme` (`system`, `dark`, `light`), `THEME_KEY` (`"theme"`),
  `readTheme`, `writeTheme`, and `applyTheme(theme, root)`, which sets or clears
  `data-theme`.
- **`#lib/modal`** — `holdFocus(dialog, onescape?)` for any modal (returns the release),
  `isModalOpen(doc)`, and `focusables(root)`. One module-level stack, which the build emits
  once, so every modal on a page shares it.
- **`#lib/frame`** — `FramePage`, `SIDEBAR_KEY`, the breakpoints `RAIL_MIN_WIDTH` (700),
  `FULL_MIN_WIDTH` (1100) and `DOCK_MIN_WIDTH` (1400), `sidebarMode(width)`, and `initFrame(doc, store)`, which
  `AppLayout` calls once per page. Use the constants rather than writing 700 or 1100 in a
  script; CSS cannot read them, so a stylesheet's breakpoint carries a comment pointing
  here.
- **`#lib/panel-width`** — `Panel`'s width rules (`clampWidth`, `readWidth`, `writeWidth`).
- **`#lib/build-info`** — `readBuildInfo(env?)` and `aboutRows(info)`.

## Two kinds of component

- **`.astro`** for anything that renders once, at build time: the frame, headings, static
  lists. Its frontmatter runs during `astro build`, never in the browser.
- **`.svelte`** (Svelte 5, through `@astrojs/svelte`) for every part that reads
  `localStorage` or reacts to input. A page or layout renders it with `client:only="svelte"`,
  so it renders in the browser only — the site has no server, and nothing that depends on
  the visitor's storage can be rendered at build time anyway.

Both kinds live in the same tiers and follow the same import rules. A Svelte component
cannot import an `.astro` one.

`astro check` typechecks `.astro` files and every `.ts` file, but not the `<script>` block of
a `.svelte` file: a type error there passes `pnpm run check`. Keep the logic a component
needs in `src/lib/` (typechecked, and testable without a DOM) and the script block thin;
the component's own test is what catches a mistake left in it. Checking the script blocks
too would need `svelte-check`, which this repo does not run.

## Atomic tiers

Components follow Atomic Design. Every component is a file in
`src/components/<tier>/<PascalName>.astro` (or `.svelte`), and its tier limits which
components it imports:

| Tier | Directory | Holds | May import |
|---|---|---|---|
| Atoms | `atoms/` | one element: heading, button, segmented control, icon | no component |
| Molecules | `molecules/` | a few atoms acting as one unit: a labelled field, a code row | atoms |
| Organisms | `organisms/` | a page section: top bar, sidebar, editor panel | atoms, molecules, organisms |

Atomic *templates* are `src/layouts/` and *pages* are `src/pages/`; both may import any tier.
`tests/components/atomic.test.ts` (rules in `tests/components/atomic.ts`) reads the
frontmatter of every `.astro` file and every `<script>` block of every `.svelte` file, and
fails on a component outside a tier, or on an import its tier does not allow — a molecule
importing a molecule included.

- Pick the lowest tier that fits. An atom that needs another component is a molecule; a
  molecule that needs another molecule is an organism. Move it up instead of loosening the
  rule.
- Components take their content through props or slots (`<slot />` in Astro, snippets and
  `children` in Svelte); none hardcodes copy. Every string lives in the catalogues (see
  "Text in two languages").
- Moving a component between tiers moves its test too (`tests/components/<tier>/`), and
  every import of it.

## Shape of an Astro component

A frontmatter script that runs at build time, then the template.

```astro
---
import type { HTMLAttributes } from "astro/types"

interface Props extends HTMLAttributes<"button"> {
	variant?: "primary" | "ghost"
}

const { variant = "primary", type = "button", ...attrs } = Astro.props
---

<button type={type} class={variant} {...attrs}><slot /></button>
```

- Props are typed by an `interface Props` in the frontmatter; `astro check` enforces it at
  every call site. Optional props get their default in the destructuring. Extending
  `HTMLAttributes<"…">` lets callers pass any native attribute without the atom listing each
  one.
- Import with the alias, tier and extension:
  `import Button from "#components/atoms/Button.astro"`.
- `src/components/` may import from `src/lib/` and `src/styles/`, never from `src/layouts/`
  or `src/pages/`.

## Shape of a Svelte component

```svelte
<script lang="ts">
	interface Props {
		options: readonly string[]
		value: string
		onchange?: (value: string) => void
	}

	let { options, value = $bindable(), onchange }: Props = $props()

	const pick = (option: string) => {
		value = option
		onchange?.(option)
	}
</script>

<div row role="radiogroup">
	{#each options as option (option)}
		<button role="radio" aria-checked={option === value} onclick={() => pick(option)}>{option}</button>
	{/each}
</div>
```

- Runes (`$props`, `$state`, `$derived`, `$effect`), not Svelte 4 stores-in-components or
  `export let`. Shared state across components (the saved list, settings) goes in a
  `.svelte.ts` module in `src/lib/` once more than one component needs it.
- `lang="ts"` on the script; `svelte.config.js` preprocesses it.
- Import framework-free logic from `#lib/*` (`#lib/combi/codec`, `#lib/panel-width`) rather
  than re-implementing it in the component.

## Rules every interactive component keeps

- **Storage is always wrapped.** Every `localStorage` read and write goes through
  `#lib/storage` (or sits in its own `try`); a browser that throws on access (private mode,
  blocked storage) gets the defaults and a working page for that visit. Take the `Storage`
  as an argument where possible, as `#lib/frame`, `#lib/theme` and
  `src/lib/combi/state.ts` do, so a test can hand in one that throws.
- **Modals hold focus with `holdFocus`** from `#lib/modal` — or are a `Panel` — so they
  stack with the others and the frame's Escape stands aside.
- **Sets are written in table order.** A control that holds a set the codec encodes (goals,
  boosts, cookie powers, a treasure slot's alternatives) reports it filtered from its own
  options, never in click order — click order would give one build two codes. See the
  `project-combi-codec` skill.
- **A control refuses a value its options do not hold**, and holds its options and its
  value as separate inputs, so a list replaced underneath a pick cannot keep a ghost value.

## Never name a region "cookie"

Name a section, panel, dialog, form, header, aside, main or element id after what it does —
never "cookie", "consent" or "gdpr". Content blockers hide consent banners with generic
cosmetic rules: EasyList Cookie, Fanboy's lists and AdGuard's cookie-notice list all carry
`###panel-cookies`, so under uBlock Origin, AdGuard or Brave the old site's Cookies tab
(`#panel-cookies`) painted as nothing at all while every test and headless check passed. On a
site about Cookie Run the word is tempting everywhere; a panel listing cookies is
`#panel-roles` or similar. No headless test catches this, so review for it, and check a
preview with a blocker on when a new region appears.

## Client-side script in an Astro component

Interactivity that does not warrant Svelte goes in a `<script>` tag inside the component.
Astro bundles it with Vite (TypeScript and `#lib/*` imports work), dedupes it across every
instance of the component, and emits it as a module script — inlined when small, a hashed
file in `dist/_astro/` otherwise. `<script is:inline>` opts out of all of that and ships the
tag verbatim (`BaseLayout`'s theme boot is inline so it runs before first paint, and
`AppLayout`'s sidebar boot uses `define:vars`, which implies it).

`import.meta.env.PUBLIC_*` inside such a script is replaced at build time. A variable unset
at build time becomes `undefined`, and when that lets the bundler prove a call does nothing
it drops the code entirely — which is how `BaseLayout`'s Google Tag Manager script
disappears from builds without `PUBLIC_GTM_ID`. Declare every such variable on
`ImportMetaEnv` in `src/env.d.ts`.

Frontmatter values do not reach a processed `<script>`. Pass them through a `data-*`
attribute and read it from the element, or use `define:vars` (which implies `is:inline`).

## Styles

A `<style>` in an Astro or Svelte component is **scoped**: `p { … }` only hits this
component's paragraphs, not those passed in through a slot or rendered by a child
component. Use `:global(…)` for a selector that must reach further.

`src/styles/global.css` holds the reset, the tokens and `lang.css` (which hides the
language not chosen), and anything global; `BaseLayout` imports it, so
every page gets it. Theme values belong in custom properties defined once on `:root` and
read with `var(--…)`; a component that hardcodes a colour also hardcodes a theme.
`src/styles/tokens.css` holds the token set — `--bg`, `--surface`, `--hover`, `--text`,
`--muted`, `--line`, `--accent`, `--on-accent`, `--code`, `--danger`, `--success`, `--env`,
`--radius`, `--radius-lg`, `--mono`, `--tap` — dark by default, light under
`data-theme="light"` or, with no `data-theme`, the system's light preference; `--env` is
the environment colour from `<html data-env>`.

Labels are sentence case: no `text-transform: uppercase` and no `letter-spacing` (the
spec's Look; letter-spacing also pulls Thai combining marks off their base).
`tests/styles/look.test.ts` fails on either in any component, layout, page or stylesheet.
A page's outer gutter is `AppLayout`'s `.wrap`; a component never pads the page edge
itself.

`@kcstyles/reset.css` makes every bare `div` `display: flex; flex-direction: column`
(opt out with `<div row>` for a row or `<div block>` for block). A `div` that wants a row
must say so even after `display: flex`, or it silently stacks — that is not a redundancy for
a reviewer to delete. `src/env.d.ts` declares `row` and `block` on
`astroHTML.JSX.HTMLAttributes` so `astro check` accepts them; without it, `<div row>` is a
type error.

## Biome and `.astro` files

`biome.json` extends `@kcconfigs/biome/configs/astro`, which turns on Biome's full HTML
support, so Biome reads an `.astro` file's template as well as its frontmatter and sees an
import used only in the markup. `tests/config/biome.test.ts` lints a fixture whose import and
variable are used only in the template and fails if Biome flags them — if it starts failing
after a Biome or preset bump, `pnpm run format` would delete component imports, so fix the
config rather than the test.

## Testing

Tests live in `tests/`, mirroring `src/`, and run with Vitest. `vitest.config.ts` wraps
Astro's `getViteConfig`, so `.astro` and `.svelte` imports and the `#…` aliases resolve, and
divides the suite into two projects: `dom` (happy-dom) for `tests/components/**` and
`tests/lib/**`, `node` for everything else.

An Astro component renders to an HTML string with the Container API:

```ts
// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { expect, test } from "vitest"
import Button from "#components/atoms/Button.astro"

test("renders the label", async () => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(Button, { slots: { default: "Save" } })
	expect(html).toMatch(/<button[^>]*>Save<\/button>/)
})
```

- The `// @vitest-environment node` line is required: `tests/components/**` runs in the
  `dom` project, and under happy-dom Vite compiles `.astro` files for the browser, where the
  component only throws "Astro components cannot be used in the browser" and the Container
  reports `NoMatchingRenderer`. To query the HTML, parse it with happy-dom explicitly:
  `new new Window().DOMParser().parseFromString(html, "text/html")` (`import { Window } from
  "happy-dom"`), as `tests/components/organisms/Sidebar.test.ts` does. Every Astro
  component test under `tests/components/` starts with that line.
- Elements carry `data-astro-cid-*` attributes when the component has a scoped style, so
  match `<button[^>]*>` rather than `<button>`.
- The Container renders the frontmatter and template only; it does not run or emit
  processed `<script>` tags. Put script logic in `src/lib/` as a function taking its inputs
  (see `loadGtm(id, document)`) and test it there.

A Svelte component is tested with `@testing-library/svelte` in the `dom` project:
`render(Component, { props })`, then query by role and fire events. `svelteTesting()` in
`vitest.config.ts` resolves Svelte's browser build and unmounts after each test.

Nothing renders in a real browser, so no test proves a component is styled: happy-dom does
not resolve inherited custom properties or lay anything out. The browser is the only check
for colour, spacing and layout — at 390px and on a wide screen — so list those as preview
checks in the PR. Check WebKit (iOS Safari) as well as Chromium for anything with a grid of
buttons or a sticky or fixed element; the old site hit WebKit-only layout bugs in both.
