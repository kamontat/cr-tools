import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import CombiFilter from "#components/organisms/CombiFilter.svelte"
import { labelFor } from "#lib/combi/catalog"
import { encodeFull } from "#lib/combi/full-code"
import { DEFAULT_SORT, type ListFilter, type ListSort, NO_FILTER } from "#lib/combi/list"
import { emptyLoadout, type Loadout } from "#lib/combi/loadout"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"

const combi: Combi = {
	goals: ["score"],
	mode: "manual",
	episode: "episode3",
	floor: null,
	boosts: [],
	randomBoost: null,
	cookiePowers: [],
	action: "none",
}

const full = (loadout: Partial<Loadout> = {}, over: Partial<Combi> = {}) =>
	encodeFull({ loadout: { ...emptyLoadout(), ...loadout }, combi: { ...combi, ...over } })

const entries: SavedCode[] = [
	{ code: full({ cookie: "01" }), description: "", savedAt: 1 },
	{
		code: full({ cookie: "06" }, { goals: ["money"], mode: "auto", episode: "episode5" }),
		description: "",
		savedAt: 2,
	},
	{ code: full({ cookie: "06" }, { goals: ["money", "exp"], mode: "auto" }), description: "", savedAt: 3 },
]

const t = en.combi.list

beforeEach(() => {
	document.documentElement.lang = "en"
})

afterEach(() => {
	cleanup()
	document.documentElement.lang = ""
	document.body.innerHTML = ""
})

type Over = { filter?: ListFilter; sort?: ListSort; tab?: "filter" | "sort"; sheet?: boolean; query?: string }

function setup(over: Over = {}) {
	const handlers = { onfilter: vi.fn(), onsort: vi.fn(), ontab: vi.fn(), onclose: vi.fn() }
	const props = {
		entries,
		query: "",
		filter: NO_FILTER,
		sort: DEFAULT_SORT,
		tab: "filter" as const,
		sheet: false,
		shown: entries.length,
		...over,
		...handlers,
	}
	return { ...render(CombiFilter, { props }), ...handlers }
}

const group = (name: string) => screen.getByRole("group", { name })

test("the panel is titled by its tab, with Filter then Sort as tabs, the filter count on Filter", () => {
	setup({ filter: { ...NO_FILTER, goals: ["money"], mode: "auto" } })
	expect(screen.getByRole("heading", { name: t.filter })).toBeTruthy()
	const tabs = screen.getAllByRole("tab")
	expect(tabs.map((tab) => tab.textContent?.trim().split(/\s+/)[0])).toEqual([t.filter, t.sort])
	expect(tabs[0]?.getAttribute("aria-selected")).toBe("true")
	expect(tabs[0]?.querySelector(".badge")?.textContent).toBe("2")
})

test("a tab press asks for that tab", async () => {
	const { ontab } = setup()
	await fireEvent.click(screen.getByRole("tab", { name: new RegExp(`^${t.sort}`) }))
	expect(ontab).toHaveBeenCalledWith("sort")
})

test("the filter tab: goals add in goal order, mode, rounds, and the used episodes and cookies with their counts", async () => {
	const { onfilter } = setup({ filter: { ...NO_FILTER, goals: ["exp"] } })
	await fireEvent.click(within(group(t.goalFilter)).getByRole("button", { name: en.combi.goals.money }))
	expect(onfilter).toHaveBeenLastCalledWith({ ...NO_FILTER, goals: ["money", "exp"] })

	await fireEvent.click(within(group(t.mode)).getByRole("button", { name: en.combi.modes.auto }))
	expect(onfilter).toHaveBeenLastCalledWith({ ...NO_FILTER, goals: ["exp"], mode: "auto" })

	await fireEvent.click(within(group(t.roundsFilter)).getByRole("button", { name: t.withoutRounds }))
	expect(onfilter).toHaveBeenLastCalledWith({ ...NO_FILTER, goals: ["exp"], rounds: "without" })

	const episodes = within(group(t.episode)).getAllByRole("button")
	expect(episodes.map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "false"])
	expect(episodes.map((button) => button.textContent?.replace(/\s+/g, " ").trim())).toEqual([
		"Episode 3 1",
		"Episode 5 0",
	])
	expect((episodes[1] as HTMLButtonElement).disabled).toBe(true)

	const cookies = within(group(t.cookie)).getAllByRole("button")
	expect(cookies[0]?.textContent).toContain(labelFor("cookies", "06"))
	await fireEvent.click(cookies[0] as HTMLElement)
	expect(onfilter).toHaveBeenLastCalledWith({ ...NO_FILTER, goals: ["exp"], cookies: ["06"] })
})

test("the filter tab's footer clears the filters, and is off with none", async () => {
	setup()
	expect((screen.getByRole("button", { name: t.clearFilters }) as HTMLButtonElement).disabled).toBe(true)
	cleanup()
	const { onfilter } = setup({ filter: { ...NO_FILTER, rounds: "with" } })
	await fireEvent.click(screen.getByRole("button", { name: t.clearFilters }))
	expect(onfilter).toHaveBeenCalledWith(NO_FILTER)
})

test("the sort tab: picking a sort starts it in its natural order, and the order names both ends in the sort's words", async () => {
	const { onsort } = setup({ tab: "sort", sort: { key: "time", reverse: true } })
	expect(screen.getByRole("heading", { name: t.sort })).toBeTruthy()
	const radios = within(group(t.sortBy)).getAllByRole("radio")
	expect(radios).toHaveLength(9)
	expect((screen.getByRole("radio", { name: t.sorts.time }) as HTMLInputElement).checked).toBe(true)

	const order = group(t.order)
	expect(within(order).getByRole("button", { name: t.orders.time.reversed }).getAttribute("aria-pressed")).toBe("true")
	await fireEvent.click(within(order).getByRole("button", { name: t.orders.time.natural }))
	expect(onsort).toHaveBeenLastCalledWith({ key: "time", reverse: false })

	await fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${t.sorts.goal}`) }))
	expect(onsort).toHaveBeenLastCalledWith({ key: "goal", reverse: false })

	await fireEvent.click(screen.getByRole("button", { name: t.resetSort }))
	expect(onsort).toHaveBeenLastCalledWith(DEFAULT_SORT)
})

test("docked: a panel section beside the list, closed by its ✕", async () => {
	const { container, onclose } = setup()
	expect(container.querySelector("section.panel")).toBeTruthy()
	expect(screen.queryByRole("button", { name: t.showCodes(3) })).toBeNull()
	await fireEvent.click(screen.getByRole("button", { name: en.frame.close }))
	expect(onclose).toHaveBeenCalled()
})

test("as a sheet: Show N codes, the backdrop and Escape close it", async () => {
	const { container, onclose } = setup({ sheet: true })
	expect(container.querySelector("section.panel")).toBeNull()
	expect(screen.getByRole("region", { name: t.filter })).toBeTruthy()
	await fireEvent.click(screen.getByRole("button", { name: t.showCodes(3) }))
	expect(onclose).toHaveBeenCalledTimes(1)
	await fireEvent.click(container.querySelector(".scrim") as HTMLElement)
	expect(onclose).toHaveBeenCalledTimes(2)
	await fireEvent.keyDown(screen.getByRole("tab", { name: new RegExp(`^${t.filter}`) }), { key: "Escape" })
	expect(onclose).toHaveBeenCalledTimes(3)
})

test("as a sheet, focus moves into it when it opens", async () => {
	setup({ sheet: true })
	await waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("tab"))
})

test("Thai by default", () => {
	document.documentElement.lang = ""
	setup()
	expect(screen.getByRole("heading", { name: th.combi.list.filter })).toBeTruthy()
})
