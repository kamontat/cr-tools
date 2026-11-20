import type { ToolSlug } from "#lib/tools"

export const en = {
	site: {
		name: "Cookie Run tools",
		intro: "Small tools for what the game doesn't write down. Everything stays in your browser.",
	},
	frame: { menu: "Menu", nav: "Site", home: "Home", settings: "Settings", close: "Close", resize: "Resize panel" },
	tools: {
		"combi-name": {
			name: "Combi name codes",
			title: "Cookie Run combi codes",
			tagline:
				"Pack a run configuration - type, episode, boosts, random boost, cookie power+, and action - into a 10-character combi name.",
		},
	} as Record<ToolSlug, { name: string; title: string; tagline: string }>,
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
