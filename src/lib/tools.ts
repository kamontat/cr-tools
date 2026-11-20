/**
 * The one place that knows what tools exist. The slug drives the route
 * directory and the URL, so a tool cannot be registered under one name and
 * served under another.
 */
export type Tool = {
	readonly slug: string
	readonly name: string
	readonly tagline: string
	/** Shown in the sidebar and on the Home card; required, so a new tool fails `astro check` until it has one. */
	readonly icon: string
}

export const TOOLS = [
	{
		slug: "combi-name",
		name: "Combi name codes",
		tagline:
			"Pack a run configuration - type, episode, boosts, random boost, cookie power+, and action - into a 10-character combi name.",
		icon: "🍪",
	},
] as const satisfies readonly Tool[]

export type ToolSlug = (typeof TOOLS)[number]["slug"]

/**
 * One Astro page per tool, home page first, at the paths Astro routes from
 * `src/pages/`. Neither the build nor the dev server reads this - both take
 * the directory itself - so it exists for the tests, which assert the
 * directory and the registry name the same set of pages in both directions.
 */
export function pageEntrypoints(): string[] {
	return ["src/pages/index.astro", ...TOOLS.map(({ slug }) => `src/pages/${slug}/index.astro`)]
}
