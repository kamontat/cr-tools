import type { ToolSlug, ToolText } from "#lib/tools"

// Annotated, not cast: a registered tool missing here (or an unregistered one) fails `astro check`.
const tools: Record<ToolSlug, ToolText> = {
	"combi-name": {
		name: "Combi name codes",
		title: "Cookie Run combi codes",
		tagline:
			"Pack a run configuration - type, episode, boosts, random boost, cookie power+, and action - into a 10-character combi name.",
	},
}

export const en = {
	site: {
		name: "Cookie Run tools",
		intro: "Small tools for what the game doesn't write down. Everything stays in your browser.",
	},
	frame: { menu: "Menu", nav: "Site", home: "Home", settings: "Settings", close: "Close", resize: "Resize panel" },
	tools,
	settings: {
		title: "Settings",
		appearance: "Appearance",
		language: "Language",
		theme: "Theme",
		themes: { system: "System", dark: "Dark", light: "Light" },
		about: "About",
		rows: {
			environment: "Environment",
			built: "Built",
			source: "Source",
			commit: "Commit",
			changelog: "Changelog",
		},
		environments: { development: "Development", local: "Local", preview: "Preview", production: "Production" },
		unknown: "Unknown",
	},
}
