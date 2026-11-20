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
page gutter). Home shows the title, a one-line intro and a `ToolCard` per registered tool;
Settings renders the `SettingsApp` island (Appearance and About); the combi page is still a
heading only. The redesign spec (`docs/superpowers/specs/2026-11-19-site-redesign-design.md`)
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
`slug`, `name`, `tagline`, `icon`. The slug is the directory and the URL, so a tool cannot be
registered under one name and served under another. `tests/lib/tools.test.ts` holds the
registry and the directory to each other in both directions: every slug has
`src/pages/<slug>/index.astro`, and every `src/pages/*/index.astro` is a registered tool or
`settings`. A tool page the registry does not name would build and ship with nothing linking
to it. The sidebar (`Sidebar.astro`) and Home's cards (`ToolCard.astro`) both read this
registry, icon included. `icon` is required by the `Tool` type, so a tool registered without
one fails `pnpm run check`. `FramePage` in `#lib/frame` is `"home" | "settings"` plus every
tool slug, so a new tool is a valid `current` as soon as it is registered.

## Steps

1. For a tool, add an entry to `TOOLS` in `src/lib/tools.ts` — `slug`, `name`, `tagline`
   and `icon`.
2. Create `src/pages/<slug>/index.astro`. Wrap the content in `AppLayout`, passing the
   page's `title` and `current` (its slug, `"home"` or `"settings"` — the sidebar marks that
   link as the current page):

   ```astro
   ---
   import AppLayout from "#layouts/AppLayout.astro"
   ---

   <AppLayout title="Cookie Run combi codes" current="combi-name">
   	<h1>Cookie Run combi codes</h1>
   </AppLayout>
   ```

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
import ToolCard from "#components/molecules/ToolCard.astro"
import AppLayout from "#layouts/AppLayout.astro"
import { TOOLS } from "#lib/tools"
---

<AppLayout title="Cookie Run tools" current="home">
	<h1>Cookie Run tools</h1>
	<p class="intro">Small tools for what the game doesn't write down. Everything stays in your browser.</p>
	<div class="tools">
		{TOOLS.map((tool) => <ToolCard {...tool} />)}
	</div>
</AppLayout>
```

A page whose content reads `localStorage` or reacts to input renders one Svelte island
instead, as Settings does: `<SettingsApp client:only="svelte" />` inside `AppLayout`.

- The copy and the `title` live here; nothing below the page hardcodes them.
- Data shared by several pages (the tool list) lives in `src/lib/`, not copied into each.
- A page is never imported by anything.

## What the tests catch

`tests/pages/pages.test.ts` reads every `.astro` under `src/pages/` and fails when one does
not render a `#layouts/*` layout, or renders one that does not reach `BaseLayout` (directly
or through other layouts). It also fails on any layout in `src/layouts/` that does not wrap
`BaseLayout`. So a new page or template cannot silently drop analytics or the global styles.
It also fails when a page does not reach `AppLayout`, so no page ships without the frame.
Extend that test when another line becomes mandatory on every page.

`tests/lib/tools.test.ts` catches a registry and a directory that disagree (above).
