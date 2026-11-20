import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import CombiList from "#components/organisms/CombiList.svelte"
import { nameFor } from "#lib/combi/catalog"
import { combiSectionOf, encodeFull } from "#lib/combi/full-code"
import { LIST_SORT_KEY } from "#lib/combi/list"
import { emptyLoadout, type Loadout } from "#lib/combi/loadout"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"

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

const scoreCode = full({ cookie: "01" })
const moneyCode = full({ cookie: "06" }, { goals: ["money"] })

const entries: SavedCode[] = [
	{ code: scoreCode, description: "Score farm\nsecond line", savedAt: 1 },
	{ code: moneyCode, description: "", stats: { money: { min: 12000, max: 15000 } }, savedAt: 2 },
]

beforeEach(() => {
	window.localStorage.clear()
	document.documentElement.lang = "en"
})

afterEach(() => {
	cleanup()
	document.documentElement.lang = ""
	document.body.innerHTML = ""
})

function setup(list: SavedCode[] = entries, current: string | null = null) {
	const handlers = { onnew: vi.fn(), onopen: vi.fn(), oncopy: vi.fn(), onshare: vi.fn() }
	const result = render(CombiList, { props: { entries: list, current, ...handlers } })
	return { ...result, ...handlers }
}

const rows = () => screen.getAllByRole("row").filter((row) => row.closest("tbody"))

test("rows show the 10 characters, the loadout icons and the note's first line or the goals", () => {
	setup()
	expect(rows()).toHaveLength(2)
	const score = rows().find((row) => row.textContent?.includes(combiSectionOf(scoreCode)))
	const money = rows().find((row) => row.textContent?.includes(combiSectionOf(moneyCode)))
	expect(score).toBeTruthy()
	expect(money).toBeTruthy()
	expect(within(score as HTMLElement).getByRole("img", { name: nameFor("cookies", "01") })).toBeTruthy()
	expect(score?.textContent).toContain("Score farm")
	expect(score?.textContent).not.toContain("second line")
	expect(money?.textContent).toContain(en.combi.goals.money)
	expect(money?.textContent).toContain("13,500")
})

test("search narrows the rows", async () => {
	setup()
	await fireEvent.input(screen.getByRole("searchbox", { name: en.combi.list.search }), {
		target: { value: "score farm" },
	})
	expect(rows()).toHaveLength(1)
	expect(rows()[0]?.textContent).toContain(combiSectionOf(scoreCode))
})

test("the goal filter narrows the rows", async () => {
	setup()
	await fireEvent.change(screen.getByRole("combobox", { name: en.combi.list.columns.goal }), {
		target: { value: "money" },
	})
	expect(rows()).toHaveLength(1)
	expect(rows()[0]?.textContent).toContain(combiSectionOf(moneyCode))
})

test("the sort orders the rows and persists", async () => {
	setup()
	expect(rows()[0]?.textContent).toContain(combiSectionOf(moneyCode))
	await fireEvent.change(screen.getByRole("combobox", { name: en.combi.list.sortBy }), {
		target: { value: "oldest" },
	})
	expect(rows()[0]?.textContent).toContain(combiSectionOf(scoreCode))
	expect(window.localStorage.getItem(LIST_SORT_KEY)).toBe("oldest")
	cleanup()
	setup()
	expect((screen.getByRole("combobox", { name: en.combi.list.sortBy }) as HTMLSelectElement).value).toBe("oldest")
	expect(rows()[0]?.textContent).toContain(combiSectionOf(scoreCode))
})

test("a click or Enter opens a row; Copy and Share do not", async () => {
	const { onopen, oncopy, onshare } = setup()
	const game = combiSectionOf(scoreCode)
	const score = entries[0]

	await fireEvent.click(screen.getByRole("button", { name: en.combi.list.copyCode(game) }))
	expect(oncopy).toHaveBeenCalledWith(score)
	await fireEvent.click(screen.getByRole("button", { name: en.combi.list.shareCode(game) }))
	expect(onshare).toHaveBeenCalledWith(score)
	expect(onopen).not.toHaveBeenCalled()

	const row = rows().find((r) => r.textContent?.includes(game)) as HTMLElement
	await fireEvent.click(row)
	expect(onopen).toHaveBeenCalledWith(score)
	// The code is the row's button: Enter on it is a click, and the click reaches the row once.
	await fireEvent.click(within(row).getByRole("button", { name: game }))
	expect(onopen).toHaveBeenCalledTimes(2)
})

test("New code calls onnew", async () => {
	const { onnew } = setup()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.list.newCode }))
	expect(onnew).toHaveBeenCalled()
})

test("aria-current marks the current entry", () => {
	setup(entries, moneyCode)
	const current = rows().filter((row) => row.getAttribute("aria-current") === "true")
	expect(current).toHaveLength(1)
	expect(current[0]?.textContent).toContain(combiSectionOf(moneyCode))
})

test("the empty state and the no-match state", async () => {
	setup([])
	expect(screen.getByText(en.combi.list.empty)).toBeTruthy()
	cleanup()
	setup()
	await fireEvent.input(screen.getByRole("searchbox", { name: en.combi.list.search }), {
		target: { value: "nothing like this" },
	})
	expect(screen.getByText(en.combi.list.noMatch)).toBeTruthy()
})

test("two entries with the same 10 characters show different icons", () => {
	const a = full({ cookie: "01" })
	const b = full({ cookie: "06" })
	expect(combiSectionOf(a)).toBe(combiSectionOf(b))
	setup([
		{ code: a, description: "", savedAt: 1 },
		{ code: b, description: "", savedAt: 2 },
	])
	expect(screen.getAllByRole("img", { name: nameFor("cookies", "01") })).toHaveLength(1)
	expect(screen.getAllByRole("img", { name: nameFor("cookies", "06") })).toHaveLength(1)
})

test("an unreadable code still lists its code and note", () => {
	setup([{ code: "ZZZZZZZZZZZZ", description: "Old one", savedAt: 1 }])
	expect(rows()[0]?.textContent).toContain("Old one")
})

test("Thai by default", () => {
	document.documentElement.lang = "th"
	setup()
	expect(screen.getByRole("button", { name: th.combi.list.newCode })).toBeTruthy()
})
