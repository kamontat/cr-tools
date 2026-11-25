---
name: project-pages
description: Use when adding or editing a page or route under src/pages/ (the atomic pages tier), adding a tool to the TOOLS registry in src/lib/tools.ts, writing page copy, linking between pages, or when a page fails tests/lib/tools.test.ts or tests/pages/pages.test.ts, builds but paints unstyled, has no Google Tag Manager, or 404s after deploy.
---

# Pages

Pages are the *pages* tier of Atomic Design: a layout (template) filled with real content.
A page holds the copy and data; layouts (`project-layouts` skill) arrange it, and components
(`project-components` skill) render it.

## The pages today

| Source | URL | What |
|---|---|---|
| `src/pages/index.astro` | `/` | Home |
| `src/pages/combi-name/index.astro` | `/combi-name/` | The combi tool |
| `src/pages/settings/index.astro` | `/settings/` | Settings — part of the site, not a tool |

Every page renders in `AppLayout` (the frame: top bar, sidebar, environment line and the
page gutter). Home shows the title, a one-line intro, the `HomeSaved` island (the latest three saved codes, hidden when there are none, `client:only="svelte"`) and a `ToolCard` per registered tool;
Settings renders the `SettingsApp` island (Appearance and About); the combi page renders its
heading and the `CombiApp` island (the saved list, the editor, Share), in `AppLayout`'s `wide`
wrapper. The redesign spec (`docs/superpowers/specs/2026-11-19-site-redesign-design.md`)
describes what it becomes.

## How routes map

Astro's file-based routing: every `.astro` (or `.md`) file under `src/pages/`, at any depth,
is a route — the path under `src/pages/` without the extension, with `index.astro` answering
its own directory. Files and directories starting with `_` are not routes.

`astro.config.ts` sets `build.format: "directory"` and `trailingSlash: "ignore"`, so
`combi-name/index.astro` lands at `dist/combi-name/index.html` and answers both
`/combi-name/` and `/combi-name`. Keep every page as `<slug>/index.astro`: links people
already shared look like `/combi-name/#CODE?note=…`, and that folder is what keeps them
opening with the hash intact (see `project-deploy`). `tests/build/output.test.ts` checks the
folder shape.

Dynamic routes (`[slug].astro`) need `getStaticPaths()` because the site is built with
`output: "static"`; without it `astro build` fails.

## The tool registry

Every page except Home and Settings is a tool, listed in `TOOLS` in `src/lib/tools.ts` —
`slug` and `icon`, nothing else. Its words — `name` (sidebar and card), `title` (the page)
and `tagline` (the card) — are copy, so they live in both catalogues under `tools[slug]`
(`src/lib/i18n/en.ts`, `th.ts`); `en.ts` types that map `Record<ToolSlug, ToolText>`, so a
tool missing from it fails `pnpm run check`, and `tests/lib/tools.test.ts` checks both
catalogues name every slug. The slug is the directory and the URL, so a tool cannot be
registered under one name and served under another. `tests/lib/tools.test.ts` holds the
registry and the directory to each other in both directions: every slug has
`src/pages/<slug>/index.astro`, and every `src/pages/*/index.astro` is a registered tool or
`settings`. A tool page the registry does not name would build and ship with nothing linking
to it. The sidebar (`Sidebar.astro`) and Home's cards (`ToolCard.astro`) both read this
registry, icon included. `icon` is required by the `Tool` type, so a tool registered without
one fails `pnpm run check`. `FramePage` in `#lib/frame` is `"home" | "settings"` plus every
tool slug, so a new tool is a valid `current` as soon as it is registered.

## Steps

1. For a tool, add an entry to `TOOLS` in `src/lib/tools.ts` — `slug` and `icon` — and
   `tools[slug]` (`name`, `title`, `tagline`) to both `src/lib/i18n/en.ts` and `th.ts`.
2. Create `src/pages/<slug>/index.astro`. Wrap the content in `AppLayout`, passing the
   page's `title` (a `Pick`) and `current` (its slug, `"home"` or `"settings"` — the
   sidebar marks that link as the current page):

   ```astro
   ---
   import type { Pick } from "#lib/i18n/messages"

   import CombiApp from "#components/organisms/CombiApp.svelte"
   import AppLayout from "#layouts/AppLayout.astro"

   const title: Pick = (m) => m.tools["combi-name"].title
   ---

   <AppLayout title={title} current="combi-name" wide>
   	<CombiApp client:only="svelte" />
   </AppLayout>
   ```

   The top bar shows `title` as the page's one `<h1>`. A page never repeats its title in
   a heading of its own; its sections start at `<h2>`.

   `AppLayout` puts the page inside the frame — top bar, sidebar, environment line — and
   inside `main > .wrap`, the one page gutter (padding and max width), so a page never pads
   its own outer edge. It wraps `BaseLayout`, which owns the `<html>` shell: `charset`,
   `viewport`, the favicon, the `<title>`, the theme boot, the global stylesheet and the
   Google Tag Manager script. A page never writes its own `<html>` or `<head>`, and never
   renders `BaseLayout` directly — it would ship without the frame.
3. Import components and layouts through the `#components/*` and `#layouts/*` aliases,
   with the `.astro` or `.svelte` extension. An interactive Svelte component that reads
   `localStorage` or reacts to input is rendered with `client:only="svelte"` — nothing is
   rendered on a server.
4. Link between pages with root-relative links that end in a slash — `/combi-name/`,
   `/settings/`, `/` — the form the folder build serves directly.
5. Never give a region or id a name containing "cookie", "consent" or "gdpr" — content
   blockers hide it (see `project-components`).
6. Files no page imports (icons, `robots.txt`) go in `public/` and are copied to the root of
   `dist/` as-is.
7. Run `pnpm run build` and confirm the page appears in the `generating static routes` list,
   then `pnpm run preview` and open it.

## Example — a page composed from the tiers

Home (`src/pages/index.astro`):

```astro
---
import Text from "#components/atoms/Text.astro"
import ToolCard from "#components/molecules/ToolCard.astro"
import HomeSaved from "#components/organisms/HomeSaved.svelte"
import AppLayout from "#layouts/AppLayout.astro"
import { TOOLS } from "#lib/tools"
---

<AppLayout title={(m) => m.site.name} current="home">
	<p class="intro"><Text pick={(m) => m.site.intro} /></p>
	<HomeSaved client:only="svelte" />
	<div class="tools">
		{TOOLS.map((tool) => <ToolCard {...tool} />)}
	</div>
</AppLayout>
```

A page whose content reads `localStorage` or reacts to input renders one Svelte island
instead, as Settings does: `<SettingsApp client:only="svelte" />` inside `AppLayout`.

- The page chooses which strings it shows; the strings themselves live in the catalogues.
  Nothing below the page hardcodes them.
- Data shared by several pages (the tool list) lives in `src/lib/`, not copied into each.
- A page is never imported by anything.

## Text in two languages

The site is Thai by default and English on request. There are no hard-coded strings in
components, layouts or pages: page copy is a key in `src/lib/i18n/en.ts` and `th.ts`, and
the page names it with a `Pick` — `(m) => m.site.intro`. Visible text is
`<Text pick={…} />` (both `data-lang` spans; `lang.css` hides the other), an attribute is
`{...l10nAttr("aria-label", pick)}`, a value a component renders itself is `both(pick)`,
and the `title` passed to `AppLayout` is a `Pick`. The `project-components` skill's "Text
in two languages" has the details. A new string goes into both catalogues at once;
`tests/lib/i18n/messages.test.ts` fails when they name different keys.

## What the tests catch

`tests/pages/pages.test.ts` reads every `.astro` under `src/pages/` and fails when one does
not render a `#layouts/*` layout, or renders one that does not reach `BaseLayout` (directly
or through other layouts). It also fails on any layout in `src/layouts/` that does not wrap
`BaseLayout`. So a new page or template cannot silently drop analytics or the global styles.
It also fails when a page does not reach `AppLayout`, so no page ships without the frame.
Extend that test when another line becomes mandatory on every page.

`tests/lib/tools.test.ts` catches a registry and a directory that disagree (above).
