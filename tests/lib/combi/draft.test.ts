import type { SavedCode } from "#lib/combi/saved"

import { expect, test } from "vitest"

import {
	codeOf,
	draftFrom,
	draftFromCode,
	goalOptions,
	isDirty,
	limitsFor,
	newDraft,
	setAction,
	setEpisode,
	setFloor,
	setGoals,
	setMode,
	setNote,
	setOrdered,
	setRandomBoost,
	setRole,
	setStat,
	setTreasureSlot,
	tabBadges,
	tabEnabled,
	toggleBoost,
	toggleCookiePower,
	verdictOf,
} from "#lib/combi/draft"
import { treasurePick } from "#lib/combi/loadout"
import { thrownIssue } from "./issue-expect"

test("a new draft encodes to today's default code", () => {
	const draft = newDraft()

	expect(codeOf(draft)).toBe("1-MS0A000000")
	expect(draft.full.combi.goals).toEqual(["score"])
	expect(draft.full.combi.mode).toBe("manual")
	expect(draft.full.combi.episode).toBe("any")
	expect(draft).toMatchObject({ note: "", stats: {}, from: null })
})

test("choosing Special Episode 1 drops the relay and boosts", () => {
	let draft = setMode(newDraft(), "auto")
	draft = setRole(draft, "relay", "01")
	draft = toggleBoost(draft, "hpExtension")
	draft = setRandomBoost(draft, "doubleCoins")
	draft = toggleCookiePower(draft, "fairy")

	draft = setEpisode(draft, "special1")

	expect(limitsFor(draft)).toMatchObject({ boosts: false, relay: false, treasures: true })
	expect(draft.full.loadout.relay).toBeNull()
	expect(draft.full.combi.boosts).toEqual([])
	expect(draft.full.combi.randomBoost).toBeNull()
	expect(draft.full.combi.cookiePowers).toEqual([])
	// Held nowhere: the setters cannot pick what the episode refuses.
	expect(setRole(draft, "relay", "01").full.loadout.relay).toBeNull()
	expect(toggleBoost(draft, "hpExtension").full.combi.boosts).toEqual([])
})

test("score is exclusive and auto offers no score", () => {
	let draft = newDraft()
	expect(goalOptions(draft)).toEqual(["score", "money", "exp", "box"])

	// Adding a goal beside Score drops Score; picking Score drops the rest.
	draft = setGoals(draft, ["score", "money"])
	expect(draft.full.combi.goals).toEqual(["money"])
	draft = setGoals(draft, ["money", "exp"])
	expect(draft.full.combi.goals).toEqual(["money", "exp"])
	draft = setGoals(draft, ["exp", "money", "score"])
	expect(draft.full.combi.goals).toEqual(["score"])
	// At least one goal stays.
	expect(setGoals(draft, []).full.combi.goals).toEqual(["score"])

	// An auto run aiming for Score falls to the first goal it is offered.
	draft = setMode(draft, "auto")
	expect(goalOptions(draft)).toEqual(["money", "exp", "box"])
	expect(draft.full.combi.goals).toEqual(["money"])
	expect(setGoals(draft, ["score"]).full.combi.goals).toEqual(["money"])
})

test("the action is an auto run's alone", () => {
	expect(setAction(newDraft(), "jumpAtStart").full.combi.action).toBe("none")
	const auto = setAction(setMode(newDraft(), "auto"), "jumpAtStart")
	expect(auto.full.combi.action).toBe("jumpAtStart")
	expect(setMode(auto, "manual").full.combi.action).toBe("none")
})

test("the floor is the tower's, clamped to 1-100", () => {
	expect(setFloor(newDraft(), 12).full.combi.floor).toBeNull()
	const tower = setEpisode(newDraft(), "special2")
	expect(setFloor(tower, 12).full.combi.floor).toBe(12)
	expect(setFloor(tower, 250).full.combi.floor).toBe(100)
	expect(setFloor(tower, 0).full.combi.floor).toBeNull()
	expect(setFloor(tower, Number.NaN).full.combi.floor).toBeNull()
	expect(setFloor(tower, null).full.combi.floor).toBeNull()
})

test("a relay makes an auto run semi-auto, with reason relay", () => {
	expect(verdictOf(newDraft())).toBeNull()

	const auto = setMode(newDraft(), "auto")
	expect(verdictOf(auto)).toEqual({ semi: false, reasons: [] })

	const relayed = setRole(auto, "relay", "01")
	expect(verdictOf(relayed)).toEqual({ semi: true, reasons: ["relay"] })
	expect(codeOf(relayed)[codeOf(relayed).indexOf("-") + 1]).toBe("S")

	let every = toggleBoost(relayed, "fastStart")
	every = setRandomBoost(every, "revive")
	every = setAction(every, "jumpAtStart")
	expect(verdictOf(every)).toEqual({ semi: true, reasons: ["fastStart", "randomBoost", "action", "relay"] })
})

test("tab badges and disabled tabs follow the episode", () => {
	let draft = setMode(newDraft(), "auto")
	draft = setRole(draft, "cookie", "01")
	draft = setRole(draft, "relay", "01")
	draft = setTreasureSlot(draft, 0, [treasurePick("001")])
	draft = setTreasureSlot(draft, 2, [treasurePick("002")])
	draft = toggleBoost(draft, "hpExtension")
	draft = toggleBoost(draft, "doubleXp")
	draft = setRandomBoost(draft, "revive")
	draft = toggleCookiePower(draft, "fairy")

	expect(tabBadges(draft)).toEqual({ main: "", cookies: "2", treasures: "2/3", boosts: "4", runLog: "" })
	expect(tabEnabled(draft, "boosts")).toBe(true)
	expect(tabEnabled(draft, "treasures")).toBe(true)

	const special = setEpisode(draft, "special1")
	expect(tabBadges(special)).toEqual({ main: "", cookies: "1", treasures: "2/3", boosts: "", runLog: "" })
	expect(tabEnabled(special, "boosts")).toBe(false)
	expect(tabEnabled(special, "treasures")).toBe(true)

	const exp = setEpisode(draft, "specialExp")
	expect(tabBadges(exp).treasures).toBe("")
	expect(tabEnabled(exp, "treasures")).toBe(false)
	expect(tabEnabled(exp, "main")).toBe(true)
	expect(tabEnabled(exp, "cookies")).toBe(true)
	expect(tabEnabled(exp, "runLog")).toBe(true)

	expect(tabBadges(newDraft())).toEqual({ main: "", cookies: "", treasures: "0/3", boosts: "", runLog: "" })
})

test("treasure slots keep their picks, drop when emptied, and carry the order", () => {
	let draft = setTreasureSlot(newDraft(), 0, [treasurePick("001")])
	draft = setTreasureSlot(draft, 1, [treasurePick("002"), treasurePick("003", [1, 2])])
	expect(draft.full.loadout.treasures).toHaveLength(2)
	draft = setTreasureSlot(draft, 0, [])
	expect(draft.full.loadout.treasures).toEqual([[treasurePick("002"), treasurePick("003", [1, 2])]])
	expect(setOrdered(draft, true).full.loadout.ordered).toBe(true)
	expect(setTreasureSlot(draft, 5, [treasurePick("001")])).toBe(draft)
})

test("setters return a new draft and leave the old one alone", () => {
	const draft = newDraft()
	const next = setNote(setStat(draft, "money", { min: 1, max: 2 }), "farm")

	expect(next).not.toBe(draft)
	expect(draft.note).toBe("")
	expect(draft.stats).toEqual({})
	expect(next.note).toBe("farm")
	expect(next.stats).toEqual({ money: { min: 1, max: 2 } })
	expect(setStat(next, "money", null).stats).toEqual({})
})

const entry: SavedCode = {
	code: "1C01-MS0A000000",
	description: "farm run",
	stats: { money: { min: 12000, max: 15000 }, time: 245 },
	savedAt: 1,
}

test("draftFrom a saved entry carries its note and stats, and from", () => {
	const { draft, warnings } = draftFrom(entry)

	expect(warnings).toEqual([])
	expect(draft.from).toBe("1C01-MS0A000000")
	expect(draft.note).toBe("farm run")
	expect(draft.stats).toEqual(entry.stats)
	expect(draft.full.loadout.cookie).toBe("01")
	expect(codeOf(draft)).toBe(entry.code)
})

test("draftFromCode reads a bare code, its warnings, and a semi-auto mode as auto", () => {
	const semi = codeOf(setRandomBoost(setMode(newDraft(), "auto"), "revive"))
	const combi = semi.slice(semi.indexOf("-") + 1)
	expect(combi[0]).toBe("S")

	const { draft, warnings } = draftFromCode(`A${combi.slice(1)}`, "note", { time: 3 })
	expect(draft.from).toBeNull()
	expect(codeOf(draft)).toBe(semi)
	expect(draft.full.combi.mode).toBe("auto")
	expect(draft.note).toBe("note")
	expect(draft.stats).toEqual({ time: 3 })
	expect(warnings.map((w) => w.id)).toContain("autoButSemi")
})

test("draftFrom a code that no longer reads throws CodeError", () => {
	expect(thrownIssue(() => draftFrom({ ...entry, code: "1-QQ" })).id).toBe("codeLength")
})

test("isDirty is false for an unchanged entry and true after setNote", () => {
	const { draft } = draftFrom(entry)

	expect(isDirty(draft, entry)).toBe(false)
	expect(isDirty(setNote(draft, "farm run\n"), entry)).toBe(false)
	expect(isDirty(setNote(draft, "other"), entry)).toBe(true)
	expect(isDirty(setStat(draft, "time", 300), entry)).toBe(true)
	expect(isDirty(setRole(draft, "pet", "01"), entry)).toBe(true)
	expect(isDirty(draft, null)).toBe(true)
})
