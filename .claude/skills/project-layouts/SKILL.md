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

- imports `src/styles/global.css` (today only `@kcstyles/reset.css`), so every page gets it;
- sets `charset`, `viewport`, the favicon (`/assets/cookies/fairy_cookie.png`, the one
  favicon — no `favicon.svg` or `.ico`), the generator tag and `<title>` from its required
  `title` prop;
- runs `loadGtm(import.meta.env.PUBLIC_GTM_ID, document)` from `#lib/gtm` in a processed
  `<script>`. Without `PUBLIC_GTM_ID` at build time the bundler drops the call, so dev,
  local and preview builds carry no GTM code;
- renders the page into `<body>` through its default `<slot />`.

Every page renders inside `BaseLayout`, directly or through another layout;
`tests/pages/pages.test.ts` fails otherwise. Something every page needs in `<head>` (a meta
tag, a font preload) goes here, not into pages. `tests/layouts/BaseLayout.test.ts` checks
the GTM call and the favicon in the source text.

The redesign (`docs/superpowers/specs/2026-11-19-site-redesign-design.md`) adds the frame
here and in a layout around it: an inline theme boot script, `data-env` on `<html>` from
`readBuildInfo().environment`, the top bar, the environment line and the sidebar. Until that
lands, a page's body is only what the page puts in it.

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

A frame layout built from organisms (the components are illustrations):

```astro
---
import Sidebar from "#components/organisms/Sidebar.astro"
import TopBar from "#components/organisms/TopBar.astro"
import BaseLayout from "#layouts/BaseLayout.astro"

interface Props {
	title: string
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
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { expect, test } from "vitest"
import BaseLayout from "#layouts/BaseLayout.astro"

test("renders the title and the page", async () => {
	const container = await AstroContainer.create()
	const html = await container.renderToString(BaseLayout, {
		props: { title: "Settings" },
		slots: { default: "<p>Body</p>" },
	})
	expect(html).toMatch(/<title>Settings<\/title>/)
	expect(html).toContain("<p>Body</p>")
})
```

The Container does not run processed `<script>` tags, so `tests/layouts/BaseLayout.test.ts`
checks the GTM call in the source text, and `loadGtm` itself is tested in
`tests/lib/gtm.test.ts`. Head contents that only a browser shows (favicon, styles applied)
are preview checks in the PR.
