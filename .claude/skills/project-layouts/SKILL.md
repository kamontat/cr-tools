---
name: project-layouts
description: Use when writing or editing a layout in src/layouts/ (the atomic template tier), changing what goes in every page's <html> or <head> — title, meta, favicon, global CSS, Google Tag Manager — adding a layout that wraps BaseLayout, or debugging a page with missing head tags, styles or analytics.
---

# Layouts

Layouts are the *templates* tier of Atomic Design: they arrange organisms into a page shape
and leave the content to pages. Components are the `project-components` skill; routes are
the `project-pages` skill.

## BaseLayout owns the document

`src/layouts/BaseLayout.astro` is the only file that writes `<html>`, `<head>` and `<body>`.
It:

- imports `src/styles/global.css` (the `@kcstyles/reset.css` reset, `tokens.css`, and
  `lang.css`, which hides the language `<html lang>` does not name), so every page gets it;
- puts `data-env={readBuildInfo().environment}` on `<html>`, which `tokens.css` turns into
  the `--env` colour the top bar's environment line and badge use;
- runs an `is:inline` theme boot in `<head>` before first paint: it reads the `theme` key
  inside a `try` and sets `data-theme` on `<html>` when it is `dark` or `light` (System
  leaves it off, so the media query decides);
- writes `<html lang="th">` with `data-title-th` and `data-title-en`, both from its required
  `title` prop (a `Pick`, never a string), and `<title>` in Thai;
- runs a `define:vars={{ LANG_KEY }}` language boot in `<head>`, after the theme boot and
  before GTM: inside a `try`, when `localStorage[LANG_KEY]` is `en` it sets `lang="en"` and
  `document.title` from `data-title-en`. Only English needs action — the HTML is Thai;
- sets `charset`, `viewport`, the favicon (`/assets/cookies/fairy_cookie.png`, the one
  favicon — no `favicon.svg` or `.ico`) and the generator tag;
- runs `loadGtm(import.meta.env.PUBLIC_GTM_ID, document)` from `#lib/gtm` in a processed
  `<script>`. Without `PUBLIC_GTM_ID` at build time the bundler drops the call, so dev,
  local and preview builds carry no GTM code;
- renders the page into `<body>` through its default `<slot />`.

Every page renders inside `BaseLayout`, directly or through another layout;
`tests/pages/pages.test.ts` fails otherwise. Something every page needs in `<head>` (a meta
tag, a font preload) goes here, not into pages. `tests/layouts/BaseLayout.test.ts` checks
the GTM call and the favicon in the source text.

## AppLayout is the frame

`src/layouts/AppLayout.astro` wraps `BaseLayout` and is what every page renders in
(`tests/pages/pages.test.ts` fails a page that does not reach it). Its props are `title`
(a `Pick`, forwarded to `BaseLayout` and shown in the top bar) and `current`, a `FramePage` from
`#lib/frame` — `"home"`, `"settings"` or a tool slug — that marks the sidebar's current link —
and an optional `wide`, which marks the wrapper `data-wide` so it takes up to 1100px from
700px and the full width from 1100px (`DOCK_MIN_WIDTH`), for the combi page's list with its
editor beside it.
It renders:

- a `define:vars` boot script, before the frame's markup, that sets
  `<body data-sidebar="closed">` when the window is at least `FULL_MIN_WIDTH` wide and
  `SIDEBAR_KEY` says the visitor closed the sidebar, so a closed sidebar does not flash
  open. Both constants come from `#lib/frame` through `define:vars`, never as literals —
  `tests/layouts/AppLayout.test.ts` checks that;
- `TopBar` (☰, the page title, the `pr-<n>` badge on previews, the environment line);
- a grid of `Sidebar`, its scrim (`#sidebar-scrim`) and `main#content`;
- inside `main`, `<div class="wrap">` around the page's `<slot />`: the one page gutter
  (28px 24px and 640px wide; 20px 16px under 700px; 32px 40px and 1100px wide from 1400px,
  or the full width with `wide`).
  Pages never pad their own outer edge, so they line up;
- a processed `<script>` that calls `localizeAttrs(document, currentLang(document))` (so
  the frame's `l10nAttr` attributes follow the language the head's boot chose), then
  `syncFromStorage(document, store)` (re-applies the stored theme, and the stored language
  when it differs, so a boot that did not run still corrects itself) and
  `syncOnRestore(window, document, store)` (does the same on a `pageshow` whose `persisted`
  is true: the back-forward cache restores a frozen page without re-running the head's
  boots, so Back after switching language on Settings would otherwise show the old one),
  and then `initFrame(document, store)`, which wires ☰, the scrim, Escape and the
  breakpoints (see `#lib/frame`). Both sync functions live in `#lib/lang` and are tested in
  `tests/lib/lang.test.ts`.

## Text in two languages

A layout holds no strings. Titles are a `Pick` (`(m) => m.settings.title`) that
`BaseLayout` turns into both `data-title-*` attributes with `both`; visible text goes
through the `Text` atom and attributes through `l10nAttr` — the `project-components`
skill's "Text in two languages" has the whole pattern. The HTML is always Thai; the head's
boot and `lang.css` switch it to English before first paint.

The grid's breakpoints (700px and 1100px) follow `sidebarMode` in `#lib/frame`; CSS cannot
read the constants, so the comments in `AppLayout` and `Sidebar` point back to it. Change
them together.

## Rules

- A layout lives in `src/layouts/<Name>Layout.astro` and is imported as
  `#layouts/<Name>Layout.astro`.
- Layouts may import components from any tier and other layouts; they never import pages,
  and components never import layouts.
- Every layout other than `BaseLayout` wraps `BaseLayout` and forwards its `title` (and any
  other head prop); it never writes `<html>` or `<head>` itself.
- A layout arranges content; it does not hold page copy. Text, links and data come in
  through props or slots from the page, or from `src/lib/` (the tool registry).
- Use named slots for regions a page fills (`<slot name="actions" />`); the default slot is
  the main content.

## Example — a template wrapping BaseLayout

A sketch of the shape (the real one is `AppLayout`, above):

```astro
---
import type { Pick } from "#lib/i18n/messages"

import Sidebar from "#components/organisms/Sidebar.astro"
import TopBar from "#components/organisms/TopBar.astro"
import BaseLayout from "#layouts/BaseLayout.astro"

interface Props {
	title: Pick
}

const { title } = Astro.props
---

<BaseLayout title={title}>
	<div row>
		<Sidebar current={Astro.url.pathname} />
		<div>
			<TopBar title={title}>
				{Astro.slots.has("actions") && <slot name="actions" />}
			</TopBar>
			<main>
				<slot />
			</main>
		</div>
	</div>
</BaseLayout>

<style>
	main {
		flex: 1;
	}
</style>
```

- `Astro.slots.has("actions")` leaves the slot out when a page fills none, rather than
  rendering an empty wrapper.
- `<div row>` because `@kcstyles/reset.css` makes a bare `div` a column.
- The page still passes `title`; it reaches `<title>` through `BaseLayout`.

## Testing

Render a layout with the Container API and pass slots, as with a component:

```ts
import type { Messages } from "#lib/i18n/messages"

import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { expect, test } from "vitest"
import BaseLayout from "#layouts/BaseLayout.astro"

test("renders the title and the page", async () => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(BaseLayout, {
		props: { title: (m: Messages) => m.settings.title },
		slots: { default: "<p>Body</p>" },
	})
	expect(html).toMatch(/<title>ตั้งค่า<\/title>/)
	expect(html).toContain("<p>Body</p>")
})
```

The layout tests in `tests/layouts/` run in the `node` project, so the Container works there
without the `// @vitest-environment node` line components need. The Container renders
`is:inline` and `define:vars` scripts into the HTML but does not run them, and leaves
processed `<script>` tags out, so `tests/layouts/BaseLayout.test.ts` checks the rendered
`<html lang="th">`, both titles and the language boot's place in `<head>`, runs the
rendered language boot itself (loading the HTML into a happy-dom document and running the
script with `node:vm` against a stubbed `localStorage`: `en` switches it, anything else or a
`localStorage` that throws leaves it Thai), and checks the GTM call, the theme boot's
`try`, `data-env` and the boot order in the source text;
`tests/layouts/AppLayout.test.ts` checks the sidebar boot's `define:vars`, the `.wrap`
gutter, `localizeAttrs` and the storage sync before `initFrame` the same way; `tests/build/output.test.ts` checks each built page sits in
`main#content > .wrap`. `initFrame` is tested in `tests/lib/frame.test.ts`, and `loadGtm`
in `tests/lib/gtm.test.ts`. Head contents that only a browser shows (favicon, styles applied)
are preview checks in the PR.
