import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { expect, test } from "vitest"

import { nameFor } from "#lib/combi/catalog"
import { combiSectionOf, encodeFull } from "#lib/combi/full-code"
import {
	activeFilters,
	averageMoney,
	DEFAULT_SORT,
	facetCount,
	filterList,
	filterOptions,
	LIST_SORT_KEY,
	type ListFilter,
	NO_FILTER,
	readListSort,
	roundCount,
	rowBoosts,
	rowEpisode,
	rowFull,
	rowGoals,
	rowLoadout,
	rowStats,
	rowTeam,
	SORT_KEYS,
	type SortKey,
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

test("average money and round count", () => {
	const a = entry("1-MS0A000000", { rounds: [{ money: 10 }, { money: 20 }, { time: 5 }] })
	expect(averageMoney(a)).toBe(15)
	expect(averageMoney(entry("1-MS0A000000", { rounds: [{ time: 9 }] }))).toBeNull()
	expect(roundCount(a)).toBe(3)
	expect(roundCount(entry("1-MS0A000000"))).toBe(0)
})

const sorted = (list: SavedCode[], key: SortKey, reverse = false) => sortList(list, { key, reverse })

test("a stat sort puts the highest average first, and codes with no such round last either way", () => {
	const a = entry("1-MS0A000000", { rounds: [{ money: 10 }, { money: 20 }, { time: 5 }] })
	const b = entry("1-MS0A000000", { rounds: [{ money: 30 }], savedAt: 2 })
	const c = entry("1-MS0A000000", { savedAt: 3, rounds: [{ time: 9 }] })
	expect(sorted([c, a, b], "money")).toEqual([b, a, c])
	expect(sorted([c, a, b], "money", true)).toEqual([a, b, c])

	const s = entry("1-MS0A000000", { rounds: [{ score: 5, exp: 1, boxes: 2 }] })
	const t = entry("1-MS0A000000", { rounds: [{ score: 9, exp: 3, boxes: 1 }] })
	expect(sorted([s, t], "score")).toEqual([t, s])
	expect(sorted([s, t], "exp")).toEqual([t, s])
	expect(sorted([s, t], "boxes")).toEqual([s, t])
})

test("run time puts the shortest first, reversed the longest", () => {
	const quick = entry("1-MS0A000000", { rounds: [{ time: 100 }] })
	const slow = entry("1-MS0A000000", { rounds: [{ time: 300 }] })
	const none = entry("1-MS0A000000")
	expect(sorted([slow, none, quick], "time")).toEqual([quick, slow, none])
	expect(sorted([quick, none, slow], "time", true)).toEqual([slow, quick, none])
})

test("rounds logged puts the most first", () => {
	const one = entry("1-MS0A000000", { rounds: [{ time: 1 }] })
	const three = entry("1-MS0A000000", { rounds: [{ time: 1 }, { time: 2 }, { time: 3 }] })
	const zero = entry("1-MS0A000000")
	expect(sorted([one, zero, three], "rounds")).toEqual([three, one, zero])
	expect(sorted([one, zero, three], "rounds", true)).toEqual([zero, one, three])
})

test("date saved puts the newest first, reversed the oldest", () => {
	const a = entry("1-MS0A000000", { savedAt: 1 })
	const b = entry("1-MS0A000000", { savedAt: 2 })
	expect(sorted([a, b], "saved")).toEqual([b, a])
	expect(sorted([b, a], "saved", true)).toEqual([a, b])
})

test("its goal groups codes by their first goal, in goal order, best average first", () => {
	const score = entry(full({}, { goals: ["score"] }), { rounds: [{ score: 10 }] })
	const bigMoney = entry(full({ cookie: "01" }, { goals: ["money"], mode: "auto" }), { rounds: [{ money: 900 }] })
	const smallMoney = entry(full({ cookie: "06" }, { goals: ["money", "exp"], mode: "auto" }), {
		rounds: [{ money: 100, exp: 99999 }],
	})
	const box = entry(full({}, { goals: ["box"], mode: "auto" }), { rounds: [{ boxes: 3 }] })
	const bare = entry(full({}, { goals: ["money"], mode: "auto" }))
	const bad = entry("not-a-code-at-all-x")
	const list = [bad, box, bare, smallMoney, score, bigMoney]
	expect(sorted(list, "goal")).toEqual([score, bigMoney, smallMoney, bare, box, bad])
	expect(sorted(list, "goal", true)).toEqual([score, smallMoney, bigMoney, bare, box, bad])
})

test("code sorts by the 10 characters, then the full code; reversed Z–A", () => {
	const x = entry(full({ cookie: "01" }))
	const y = entry(full({ cookie: "06" }))
	const small = entry("1-JX035RV000")
	expect(x.code.split("-")[1]).toBe(y.code.split("-")[1])
	expect(combiSectionOf(small.code) < combiSectionOf(x.code)).toBe(true)
	const pair = [x, y].sort((p, q) => (p.code < q.code ? -1 : 1))
	expect(sorted([y, x, small], "code")).toEqual([small, ...pair])
	expect(sorted([y, x, small], "code", true)).toEqual([...pair].reverse().concat(small))
})

const only = (over: Partial<ListFilter>): ListFilter => ({ ...NO_FILTER, ...over })

test("search matches the cookie name, the note and the code, every word", () => {
	const code = full({ cookie: "01" })
	const e = entry(code, { description: "Night farm" })
	const cookie = nameFor("cookies", "01")

	expect(filterList([e], cookie.toUpperCase(), NO_FILTER)).toEqual([e])
	expect(filterList([e], "night", NO_FILTER)).toEqual([e])
	expect(filterList([e], code.slice(0, 5), NO_FILTER)).toEqual([e])
	expect(filterList([e], `night ${cookie}`, NO_FILTER)).toEqual([e])
	expect(filterList([e], "night zzzznope", NO_FILTER)).toEqual([])
})

test("search matches the pet name", () => {
	const e = entry(full({ pet: "06" }))
	expect(filterList([e], nameFor("pets", "06"), NO_FILTER)).toEqual([e])
})

test("the goal filter keeps runs aiming for any goal picked", () => {
	const e = entry(full({}, { goals: ["money", "exp"], mode: "auto" }))
	expect(filterList([e], "", only({ goals: ["money"] }))).toEqual([e])
	expect(filterList([e], "", only({ goals: ["score", "exp"] }))).toEqual([e])
	expect(filterList([e], "", only({ goals: ["score"] }))).toEqual([])
})

test("the mode, episode, cookie and rounds filters each narrow, and together all must hold", () => {
	const manual = entry(full({ cookie: "01" }, { episode: "episode3" }), { rounds: [{ score: 1 }] })
	const auto = entry(full({ cookie: "06" }, { goals: ["money"], mode: "auto", episode: "episode5" }))
	const list = [manual, auto]
	expect(filterList(list, "", only({ mode: "auto" }))).toEqual([auto])
	expect(filterList(list, "", only({ episodes: ["episode3", "episode7"] }))).toEqual([manual])
	expect(filterList(list, "", only({ cookies: ["06"] }))).toEqual([auto])
	expect(filterList(list, "", only({ rounds: "with" }))).toEqual([manual])
	expect(filterList(list, "", only({ rounds: "without" }))).toEqual([auto])
	expect(filterList(list, "", only({ mode: "auto", rounds: "with" }))).toEqual([])
})

test("active filters counts each pick", () => {
	expect(activeFilters(NO_FILTER)).toBe(0)
	const many = only({ goals: ["money", "exp"], mode: "auto", episodes: ["episode1"], cookies: ["01"], rounds: "with" })
	expect(activeFilters(many)).toBe(6)
})

test("filter options: the episodes and cookies the saved codes use, episodes in table order, cookies most used first", () => {
	const list = [
		entry(full({ cookie: "06" }, { episode: "episode5" })),
		entry(full({ cookie: "01" }, { episode: "episode3" })),
		entry(full({ cookie: "06" }, { episode: "any" })),
		entry(full({}, { episode: "episode3" })),
		entry("not-a-code-at-all-x"),
	]
	const options = filterOptions(list)
	expect(options.episodes).toEqual(["any", "episode3", "episode5"])
	expect(options.cookies).toEqual(["06", "01"])
})

test("a facet count is how many codes a pick would show, given the search and every other filter", () => {
	const a = entry(full({ cookie: "01" }, { episode: "episode3" }), { description: "night" })
	const b = entry(full({ cookie: "06" }, { goals: ["money"], mode: "auto", episode: "episode3" }))
	const c = entry(full({ cookie: "06" }, { goals: ["money"], mode: "auto", episode: "episode5" }))
	const list = [a, b, c]
	expect(facetCount(list, "", NO_FILTER, "episodes", "episode3")).toBe(2)
	expect(facetCount(list, "", only({ mode: "auto" }), "episodes", "episode3")).toBe(1)
	// The facet's own picks do not narrow its counts.
	expect(facetCount(list, "", only({ episodes: ["episode5"] }), "episodes", "episode3")).toBe(2)
	expect(facetCount(list, "night", NO_FILTER, "cookies", "06")).toBe(0)
	expect(facetCount(list, "", NO_FILTER, "goals", "money")).toBe(2)
})

test("an entry that no longer reads still lists", () => {
	const bad = entry("not-a-code-at-all-x", { description: "old" })

	expect(filterList([bad], "", NO_FILTER)).toEqual([bad])
	expect(filterList([bad], "old", NO_FILTER)).toEqual([bad])
	expect(filterList([bad], "", only({ goals: ["score"] }))).toEqual([])
	expect(filterList([bad], "", only({ rounds: "without" }))).toEqual([bad])
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

test("list sort is remembered with its order; the old sorts read as their new ones; anything else reads date saved", () => {
	const held = storage()
	expect(readListSort(held)).toEqual(DEFAULT_SORT)
	expect(DEFAULT_SORT).toEqual({ key: "saved", reverse: false })
	writeListSort({ key: "time", reverse: true }, held)
	expect(readListSort(held)).toEqual({ key: "time", reverse: true })
	writeListSort({ key: "money", reverse: false }, held)
	expect(readListSort(held)).toEqual({ key: "money", reverse: false })
	expect(readListSort(storage("newest"))).toEqual({ key: "saved", reverse: false })
	expect(readListSort(storage("oldest"))).toEqual({ key: "saved", reverse: true })
	expect(readListSort(storage("code"))).toEqual({ key: "code", reverse: false })
	expect(readListSort(storage("bogus"))).toEqual(DEFAULT_SORT)
	expect(readListSort(storage("money:bogus"))).toEqual(DEFAULT_SORT)
	expect(readListSort(null)).toEqual(DEFAULT_SORT)
	expect(SORT_KEYS).toEqual(["saved", "goal", "score", "money", "exp", "boxes", "time", "rounds", "code"])
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

test("row team: every treasure carries its kind, base included", () => {
	const team = rowTeam(full({ treasures: [[treasurePick("098"), treasurePick("I98"), treasurePick("001")]] }))
	expect(team?.[0]?.picks.map((pick) => pick.kind)).toEqual(["base", "evolved", "blessed"])
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

test("row stats: the average for each goal the code aims for in the code's goal order, then time, each null when no round noted it", () => {
	const code = full({}, { goals: ["money", "box"] })
	const rounds = [
		{ money: 12000, boxes: 2, score: 1, time: 100 },
		{ money: 15000, time: 121 },
	]
	expect(rowStats(entry(code, { rounds }))).toEqual([
		{ field: "money", value: 13500 },
		{ field: "boxes", value: 2 },
		{ field: "time", value: 111 },
	])
	// A stat no round filled in is still listed, with no value; score is not a goal here, so it is left out.
	expect(rowStats(entry(code))).toEqual([
		{ field: "money", value: null },
		{ field: "boxes", value: null },
		{ field: "time", value: null },
	])
	// A code that does not read has no goals, only time.
	expect(rowStats(entry("not a code", { rounds }))).toEqual([{ field: "time", value: 111 }])
})

test("row stats, all: the goals' stats, then every other stat a round noted, then time", () => {
	const code = full({}, { goals: ["box"] })
	const rounds = [{ money: 12000, boxes: 2, score: 1 }, { money: 15000 }]
	expect(rowStats(entry(code, { rounds }), true)).toEqual([
		{ field: "boxes", value: 2 },
		{ field: "score", value: 1 },
		{ field: "money", value: 13500 },
		{ field: "time", value: null },
	])
	expect(rowStats(entry(code), true)).toEqual([
		{ field: "boxes", value: null },
		{ field: "time", value: null },
	])
})
