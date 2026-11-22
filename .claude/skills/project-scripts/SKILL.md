---
name: project-scripts
description: Use when adding or changing a package script, editing anything under scripts/, running the dev server or the tests, or fixing a `pnpm run check` (astro check or Biome) failure. Covers where a script lives, how the Vitest projects divide the suite, what each check reads, and how TypeScript and Biome strictness interact.
---

# Scripts and checks

## Where a package script lives

A script that is just a command is that command in `package.json` — `astro dev`,
`astro check`, `biome check`, `vitest run`, `wrangler deploy`. `pnpm run` puts
`node_modules/.bin` on `PATH`, so the bare binary name resolves; don't write `pnpm exec` or
`npx` inside a script, and don't wrap a single command in a file under `scripts/`. Arguments
are forwarded by `pnpm run` itself, which is what keeps
`pnpm run test tests/lib/combi/codec.test.ts`, `pnpm run test -t "decodes every slot"` and
`pnpm run dev --port 4000` working.

**Every script runs on Node.js**, the runtime Astro, Vitest and Wrangler target.
`package.json` is the one place the toolchain is pinned: `devEngines.runtime` (Node.js) and
`devEngines.packageManager` (pnpm), both with `onFail: "download"`, so pnpm fetches the
exact versions itself. Bump a version there and in `volta.node` (kept equal to
`devEngines.runtime.version`); keep `engines.node` covering it. `mise.toml` pins nothing and
reads these through `idiomatic_version_file_enable_tools`, and CI's `pnpm/setup` reads them
too (`tests/config/toolchain.test.ts` fails when they drift, or when a Bun file, type or API
comes back). `pnpm-workspace.yaml` saves exact versions and lists in `allowBuilds` the
dependencies allowed to run install scripts; a new one that needs its script fails
`pnpm install` with `ERR_PNPM_IGNORED_BUILDS` until `pnpm approve-builds <name>` adds it.
Tests read files with `node:fs` (`readFile`, `existsSync`, `globSync`) and spawn with
`node:child_process`.

`check` is the one composite: `pnpm run check:type && pnpm run check:biome`, so a type error
stops before Biome runs. `format` is `biome check --unsafe --write` — read the diff after,
since unsafe fixes can change behaviour.

`astro` is a passthrough to the Astro CLI, so `pnpm run astro add <integration>` and
`pnpm run astro sync` work without an extra script.

A script that is a *program* is a file under `scripts/`, run with `node scripts/<name>.ts`
from a package script. Node.js strips the types, so use only erasable TypeScript syntax (no
`enum`, no parameter properties) and `node:` APIs. Plain Node.js does not resolve an
extensionless relative import, so the programs import each other through the `#scripts/*`
alias (`#scripts/utils/asset-ids`), which maps to `./scripts/*.ts`;
`tests/config/toolchain.test.ts` loads every `scripts/utils/` module under plain `node` to
prove it. There are exactly two: `pnpm run fetch:assets` syncs from
cookierunhub.com's JSON API and rewrites `public/assets/index.json`; `pnpm run verify:assets`
asks the site whether that file is still complete. They share `scripts/utils/`. See the
`project-assets` skill before touching either. No page imports from `scripts/`, so it never
reaches the bundle, and `check:type` covers it without any config change.

Where code lives: pages in `src/pages/`, layouts in `src/layouts/`, components in
`src/components/{atoms,molecules,organisms}/`, shared TypeScript in `src/lib/` (the combi
logic in `src/lib/combi/`), global CSS in `src/styles/`, static files in `public/`, tests in
`tests/` mirroring `src/` (`src/lib/gtm.ts` → `tests/lib/gtm.test.ts`) and `scripts/`
(`scripts/utils/hub-index.ts` → `tests/scripts/utils/hub-index.test.ts`), programs in
`scripts/`.

## Tests

`pnpm run test` is `vitest run`. `vitest.config.ts` wraps Astro's `getViteConfig` (so the
`#…` aliases, `.astro` and `.svelte` imports resolve) and divides `tests/` into two projects:

- `dom` — `tests/components/**` and `tests/lib/**`, in happy-dom. happy-dom is told never to
  fetch external scripts (such as `gtm.js`) and to report them as loaded instead.
- `node` — every other `tests/**/*.test.ts`: build output, config, layouts, pages, scripts,
  skills.

A new test lands in a project by where it sits; there is no `include` to update.
`tests/build/output.test.ts` runs a real `pnpm run build` in its `beforeAll`, and
`tests/lib/combi/exhaustive.test.ts` round-trips the whole combi space with a `300_000` ms
timeout, so the full suite takes a few minutes. `tests/skills.test.ts` checks every
directory under `.claude/skills/` is named `project-*` and its `SKILL.md` `name` matches.

## What `check:type` reads

`check:type` is `astro check`, which runs TypeScript over every `.astro` file *and* every
file `tsconfig.json` includes. It skips the `<script>` block of a `.svelte` file (see the
`project-components` skill). `tsconfig.json` extends `@kcconfigs/tsconfig` (Node.js types)
and then `astro/tsconfigs/strictest` (the later preset wins where they overlap), and
includes `.astro/types.d.ts` plus everything under the root, excluding `node_modules/`,
`dist/`, `.claude/` and `.superpowers/`. So `src/`, `tests/` and `scripts/` are all
typechecked with no `include` to maintain. `.astro/` is generated by `astro sync` (which
`dev`, `build` and `check` run for you) and is gitignored.

## The two checks are stricter together

`noUncheckedIndexedAccess` is on, so every index and regex capture arrives as
`T | undefined`. Narrow it with a destructuring default (`const [, href = ""] = match`),
`??`, or a `const` plus a guard — not with `!`, which Biome warns on outside test files.
`!` after `?.` is an error rather than a warning.

`noPropertyAccessFromIndexSignature` is on too: a property from an index signature
(`element.dataset.theme`, `process.env.FOO`) cannot be reached with a dot, so use the
subscript (`dataset["theme"]`) or `getAttribute`. `import.meta.env.PUBLIC_GTM_ID` works
with a dot only because `src/env.d.ts` declares it — declare every new `PUBLIC_*` variable
there, and read it with a dot: Vite replaces only the exact member expression, never a
computed `import.meta.env[name]`.

`exactOptionalPropertyTypes` is on: `{ name?: string }` does not accept
`{ name: undefined }`. Omit the key or widen the type to `string | undefined`.

`verbatimModuleSyntax` is on: a type-only import must be `import type`.

No TypeScript import carries a `.ts` extension; `.astro` and `.svelte` imports always carry
theirs. The aliases live in `package.json`'s `imports` field: `#lib/*` adds `.ts`
(`./src/lib/*.ts`); `#components/*` and `#layouts/*` map the path as written; `#assets/*`
maps to `./public/assets/*` unchanged, which is why `#assets/index.json` names its
extension; `#scripts/*` adds `.ts` (`./scripts/*.ts`).

## Biome

`check:biome` reports without touching anything; `format` applies fixes including unsafe
ones. `biome.json` extends `@kcconfigs/biome/configs/astro` (tabs, double quotes, no
semicolons where they are not needed, line width 120; Markdown with two-space indents) and
skips `.claude/`, `public/` and `docs/superpowers/` — the skills and plans are not
reformatted, nor is the generated asset index. `AGENTS.md`, `README.md` and `CHANGELOG.md`
are formatted. Import order is enforced by the organize-imports assist. `biome.json` is
plain JSON: a comment in it makes Biome refuse the whole config.

## Dev server

`pnpm run dev` serves on <http://localhost:4321> with hot reload; `pnpm run preview` serves
the built `dist/` on the same port without rebuilding — build first. Both take `--port`
and `--host`. `public/` is served at the root in both, so the icons answer at `/assets/...`.
