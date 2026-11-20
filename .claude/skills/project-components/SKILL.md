---
name: project-components
description: Use when writing, editing or moving a component in src/components/ (atoms, molecules, organisms) — an .astro component or a Svelte one — deciding which atomic tier a component belongs to, adding client-side script, styling with src/styles/ or the CSS reset, writing a component test, or debugging a component that renders nothing, loses its styles or ships no JavaScript.
---

# Components

Layouts are the `project-layouts` skill; routes are the `project-pages` skill.

`src/components/` is empty on this branch (each tier holds a `.gitkeep`). The redesign spec
(`docs/superpowers/specs/2026-11-19-site-redesign-design.md`) lists the components to come
and their tiers; the rules below are what they must follow.

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
  `children` in Svelte); none hardcodes page copy. Copy lives in pages.
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

- **Storage is always wrapped.** Every `localStorage` read and write sits in a `try`; a
  browser that throws on access (private mode, blocked storage) gets the defaults and a
  working page for that visit. Take the `Storage` as an argument where possible, as
  `src/lib/combi/state.ts` and `saved.ts` do, so a test can hand in one that throws.
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
tag verbatim (the redesign's theme boot script must be inline, so it runs before first
paint).

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

`src/styles/global.css` holds the reset and anything global; `BaseLayout` imports it, so
every page gets it. Theme values belong in custom properties defined once on `:root` and
read with `var(--…)`; a component that hardcodes a colour also hardcodes a theme. The
redesign adds `src/styles/tokens.css` with the token set (`--bg`, `--surface`, `--text`,
`--accent`, `--code`, …), dark by default with a light variant under `data-theme`.

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
  "happy-dom"`), as `tests/components/organisms/Sidebar.test.ts` does.
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
