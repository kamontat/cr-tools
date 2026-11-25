import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import CombiList from "#components/organisms/CombiList.svelte"
import { labelFor, nameFor } from "#lib/combi/catalog"
import { combiSectionOf, encodeFull } from "#lib/combi/full-code"
import { NO_FILTER } from "#lib/combi/list"
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
	{ code: moneyCode, description: "", rounds: [{ money: 12000 }, { money: 15000 }, { time: 60 }], savedAt: 2 },
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

function setup(list: SavedCode[] = entries, current: string | null = null, over: Record<string, unknown> = {}) {
	const handlers = { onnew: vi.fn(), onopen: vi.fn(), oncopy: vi.fn(), ondelete: vi.fn(), onpanel: vi.fn() }
	const result = render(CombiList, { props: { entries: list, current, ...over, ...handlers } })
	return { ...result, ...handlers }
}

const rows = () => screen.getAllByRole("listitem").filter((item) => item.matches("li.entry"))
const rowOf = (code: string) => rows().find((row) => row.textContent?.includes(combiSectionOf(code))) as HTMLElement
/** The row's own toggle: the button that says whether its details are shown. */
const toggleOf = (row: HTMLElement) => row.querySelector("button[aria-expanded]") as HTMLButtonElement
const expand = (code: string) => fireEvent.click(toggleOf(rowOf(code)))

test("a collapsed row shows the code, then the mode, episode and goals as badges, then the goal's average, time and round count, not the note", async () => {
	setup()
	expect(rows()).toHaveLength(2)
	const score = rowOf(scoreCode)
	const money = rowOf(moneyCode)
	const badges = (row: HTMLElement) =>
		[...row.querySelectorAll(".head .badge")].map((badge) => badge.textContent?.trim())
	expect(badges(score)).toEqual([en.combi.modes.manual, en.combi.describe.anyEpisode, en.combi.goals.score])
	expect(badges(money)).toEqual([en.combi.modes.manual, en.combi.describe.anyEpisode, en.combi.goals.money])
	expect(score.textContent).not.toContain("Score farm")
	const stats = (row: HTMLElement) =>
		[...(row.querySelector(".head .stats")?.children ?? [])].map(
			(part) =>
				[...part.childNodes]
					.map((node) => node.textContent?.trim())
					.filter(Boolean)
					.join(" ") || part.textContent?.trim(),
		)
	// No rounds yet: the goal's stat and time still show, with nothing in them, and so does the count.
	expect(stats(score)).toEqual([
		`${en.combi.editor.statLabels.score} —`,
		`${en.combi.list.time} —`,
		en.combi.list.rounds(0),
	])
	// Money averages the two rounds that noted it; the round count counts all three. Only the goal's stat shows.
	expect(stats(money)).toEqual([
		`${en.combi.editor.statLabels.money} 13,500`,
		`${en.combi.list.time} 1:00`,
		en.combi.list.rounds(3),
	])
	expect(toggleOf(score).getAttribute("aria-expanded")).toBe("false")
	// The head carries the cookie's picture; the actions wait for the row to open.
	expect(within(toggleOf(score)).getByRole("img", { name: nameFor("cookies", "01") })).toBeTruthy()
	expect(within(score).queryByRole("button", { name: en.combi.list.editCode(combiSectionOf(scoreCode)) })).toBeNull()
	// Open, the badges move to the Run line, the stats to the Results line, and the note shows whole.
	await expand(moneyCode)
	expect(rowOf(moneyCode).querySelector(".head .badges")).toBeNull()
	expect(rowOf(moneyCode).querySelector(".head")?.textContent).not.toContain("13,500")
	const results = rowOf(moneyCode).querySelector(".details")?.textContent ?? ""
	expect(results).toMatch(/Money\s*13,500/)
	expect(results).toContain(en.combi.list.rounds(3))
	await expand(scoreCode)
	expect(rowOf(scoreCode).textContent).toMatch(/Score farm\s*second line/)
})

test("a collapsed row's averages are whole numbers, only for the code's goals, and time reads as minutes and seconds", () => {
	const code = full({}, { goals: ["box"] })
	setup([{ code, description: "", rounds: [{ boxes: 3, score: 10, time: 125 }, { score: 15 }], savedAt: 1 }])
	const stats = rowOf(code).querySelector(".head .stats")?.textContent ?? ""
	expect(stats).toMatch(new RegExp(`${en.combi.editor.statLabels.boxes}\\s*3`))
	expect(stats).not.toContain(en.combi.editor.statLabels.score)
	expect(stats).toMatch(new RegExp(`${en.combi.list.time}\\s*2:05`))
	setup([{ code: moneyCode, description: "", rounds: [{ money: 5 }], savedAt: 1 }])
	expect(document.body.textContent).toContain(en.combi.list.rounds(1))
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

const t = en.combi.list

test("a filter narrows the rows, says how many show, and each pick is a tag that removes it", async () => {
	setup(entries, null, { filter: { ...NO_FILTER, goals: ["money"] } })
	expect(rows()).toHaveLength(1)
	expect(rows()[0]?.textContent).toContain(combiSectionOf(moneyCode))
	expect(screen.getByText(t.shown(1, 2))).toBeTruthy()
	expect(screen.queryByRole("button", { name: t.clearAll })).toBeNull()
	await fireEvent.click(screen.getByRole("button", { name: t.removeFilter(en.combi.goals.money) }))
	expect(rows()).toHaveLength(2)
	expect(screen.getByText(t.shown(2, 2))).toBeTruthy()
})

test("a tag names each kind of pick, and Clear all takes every pick away", async () => {
	const filter = { goals: ["score"], mode: "manual", episodes: ["any"], cookies: ["01"], rounds: "without" }
	setup(entries, null, { filter })
	const names = [
		en.combi.goals.score,
		en.combi.modes.manual,
		en.combi.describe.anyEpisode,
		labelFor("cookies", "01"),
		t.withoutRounds,
	]
	for (const name of names) expect(screen.getByRole("button", { name: t.removeFilter(name) })).toBeTruthy()
	expect(rows()).toHaveLength(1)
	await fireEvent.click(screen.getByRole("button", { name: t.clearAll }))
	expect(rows()).toHaveLength(2)
	expect(screen.queryByRole("button", { name: t.removeFilter(en.combi.goals.score) })).toBeNull()
})

test("the sort orders the rows, and the line under the tools names it with its order", () => {
	setup()
	expect(rows()[0]?.textContent).toContain(combiSectionOf(moneyCode))
	expect(screen.getByText(`${t.sorts.saved} · ${t.orders.saved.natural}`)).toBeTruthy()
	cleanup()
	setup(entries, null, { sort: { key: "saved", reverse: true } })
	expect(rows()[0]?.textContent).toContain(combiSectionOf(scoreCode))
	expect(screen.getByText(`${t.sorts.saved} · ${t.orders.saved.reversed}`)).toBeTruthy()
})

test("Filter and Sort ask for their tab; the open one is pressed, and Filter counts its picks", async () => {
	const { onpanel } = setup(entries, null, {
		panel: "sort",
		filter: { ...NO_FILTER, goals: ["money"], rounds: "with" },
	})
	const filter = screen.getByRole("button", { name: new RegExp(`^${t.filter}`) })
	const sort = screen.getByRole("button", { name: t.sort })
	expect(filter.getAttribute("aria-expanded")).toBe("false")
	expect(sort.getAttribute("aria-expanded")).toBe("true")
	expect(filter.querySelector(".count")?.textContent).toBe("2")
	await fireEvent.click(filter)
	expect(onpanel).toHaveBeenLastCalledWith("filter")
	await fireEvent.click(sort)
	expect(onpanel).toHaveBeenLastCalledWith("sort")
})

test("expanding a row opens nothing; Edit and Copy act on its entry, and Share opens in the row", async () => {
	const { onopen, oncopy } = setup()
	const game = combiSectionOf(scoreCode)
	const score = entries[0]

	await expand(scoreCode)
	expect(onopen).not.toHaveBeenCalled()
	const row = rowOf(scoreCode)
	await fireEvent.click(within(row).getByRole("button", { name: en.combi.list.copyCode(game) }))
	expect(oncopy).toHaveBeenCalledWith(score)
	const share = within(row).getByRole("button", { name: en.combi.list.shareCode(game) })
	await fireEvent.click(share)
	expect(share.getAttribute("aria-expanded")).toBe("true")
	expect(within(row).getByRole("region", { name: en.combi.share.title })).toBeTruthy()
	await fireEvent.click(share)
	expect(within(row).queryByRole("region", { name: en.combi.share.title })).toBeNull()
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

test("an open row shows each treasure slot's first treasure with +N for the rest, an evolved one named so; a press shows every treasure with names and levels", async () => {
	const code = full({
		cookie: "01",
		treasures: [[treasurePick("001"), treasurePick("002", [0, 1, 2])], [treasurePick("098")]],
	})
	setup([{ code, description: "", savedAt: 1 }])
	await expand(code)
	const row = rowOf(code)
	expect(within(row).getByRole("img", { name: nameFor("treasures", "001") })).toBeTruthy()
	expect(within(row).queryByRole("img", { name: nameFor("treasures", "002") })).toBeNull()
	expect(row.querySelector(".more")?.textContent?.trim()).toBe("+1")
	expect(row.querySelectorAll(".more")).toHaveLength(1)
	expect(
		within(row).getByRole("img", { name: `${nameFor("treasures", "098")}, ${en.combi.list.kinds.evolved}` }),
	).toBeTruthy()
	expect(row.textContent).not.toContain("+0-2")
	const [faces, rings] = within(row).getAllByTitle(en.combi.list.showNames)
	// A press shows that line's names only.
	await fireEvent.click(faces as HTMLElement)
	expect(row.textContent).toContain(nameFor("cookies", "01"))
	expect(row.textContent).not.toContain("+0-2")
	expect(within(row).getAllByRole("button", { pressed: true })).toHaveLength(1)
	expect(rings?.classList.contains("stacked")).toBe(false)
	await fireEvent.click(rings as HTMLElement)
	// Open, with alternatives to show, each slot takes its own line.
	expect(rings?.classList.contains("stacked")).toBe(true)
	expect(within(row).getByRole("img", { name: nameFor("treasures", "002") })).toBeTruthy()
	expect(row.querySelector(".more")).toBeNull()
	expect(row.textContent).toMatch(new RegExp(`${nameFor("treasures", "002")}\\s+\\+0-2`))
	expect(within(row).getAllByRole("button", { pressed: true })).toHaveLength(2)
	// Each picture is framed by its kind, and with names shown the kind is written under the name.
	expect([...row.querySelectorAll(".kind")].map((frame) => frame.getAttribute("data-kind"))).toEqual([
		"base",
		"base",
		"evolved",
	])
	expect([...row.querySelectorAll(".kind-word")].map((word) => word.textContent?.trim())).toEqual([
		en.combi.list.kinds.base,
		en.combi.list.kinds.base,
		en.combi.list.kinds.evolved,
	])
})

test("an open row's Results shows every stat the rounds noted; a press keeps only the goal's stats, time and round count", async () => {
	const code = full({}, { goals: ["money"] })
	setup([{ code, description: "", rounds: [{ money: 100, score: 7, exp: 3 }], savedAt: 1 }])
	await expand(code)
	const results = () => within(rowOf(code)).getByTitle(en.combi.list.fewerStats)
	const labels = () => [...results().querySelectorAll(".stat .muted")].map((label) => label.textContent?.trim())
	const every = [
		en.combi.editor.statLabels.money,
		en.combi.editor.statLabels.score,
		en.combi.editor.statLabels.exp,
		en.combi.list.time,
	]
	expect(labels()).toEqual(every)
	expect(results().textContent).toContain(en.combi.list.rounds(1))
	expect(results().getAttribute("aria-pressed")).toBe("false")
	await fireEvent.click(results())
	expect(results().getAttribute("aria-pressed")).toBe("true")
	expect(labels()).toEqual([en.combi.editor.statLabels.money, en.combi.list.time])
	expect(results().textContent).toContain(en.combi.list.rounds(1))
	await fireEvent.click(results())
	expect(labels()).toEqual(every)
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
