import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { expect, test } from "vitest"

import { nameFor } from "#lib/combi/catalog"
import { combiSectionOf, encodeFull } from "#lib/combi/full-code"
import {
	averageMoney,
	filterList,
	LIST_SORT_KEY,
	readListSort,
	rowLoadout,
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
