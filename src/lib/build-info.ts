/**
 * What the page says about itself: which environment it runs in, which commit
 * it was built from, when, and for a preview which pull request and branch.
 *
 * The values arrive as `PUBLIC_*` variables that Astro inlines at build time
 * (see `src/env.d.ts`), plus `import.meta.env.DEV`, which is true under
 * `astro dev`. A local build sets none of the `PUBLIC_*` ones, so every field
 * is nullable by design rather than by caution.
 */
export const REPO_URL = "https://github.com/kamontat/cr-tools"
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`

export type Environment = "development" | "local" | "preview" | "production"

/** The inlined strings, as they arrive: absent, empty, or a value. */
export type BuildEnv = {
	dev: boolean
	deploy?: string | undefined
	commit?: string | undefined
	builtAt?: string | undefined
	pr?: string | undefined
	branch?: string | undefined
}

export type BuildInfo = {
	readonly environment: Environment
	readonly commit: string | null
	readonly shortCommit: string | null
	readonly commitUrl: string | null
	readonly builtAt: Date | null
	readonly pr: number | null
	readonly branch: string | null
}

/**
 * Vite replaces these exact member expressions and nothing else, so each read
 * is written out literally - a computed `import.meta.env[name]` is not
 * replaced.
 */
function inlinedEnv(): BuildEnv {
	return {
		dev: import.meta.env.DEV === true,
		deploy: import.meta.env.PUBLIC_DEPLOY_ENV,
		commit: import.meta.env.PUBLIC_COMMIT_SHA,
		builtAt: import.meta.env.PUBLIC_BUILT_AT,
		pr: import.meta.env.PUBLIC_PR_NUMBER,
		branch: import.meta.env.PUBLIC_BRANCH,
	}
}

const environmentOf = (env: BuildEnv): Environment => {
	if (env.dev) return "development"
	if (env.deploy === "preview" || env.deploy === "production") return env.deploy
	return "local"
}

/**
 * Defaults its argument to the build's inlined environment: every caller
 * would otherwise pass the same thing, and the tests are the only caller that
 * ever passes anything else.
 */
export function readBuildInfo(env: BuildEnv = inlinedEnv()): BuildInfo {
	const commit = env.commit ? env.commit : null
	const parsed = env.builtAt ? new Date(env.builtAt) : null
	const pr = env.pr && /^\d+$/.test(env.pr) ? Number(env.pr) : null

	return {
		environment: environmentOf(env),
		commit,
		shortCommit: commit === null ? null : commit.slice(0, 7),
		commitUrl: commit === null ? null : `${REPO_URL}/commit/${commit}`,
		builtAt: parsed !== null && !Number.isNaN(parsed.getTime()) ? parsed : null,
		pr: pr !== null && pr > 0 ? pr : null,
		branch: env.branch ? env.branch : null,
	}
}

export type AboutRow = {
	readonly key: "environment" | "built" | "source" | "commit" | "changelog"
	readonly text: string
	readonly href?: string
}

const LABELS: Record<Environment, string> = {
	development: "Development",
	local: "Local",
	preview: "Preview",
	production: "Production",
}

/**
 * The rows the About panel shows. `built` carries the raw ISO instant; the
 * page formats it in the viewer's time zone. An unknown build time reads
 * "Unknown", and a missing commit drops its row.
 */
export function aboutRows(info: BuildInfo): AboutRow[] {
	const { environment } = info
	const rows: AboutRow[] = []

	rows.push({ key: "environment", text: LABELS[environment] })

	if (environment !== "development") {
		rows.push({ key: "built", text: info.builtAt === null ? "Unknown" : info.builtAt.toISOString() })
	}

	const source =
		environment === "preview"
			? [info.branch, info.pr === null ? null : `#${info.pr}`].filter((part) => part !== null)
			: []
	rows.push({
		key: "source",
		text: source.length > 0 ? source.join(" · ") : "kamontat/cr-tools",
		href: environment === "preview" && info.pr !== null ? `${REPO_URL}/pull/${info.pr}` : REPO_URL,
	})

	if ((environment === "preview" || environment === "production") && info.shortCommit !== null) {
		rows.push({ key: "commit", text: info.shortCommit, ...(info.commitUrl && { href: info.commitUrl }) })
	}

	if (environment === "production") {
		rows.push({ key: "changelog", text: "CHANGELOG.md", href: CHANGELOG_URL })
	}

	return rows
}
