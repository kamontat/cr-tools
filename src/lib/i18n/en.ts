import type { Action, Goal, Mode } from "#lib/combi/codec"
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

// Annotated like `tools`: a goal, mode or action the codec gains fails `astro check` until it is worded.
const goals: Record<Goal, string> = { score: "Score", money: "Money", exp: "Exp", box: "Box" }
const modes: Record<Mode, string> = { manual: "Manual", auto: "Auto", semiauto: "Semi-auto" }
const actions: Record<Action, string> = { none: "No action", jumpAtStart: "Jump at start" }

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
	combi: {
		goals,
		modes,
		actions,
		describe: {
			none: "None",
			anyGoal: "Any goal",
			goalsJoin: " + ",
			anyEpisode: "Any episode",
			anyFloor: "Any floor",
			floor: (n: number) => `Floor ${n}`,
			notUsed: "Not used in this episode",
			relayCookie: "Relay cookie",
			retired: (name: string) => `${name} (no longer listed)`,
			orTreasure: " or ",
			fields: {
				goal: "Goal",
				mode: "Mode",
				episode: "Episode",
				floor: "Floor",
				boosts: "Boosts",
				randomBoost: "Random boost",
				cookiePower: "Cookie power+",
				action: "Action",
				cookie: "Cookie",
				relay: "Relay",
				pet: "Pet",
				treasures: "Treasures",
				treasuresOrdered: "Treasures (exact order)",
			},
		},
		hints: {
			slot1Mode: "Slot 1 · Mode",
			slots23Goal: "Slots 2-3 · Goal",
			slot4Episode: "Slot 4 · Episode",
			slots57Floor: "Slots 5-7 · Floor",
			slots810Reserved: "Slots 8-10 · Reserved",
			slots510Boosts: "Slots 5-10 · Boosts",
			slot5Boosts: "Slot 5 · Boosts",
			slots67RandomBoost: "Slots 6-7 · Random boost",
			slots810CookiePower: "Slots 8-10 · Cookie power+",
			formatVersion: "Format version",
			treasureOrder: "Treasure order",
			treasureSlot: (n: number) => `Treasure slot ${n}`,
			separator: "Separates the loadout from the combi name",
		},
	},
}
