import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import CombiList from "#components/organisms/CombiList.svelte"
import { nameFor } from "#lib/combi/catalog"
import { combiSectionOf, encodeFull } from "#lib/combi/full-code"
import { LIST_SORT_KEY } from "#lib/combi/list"
import { emptyLoadout, type Loadout, treasurePick } from "#lib/combi/loadout"
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
	const handlers = { onnew: vi.fn(), onopen: vi.fn(), oncopy: vi.fn(), onshare: vi.fn(), ondelete: vi.fn() }
	const result = render(CombiList, { props: { entries: list, current, ...handlers } })
	return { ...result, ...handlers }
}

const rows = () => screen.getAllByRole("listitem").filter((item) => item.matches("li.entry"))
const rowOf = (code: string) => rows().find((row) => row.textContent?.includes(combiSectionOf(code))) as HTMLElement
/** The row's own toggle: the button that says whether its details are shown. */
const toggleOf = (row: HTMLElement) => row.querySelector("button[aria-expanded]") as HTMLButtonElement
const expand = (code: string) => fireEvent.click(toggleOf(rowOf(code)))

test("a collapsed row shows the 10 characters, the mode and goals, the episode and the saved stats, not the note", async () => {
	setup()
	expect(rows()).toHaveLength(2)
	const score = rowOf(scoreCode)
	const money = rowOf(moneyCode)
	expect(score.textContent).toContain(`${en.combi.modes.manual} · ${en.combi.goals.score}`)
	expect(score.textContent).toContain(en.combi.describe.anyEpisode)
	expect(score.textContent).not.toContain("Score farm")
	expect(money.textContent).toContain(en.combi.goals.money)
	expect(money.textContent).toMatch(/Money\s*12,000–15,000/)
	expect(toggleOf(score).getAttribute("aria-expanded")).toBe("false")
	// The head carries the cookie's picture; the actions wait for the row to open.
	expect(within(toggleOf(score)).getByRole("img", { name: nameFor("cookies", "01") })).toBeTruthy()
	expect(within(score).queryByRole("button", { name: en.combi.list.editCode(combiSectionOf(scoreCode)) })).toBeNull()
	// Open, the stats move to the Results line, and the note shows whole.
	await expand(moneyCode)
	expect(rowOf(moneyCode).querySelector(".head")?.textContent).not.toContain("12,000–15,000")
	await expand(scoreCode)
	expect(rowOf(scoreCode).textContent).toMatch(/Score farm\s*second line/)
})

test("a stat saved as one number shows once", () => {
	const code = full({}, { goals: ["box"] })
	setup([{ code, description: "", stats: { boxes: { min: 3, max: 3 } }, savedAt: 1 }])
	expect(rowOf(code).textContent).toMatch(new RegExp(`${en.combi.editor.statLabels.boxes}\\s*3`))
	expect(rowOf(code).textContent).not.toContain("3–3")
})

test("a row expands to its run, results, team, treasures, boosts, random boost, cookie power+ and note, and several rows stay open", async () => {
	setup()
	await expand(scoreCode)
	const score = rowOf(scoreCode)
	expect(toggleOf(score).getAttribute("aria-expanded")).toBe("true")
	const details = document.getElementById(toggleOf(score).getAttribute("aria-controls") ?? "") as HTMLElement
	expect(score.contains(details)).toBe(true)
	expect(within(details).getByRole("img", { name: nameFor("cookies", "01") })).toBeTruthy()
	const labels = Array.from(details.querySelectorAll(".label"), (label) => label.textContent?.trim())
	expect(labels).toEqual([
		en.combi.list.run,
		en.combi.list.results,
		en.combi.list.team,
		en.combi.editor.tabs.treasures,
		en.combi.editor.tabs.boosts,
		en.combi.describe.fields.randomBoost,
		en.combi.describe.fields.cookiePower,
		en.combi.list.note,
	])
	expect(details.textContent).toContain(en.combi.modes.manual)
	// Pictures alone until asked: the name is the picture's alt, not text.
	expect(details.textContent).not.toContain(nameFor("cookies", "01"))
	await expand(moneyCode)
	expect(toggleOf(rowOf(scoreCode)).getAttribute("aria-expanded")).toBe("true")
	expect(toggleOf(rowOf(moneyCode)).getAttribute("aria-expanded")).toBe("true")
	expect(rowOf(moneyCode).textContent).toContain(en.combi.editor.statLabels.money)
	await expand(scoreCode)
	expect(toggleOf(rowOf(scoreCode)).getAttribute("aria-expanded")).toBe("false")
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

test("expanding a row opens nothing; Edit, Copy and Share act on its entry", async () => {
	const { onopen, oncopy, onshare } = setup()
	const game = combiSectionOf(scoreCode)
	const score = entries[0]

	await expand(scoreCode)
	expect(onopen).not.toHaveBeenCalled()
	const row = rowOf(scoreCode)
	await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.copyCode(game) }))
	expect(oncopy).toHaveBeenCalledWith(score)
	await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.shareCode(game) }))
	expect(onshare).toHaveBeenCalledWith(score)
	expect(onopen).not.toHaveBeenCalled()
	await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.editCode(game) }))
	expect(onopen).toHaveBeenCalledWith(score)
})

test("Delete asks once more before it deletes, and leaving the button takes the question back", async () => {
	const { ondelete } = setup()
	const game = combiSectionOf(scoreCode)
	await expand(scoreCode)
	const row = rowOf(scoreCode)

	await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.deleteCode(game) }))
	expect(ondelete).not.toHaveBeenCalled()
	const confirm = within(row).getByRole("button", { name: en.combi.list.confirmDeleteCode(game) })
	await fireEvent.blur(confirm)
	expect(within(row).queryByRole("button", { name: en.combi.list.confirmDeleteCode(game) })).toBeNull()

	await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.deleteCode(game) }))
	await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.confirmDeleteCode(game) }))
	expect(ondelete).toHaveBeenCalledWith(entries[0])
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

test("an open row shows a treasure slot's every treasure, an evolved one named so, and a press on the pictures shows names and levels", async () => {
	const code = full({
		cookie: "01",
		treasures: [[treasurePick("001"), treasurePick("002", [0, 1, 2])], [treasurePick("098")]],
	})
	setup([{ code, description: "", savedAt: 1 }])
	await expand(code)
	const row = rowOf(code)
	expect(within(row).getByRole("img", { name: nameFor("treasures", "001") })).toBeTruthy()
	expect(within(row).getByRole("img", { name: nameFor("treasures", "002") })).toBeTruthy()
	expect(
		within(row).getByRole("img", { name: `${nameFor("treasures", "098")}, ${en.combi.list.kinds.evolved}` }),
	).toBeTruthy()
	expect(row.textContent).not.toContain("+0-2")
	const [faces, rings] = within(row).getAllByRole("button", { pressed: false })
	// A press shows that line's names only.
	await fireEvent.click(faces as HTMLElement)
	expect(row.textContent).toContain(nameFor("cookies", "01"))
	expect(row.textContent).not.toContain("+0-2")
	expect(within(row).getAllByRole("button", { pressed: true })).toHaveLength(1)
	await fireEvent.click(rings as HTMLElement)
	expect(row.textContent).toMatch(new RegExp(`${nameFor("treasures", "002")}\\s+\\+0-2`))
	expect(within(row).getAllByRole("button", { pressed: true })).toHaveLength(2)
})

test("each line of an open row opens the entry on its own tab", async () => {
	const { onopen } = setup()
	const game = combiSectionOf(scoreCode)
	await expand(scoreCode)
	const row = rowOf(scoreCode)
	const tabs = [
		[en.combi.list.run, "main"],
		[en.combi.list.results, "runLog"],
		[en.combi.list.team, "cookies"],
		[en.combi.editor.tabs.treasures, "treasures"],
		[en.combi.editor.tabs.boosts, "boosts"],
		[en.combi.describe.fields.randomBoost, "boosts"],
		[en.combi.describe.fields.cookiePower, "boosts"],
		[en.combi.list.note, "runLog"],
	] as const
	for (const [label, tab] of tabs) {
		await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.editSection(label, game) }))
		expect(onopen).toHaveBeenLastCalledWith(entries[0], tab)
	}
})

test("Thai by default", () => {
	document.documentElement.lang = "th"
	setup()
	expect(screen.getByRole("button", { name: th.combi.list.newCode })).toBeTruthy()
})
