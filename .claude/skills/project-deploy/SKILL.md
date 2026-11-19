---
name: project-deploy
description: Use when changing `bun run build`, `bun run dev`, `bun run preview`, astro.config.ts, public/ or public/.assetsignore, wrangler.jsonc, the dist/ output shape, the PUBLIC_* build variables, or anything under .github/workflows/ — including bumping a pinned action SHA or debugging a Cloudflare deploy.
---

# Build and deployment

## Build

`dev`, `build` and `preview` are each one `astro` command in `package.json`, with no wrapper
script, run on the Bun runtime through `bunfig.toml`'s `[run] bun = true` (see the
`project-scripts` skill). `astro build` renders every route under `src/pages/` (see the
`project-pages` skill) to static HTML in `dist/`, with bundled scripts and styles in
`dist/_astro/` under hashed names, and copies `public/` to the root of `dist/` unchanged.
Astro empties `dist/` before each build, so no stale file from an earlier build reaches a
deploy.

`astro.config.ts` fixes the output shape:

- `output: "static"` — no server code, no adapter. Adding an adapter or `output: "server"`
  turns the deploy into a Worker script, which `wrangler.jsonc` is not set up for, and the
  redesign's constraints rule it out.
- `build.format: "directory"` — `combi-name/index.astro` becomes
  `dist/combi-name/index.html`, served at `/combi-name/`. This differs from the template's
  `"file"` on purpose: links people already shared look like `/combi-name/#CODE?note=…`, and
  a redirect cannot see the hash, so the folder form is what keeps them opening.
- `trailingSlash: "ignore"` — `/combi-name` and `/combi-name/` both answer.
- `integrations: [svelte()]` — `@astrojs/svelte`, with `svelte.config.js` adding
  `vitePreprocess` for TypeScript in `.svelte` files.

`tests/build/output.test.ts` runs a real build and checks the folder shape and the icons
(below), so a config change that breaks either fails the suite.

Small scripts and stylesheets are inlined into the HTML rather than written to `_astro/`
(Vite's `assetsInlineLimit`), so a page can ship with no separate JS file at all. A grep for
something baked into a script must read the HTML as well as `_astro/*.js`.

### Icons

`public/assets/` holds the cookie, pet, treasure, boost and episode icons; the build copies
them to `dist/assets/`, served at `/assets/...` in dev and production alike. They are never
inlined. `public/.assetsignore` names `assets/index.json` (a path inside `dist/`), so the deploy leaves the catalog
index out — pages bundle it already. See the `project-assets` skill.

### Build variables

`import.meta.env.PUBLIC_*` is replaced at build time from the environment (or a `.env`
file). Each is declared on `ImportMetaEnv` in `src/env.d.ts`. Unset at build time, the
reference becomes `undefined`. Variables without the `PUBLIC_` prefix are available in
frontmatter at build time but never reach the browser.

| Variable | Set by | Read by |
|---|---|---|
| `PUBLIC_DEPLOY_ENV` | both deploy workflows: `preview` or `production` | `src/lib/build-info.ts` |
| `PUBLIC_COMMIT_SHA` | production: `github.sha`; preview: `github.event.pull_request.head.sha` | `build-info.ts` |
| `PUBLIC_BUILT_AT` | both deploy workflows' `stamp` step; `astro.config.ts` for any other `astro build` | `build-info.ts` |
| `PUBLIC_PR_NUMBER`, `PUBLIC_BRANCH` | preview only | `build-info.ts` |
| `PUBLIC_GTM_ID` | production only, from the `GTM_ID` repository variable | `BaseLayout` via `#lib/gtm` |

`build-info.ts` turns them into `readBuildInfo()`: an `Environment` (`development` under
`astro dev`, `preview` / `production` from `PUBLIC_DEPLOY_ENV`, `local` otherwise), the
commit and its link, the build time, and for a preview the PR and branch. `aboutRows`
formats them for an About panel. Nothing renders them yet; the redesign's frame (environment
line, Settings → About) will. The preview uses the PR's head SHA because on a
`pull_request` event `github.sha` is the merge commit the runner checked out, which exists
nowhere on GitHub and whose link would 404.

`astro.config.ts` sets `PUBLIC_BUILT_AT` to the current time when the command is a build and
the variable is unset, so a local build still says when it ran; `astro dev` is not a build
and stays without a time. `main.yml` sets none of them: it builds to check that the build
works, and nothing is served from it.

`dist/` is what Cloudflare serves — `wrangler.jsonc` names it as `assets.directory` — so
its shape is part of the deployment contract, not a local convenience.

## Deployment

The site is a Cloudflare Worker serving static assets. `wrangler.jsonc` names the Worker
`cr-tools`, sets `build.command` to `bun run build` and points `assets.directory` at
`dist/`, so wrangler runs the build itself and neither deploy workflow builds beforehand.
Every `PUBLIC_*` variable therefore goes on the `cloudflare/wrangler-action` step's `env`,
since wrangler runs the build as its own child.

Four workflows, each pinning every action to a full commit SHA with the release tag in a
trailing comment:

- `main.yml` — every push: install, `bun run check`, `bun run build`, `bun run test`.
- `deploy-preview.yml` — pull requests: `wrangler versions upload --preview-alias
  pr-<number>`, reporting into the `preview` environment at
  `https://pr-<number>-cr-tools.kcinth.workers.dev/`.
- `deploy-production.yml` — pushes to `main`: `wrangler deploy`, reporting into the
  `production` environment at `https://cr-tools.kc.in.th`.
- `assets.yml` — Mondays at 06:00 UTC and on `workflow_dispatch`: `bun run verify:assets`.
  The only workflow that reaches cookierunhub.com, and deliberately not part of `main.yml`:
  it fails whenever the site gains an entry.

Each deploy workflow's `environment.url` is only the link GitHub shows on the deployment;
wrangler does not read it. It is built by hand because the action's `deployment-url` output
knows neither preview aliases nor custom domains, so it must be edited whenever the Worker
name, the workers.dev subdomain (`kcinth`) or the custom domain (`cr-tools.kc.in.th`)
changes. `tests/lib/deploy.test.ts` holds both URLs to the Worker name in `wrangler.jsonc`
and the production URL to the custom domain, and checks each deploy workflow passes its
`PUBLIC_DEPLOY_ENV`, so a rename that misses one fails the suite.

Both deploy workflows need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets, and grant `deployments: write` on the job rather than at the top — the files open
with `permissions: {}` and hand back only what each job needs. Keep that shape in anything
new.

Bun's local version is pinned in `mise.toml`; keep any CI pin in sync with it.

A pinned SHA is bumped by resolving the tag again, never by hand:

```sh
gh api repos/actions/checkout/releases/latest --jq .tag_name   # e.g. v7.0.1
gh api repos/actions/checkout/commits/v7.0.1 --jq .sha         # the SHA to pin
```

Update the trailing comment in the same edit — a stale comment is worse than none, since it
is the only readable record of which version the SHA is.

Pushing any change under `.github/workflows/` needs a token with the `workflow` scope:
`gh auth refresh -h github.com -u kamontat -s workflow`. Run `gh` as the personal account
(`GH_TOKEN=$(gh auth token --user kamontat)`, see `project-shipping`).

## Google Tag Manager

Container `GTM-KXNDQVC3`, production only. `deploy-production.yml` sets
`PUBLIC_GTM_ID: ${{ vars.GTM_ID }}` on the wrangler step; `deploy-preview.yml` deliberately
does not, so previews never send analytics. An unset `GTM_ID` variable arrives as `""`,
which `loadGtm` rejects, so GTM is simply off. Changing the container means changing the
variable and re-running `Deploy Production` — the ID is baked into the build, not read at
runtime. To confirm a deploy carries it, grep the page for the ID: the script is small
enough that Astro inlines it into the HTML. A build without an ID has no GTM code at all,
because the bundler drops the call it can prove does nothing.

## Debugging a failed deploy

- `gh run view <id> --log-failed` first; quote the decisive line.
- `Authentication error` / `10000`: the token is an account API token scoped to one Worker
  with **Editor**. Check it is scoped to the Worker named in `wrangler.jsonc` (a renamed
  Worker needs a new token), lives in the `CLOUDFLARE_ACCOUNT_ID` account, and has
  **Workers Routes: Edit** on the zone, since the production URL is a custom domain
  attached outside `wrangler.jsonc`. A Worker-scoped token cannot create a Worker: a new
  Worker name needs one local `bunx wrangler deploy` under `wrangler login` first.
- Deploy passed but the page is unstyled or broken: open the browser console. A 404 on an
  `/_astro/` file means a stale or partial `dist/`; a 404 on the page itself means no file
  under `src/pages/` maps to that path (see `project-pages`); a 404 on an icon means it is
  not under `public/assets/`.
