import { expect, test } from "vitest"

import {
	ALL_ACTIONS,
	ALL_BOOSTS,
	ALL_COOKIE_POWERS,
	ALL_EPISODES,
	ALL_GOALS,
	ALL_MODES,
	ALL_RANDOM_BOOSTS,
} from "#lib/combi/codec"
import { BOOST_LABELS, COOKIE_POWER_LABELS, EPISODE_LABELS, RANDOM_BOOST_LABELS } from "#lib/combi/labels"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"

type LabelTable = {
	field: string
	labels: Record<string, string>
	values: readonly string[]
}

const TABLES: LabelTable[] = [
	{ field: "goal (en)", labels: en.combi.goals, values: ALL_GOALS },
	{ field: "goal (th)", labels: th.combi.goals, values: ALL_GOALS },
	{ field: "mode (en)", labels: en.combi.modes, values: ALL_MODES },
	{ field: "mode (th)", labels: th.combi.modes, values: ALL_MODES },
	{ field: "episode", labels: EPISODE_LABELS, values: ALL_EPISODES },
	{ field: "boost", labels: BOOST_LABELS, values: ALL_BOOSTS },
	{
		field: "random boost",
		labels: RANDOM_BOOST_LABELS,
		values: ALL_RANDOM_BOOSTS,
	},
	{
		field: "cookie power+",
		labels: COOKIE_POWER_LABELS,
		values: ALL_COOKIE_POWERS,
	},
	{ field: "action (en)", labels: en.combi.actions, values: ALL_ACTIONS },
	{ field: "action (th)", labels: th.combi.actions, values: ALL_ACTIONS },
]

test("every value of every field has a label, with no leftover keys", () => {
	for (const { field, labels, values } of TABLES) {
		expect(Object.keys(labels).sort(), `${field} keys`).toEqual([...values].sort())
		for (const value of values) {
			expect(labels[value], `${field} label for ${value}`).toBeTruthy()
		}
	}
})

test("labels read the way the game words them", () => {
	expect(en.combi.modes.semiauto).toBe("Semi-auto")
	expect(EPISODE_LABELS.specialExp).toBe("Special Exp Episode")
	expect(RANDOM_BOOST_LABELS.revive).toBe("Revive once with 80 HP")
	expect(COOKIE_POWER_LABELS.seaFairy).toBe("Sea Fairy Cookie")
	expect(en.combi.actions.jumpAtStart).toBe("Jump at start")
	expect(BOOST_LABELS.powerJellyBoost).toBe("Power Jelly Boost")
})
