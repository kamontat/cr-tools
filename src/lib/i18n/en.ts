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
		list: {
			newCode: "New code",
			search: "Search",
			allGoals: "All goals",
			sort: { newest: "Newest", oldest: "Oldest", money: "Highest average money", code: "Code A–Z" },
			copy: "Copy",
			share: "Share",
			copied: "Copied",
			empty: "No saved codes yet. Press New code to make one.",
			noMatch: "No saved code matches.",
			rounds: (n: number) => `${n} ${n === 1 ? "round" : "rounds"}`,
			average: "Average",
			columns: {
				code: "Code",
				loadout: "Loadout",
				note: "Note",
				goal: "Goal",
				money: "Average money",
				rounds: "Rounds",
				saved: "Saved",
			},
		},
		editor: {
			newTitle: "New code",
			editTitle: "Edit code",
			tabs: { main: "Main", cookies: "Cookies", treasures: "Treasures", boosts: "Boosts", runLog: "Run log" },
			save: "Save",
			update: "Update",
			more: "More",
			typeCode: "Type a code",
			reset: "Reset",
			help: "Help",
			note: "Note",
		},
		share: {
			title: "Share code",
			link: "Link",
			fullCode: "Full code",
			shareToApp: "Share to app",
			copy: "Copy",
		},
		help: {
			mode: "Slot 1. Whether you play the run yourself (Manual), it plays itself (Auto), or a mix of both (Semi-auto). An auto run turns semi-auto with Fast Start, a random boost, a jump at the start or a relay cookie.",
			goal: "Slots 2-3. What the run aims for: Score, Money, Exp or Box, or any mix of Money, Exp and Box. Score stands alone, and an auto run does not aim for it.",
			episode:
				"Slot 4. The episode the run is for, or Any. Special episodes take only what they use, so the slots they leave out read 0.",
			floor: "Slots 5-7, in Tower of Frozen Waves only. The tower floor, 1 to 100, or any floor.",
			action:
				"What you do as the run starts. A jump at the start shares slot 1 with the mode and makes the run semi-auto.",
			cookie:
				"The cookie you run with. The game keeps it itself, so the code carries it in the loadout in front of the 10 characters.",
			relay:
				"The cookie you swap in partway through, carried in the loadout. A relay is swapped by hand, so an auto run with one turns semi-auto.",
			pet: "The pet that runs with your cookie, carried in the loadout in front of the 10 characters.",
			treasures:
				"Up to three treasure slots, carried in the loadout. A slot can accept several treasures, and you choose whether their order matters.",
			boosts:
				"Slot 5. The boosts bought before the run - HP Extension, Power Jelly Boost, Fast Start and Double XP - as one character for the whole set.",
			randomBoost: "Slots 6-7. The random boost the run wants, or none.",
			cookiePower: "Slots 8-10. The cookie power+ selections, one slot per group, or none of a group.",
			rounds:
				"The money each round earned, so the list can show the average. It travels in the share link, not in the code.",
		},
	},
}
