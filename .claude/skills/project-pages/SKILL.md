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

All three are placeholders on this branch: a `BaseLayout` and a heading. The redesign spec
(`docs/superpowers/specs/2026-11-19-site-redesign-design.md`) describes what each becomes.

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
`slug`, `name`, `tagline`. The slug is the directory and the URL, so a tool cannot be
registered under one name and served under another. `tests/lib/tools.test.ts` holds the
registry and the directory to each other in both directions: every slug has
`src/pages/<slug>/index.astro`, and every `src/pages/*/index.astro` is a registered tool or
`settings`. A tool page the registry does not name would build and ship with nothing linking
to it. The redesign's sidebar reads this registry.

## Steps

1. For a tool, add an entry to `TOOLS` in `src/lib/tools.ts`.
2. Create `src/pages/<slug>/index.astro`. Wrap the content in `BaseLayout`:

   ```astro
   ---
   import BaseLayout from "#layouts/BaseLayout.astro"
   ---

   <BaseLayout title="About">
   	<h1>About</h1>
   </BaseLayout>
   ```

   `BaseLayout` owns the `<html>` shell: `charset`, `viewport`, the favicon, the `<title>`,
   the global stylesheet and the Google Tag Manager script. A page never writes its own
   `<html>` or `<head>`.
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
7. Run `bun run build` and confirm the page appears in the `generating static routes` list,
   then `bun run preview` and open it.

## Example — a page composed from the tiers

```astro
---
import Seg from "#components/atoms/Seg.svelte"
import Panel from "#components/organisms/Panel.astro"
import BaseLayout from "#layouts/BaseLayout.astro"
---

<BaseLayout title="Settings">
	<h1>Settings</h1>
	<Panel heading="Appearance">
		<Seg client:only="svelte" options={["System", "Dark", "Light"]} />
	</Panel>
</BaseLayout>
```

(The components here are illustrations; none exists yet.)

- The copy and the `title` live here; nothing below the page hardcodes them.
- Data shared by several pages (the tool list) lives in `src/lib/`, not copied into each.
- A page is never imported by anything.

## What the tests catch

`tests/pages/pages.test.ts` reads every `.astro` under `src/pages/` and fails when one does
not render a `#layouts/*` layout, or renders one that does not reach `BaseLayout` (directly
or through other layouts). It also fails on any layout in `src/layouts/` that does not wrap
`BaseLayout`. So a new page or template cannot silently drop analytics or the global styles.
Extend that test when another line becomes mandatory on every page.

`tests/lib/tools.test.ts` catches a registry and a directory that disagree (above).
