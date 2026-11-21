import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { expect, test } from "vitest"

import { nameFor } from "#lib/combi/catalog"
import { combiSectionOf, encodeFull } from "#lib/combi/full-code"
import {
	averageMoney,
	filterList,
	goalTargets,
	LIST_SORT_KEY,
	readListSort,
	rowBoosts,
	rowEpisode,
	rowFull,
	rowGoals,
	rowLoadout,
	rowTeam,
	sortList,
	writeListSort,
} from "#lib/combi/list"
import { emptyLoadout, type Loadout, levelRange, treasurePick } from "#lib/combi/loadout"

const combi: Combi = {
	goals: ["score"],
	mode: "manual",
	episode: "any",
	floor: null,
	boosts: [],
	randomBoost: null,
	cookiePowers: [],
	action: "none",
}

const full = (loadout: Partial<Loadout> = {}, over: Partial<Combi> = {}) =>
	encodeFull({ loadout: { ...emptyLoadout(), ...loadout }, combi: { ...combi, ...over } })

const entry = (code: string, over: Partial<SavedCode> = {}): SavedCode => ({
	code,
	description: "",
	savedAt: 1,
	...over,
})

function storage(initial: string | null = null): Storage {
	let held = initial
	return {
		getItem: () => held,
		setItem: (_key: string, value: string) => {
			held = value
		},
	} as unknown as Storage
}

test("sorts by average money, empty last", () => {
	const a = entry("1-MS0A000000", { stats: { money: { min: 10, max: 20 } } })
	const b = entry("1-MS0A000000", { stats: { money: { min: 30, max: 30 } }, savedAt: 2 })
	const c = entry("1-MS0A000000", { savedAt: 3 })

	expect(averageMoney(a)).toBe(15)
	expect(averageMoney(c)).toBeNull()
	expect(sortList([c, a, b], "money")).toEqual([b, a, c])
})

test("newest and oldest sort by save time", () => {
	const a = entry("1-MS0A000000", { savedAt: 1 })
	const b = entry("1-MS0A000000", { savedAt: 2 })
	expect(sortList([a, b], "newest")).toEqual([b, a])
	expect(sortList([b, a], "oldest")).toEqual([a, b])
})

test("Code A–Z sorts by the 10 characters, then the full code", () => {
	const x = entry(full({ cookie: "01" }))
	const y = entry(full({ cookie: "06" }))
	const small = entry("1-JX035RV000")
	expect(x.code.split("-")[1]).toBe(y.code.split("-")[1])
	expect(combiSectionOf(small.code) < combiSectionOf(x.code)).toBe(true)
	const pair = [x, y].sort((p, q) => (p.code < q.code ? -1 : 1))
	expect(sortList([y, x, small], "code")).toEqual([small, ...pair])
})

test("search matches the cookie name, the note and the code, every word", () => {
	const code = full({ cookie: "01" })
	const e = entry(code, { description: "Night farm" })
	const cookie = nameFor("cookies", "01")

	expect(filterList([e], cookie.toUpperCase(), "all")).toEqual([e])
	expect(filterList([e], "night", "all")).toEqual([e])
	expect(filterList([e], code.slice(0, 5), "all")).toEqual([e])
	expect(filterList([e], `night ${cookie}`, "all")).toEqual([e])
	expect(filterList([e], "night zzzznope", "all")).toEqual([])
})

test("search matches the pet name", () => {
	const e = entry(full({ pet: "06" }))
	expect(filterList([e], nameFor("pets", "06"), "all")).toEqual([e])
})

test("goal filter keeps runs aiming for it", () => {
	const e = entry(full({}, { goals: ["money", "exp"], mode: "auto" }))

	expect(filterList([e], "", "money")).toEqual([e])
	expect(filterList([e], "", "exp")).toEqual([e])
	expect(filterList([e], "", "score")).toEqual([])
	expect(filterList([e], "", "all")).toEqual([e])
})

test("an entry that no longer reads still lists", () => {
	const bad = entry("not-a-code-at-all-x", { description: "old" })

	expect(filterList([bad], "", "all")).toEqual([bad])
	expect(filterList([bad], "old", "all")).toEqual([bad])
	expect(filterList([bad], "", "score")).toEqual([])
	expect(rowLoadout(bad.code)).toBeNull()
})

test("row loadout: icons, round pet, +n for alternatives, no src for Any", () => {
	const code = full({
		cookie: "01",
		pet: "06",
		treasures: [[treasurePick("001", levelRange(0)), treasurePick("002", levelRange(0))], [treasurePick("001")]],
		ordered: true,
	})
	const row = rowLoadout(code)

	expect(row?.cookie?.src?.startsWith("/assets/")).toBe(true)
	expect(row?.cookie?.name).toBeTruthy()
	expect(row?.pet?.round).toBe(true)
	expect(row?.pet?.src?.startsWith("/assets/")).toBe(true)
	expect(row?.treasures[0]?.more).toBe(1)
	expect(row?.treasures[1]?.more).toBeUndefined()
	expect(row?.treasures[0]?.src?.startsWith("/assets/")).toBe(true)

	const any = rowLoadout(full({ cookie: "__" }))
	expect(any?.cookie).toEqual({ src: null, name: "Any cookie" })
	expect(rowLoadout(full())?.cookie).toBeNull()
})

test("same 10 characters, different loadouts, different icons", () => {
	expect(rowLoadout(full({ cookie: "01" }))).not.toEqual(rowLoadout(full({ cookie: "06" })))
})

test("list sort is remembered; anything else reads newest", () => {
	const held = storage()
	expect(readListSort(held)).toBe("newest")
	writeListSort("money", held)
	expect(readListSort(held)).toBe("money")
	expect(readListSort(storage("bogus"))).toBe("newest")
	expect(readListSort(null)).toBe("newest")
	expect(LIST_SORT_KEY).toBe("combi-name:list-sort")
})

test("row goals: the goals a code aims for, or null when it does not read", () => {
	expect(rowGoals(full({}, { goals: ["money", "box"] }))).toEqual(["money", "box"])
	expect(rowGoals("not a code")).toBeNull()
})

test("a code is decoded once, however often the list asks", () => {
	const code = full({}, { goals: ["money", "box"] })
	expect(rowGoals(code)).toBe(rowGoals(code))
})

test("row episode: the episode a code runs, or null when it does not read", () => {
	expect(rowEpisode(full({}, { episode: "any" }))).toBe("any")
	expect(rowEpisode("not a code")).toBeNull()
})

test("row team: each set piece once, in play order, with every treasure a slot accepts and its levels", () => {
	const code = full({
		cookie: "01",
		relay: "06",
		pet: "06",
		treasures: [[treasurePick("001", levelRange(0)), treasurePick("002", [0, 1, 2, 9])], [treasurePick("001")]],
		ordered: true,
	})
	const team = rowTeam(code)
	expect(team?.map((piece) => piece.role)).toEqual(["cookie", "relay", "pet", "treasure", "treasure"])
	expect(team?.[0]?.picks[0]?.icon.name).toBe(rowLoadout(code)?.cookie?.name)
	expect(team?.[2]?.picks[0]?.icon.round).toBe(true)
	expect(team?.[3]?.position).toBe(1)
	expect(team?.[4]?.position).toBe(2)
	expect(team?.[3]?.picks.map((pick) => pick.level)).toEqual(["+0", "+0-2, +9"])
	expect(team?.[3]?.picks[1]?.icon.src?.startsWith("/assets/")).toBe(true)
	// Unordered slots carry no position; unset pieces are left out.
	const loose = rowTeam(full({ cookie: "01", treasures: [[treasurePick("001")], [treasurePick("002")]] }))
	expect(loose?.map((piece) => piece.role)).toEqual(["cookie", "treasure", "treasure"])
	expect(loose?.[1]?.position).toBeUndefined()
	expect(rowTeam("not a code")).toBeNull()
})

test("row team: an evolved or blessed treasure carries its kind, a base one none", () => {
	const team = rowTeam(full({ treasures: [[treasurePick("098"), treasurePick("I98"), treasurePick("001")]] }))
	expect(team?.[0]?.picks.map((pick) => pick.mark)).toEqual([undefined, "evolved", "blessed"])
})

test("row boosts: each boost and cookie power+ with its pictures, the random boost, and whether the episode takes boosts", () => {
	const code = full(
		{},
		{ episode: "episode5", boosts: ["hpExtension"], randomBoost: "doubleCoins", cookiePowers: ["cheerleader"] },
	)
	const boosts = rowBoosts(code)
	expect(boosts?.used).toBe(true)
	expect(boosts?.boosts.map((boost) => boost.id)).toEqual(["hpExtension"])
	expect(boosts?.boosts[0]?.src?.startsWith("/assets/")).toBe(true)
	expect(boosts?.random).toBe("doubleCoins")
	expect(boosts?.powers.map((power) => power.id)).toEqual(["cheerleader"])
	expect(boosts?.powers[0]?.srcs.length).toBeGreaterThan(0)
	expect(rowBoosts(full({}, { episode: "special2" }))?.used).toBe(false)
	expect(rowBoosts("not a code")).toBeNull()
})

test("row full: the decoded code, or null when it does not read", () => {
	expect(rowFull(full({ cookie: "01" }))?.loadout.cookie).toBe("01")
	expect(rowFull("not a code")).toBeNull()
})

test("goal targets: the saved stat for each goal the code aims for, in the code's goal order", () => {
	const code = full({}, { goals: ["money", "box"] })
	const stats = { money: { min: 12000, max: 15000 }, boxes: { min: 2, max: 2 }, score: { min: 1, max: 2 } }
	expect(goalTargets(entry(code, { stats }))).toEqual([
		{ goal: "money", field: "money", range: { min: 12000, max: 15000 } },
		{ goal: "box", field: "boxes", range: { min: 2, max: 2 } },
	])
	// A goal with no saved stat is left out, and so is every goal of a code that does not read.
	expect(goalTargets(entry(code, { stats: { money: { min: 1, max: 1 } } }))).toEqual([
		{ goal: "money", field: "money", range: { min: 1, max: 1 } },
	])
	expect(goalTargets(entry(code))).toEqual([])
	expect(goalTargets(entry("not a code", { stats }))).toEqual([])
})
