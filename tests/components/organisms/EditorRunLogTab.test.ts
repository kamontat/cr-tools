import type { Draft } from "#lib/combi/draft"

import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import EditorRunLogTab from "#components/organisms/EditorRunLogTab.svelte"
import { addRound, newDraft, setRoundValue } from "#lib/combi/draft"
import { en } from "#lib/i18n/en"

afterEach(() => cleanup())

const t = en.combi.editor

/** The tab over `draft`, re-rendered with every change it makes, as the editor does. */
function setup(draft: Draft = newDraft()) {
	const onchange = vi.fn((next: Draft) => {
		void result.rerender({ draft: next })
	})
	const result = render(EditorRunLogTab, { props: { uid: "e", draft, m: en, onchange } })
	return { onchange, last: () => onchange.mock.lastCall?.[0] as Draft }
}

const cell = (n: number, field: keyof typeof t.statLabels) =>
	screen.getByRole("textbox", { name: t.roundCell(n, t.statLabels[field]) }) as HTMLInputElement

test("with no rounds, the table has its header, no rows, and Add round", () => {
	setup()
	const table = screen.getByRole("table")
	expect(within(table).getByRole("columnheader", { name: t.statLabels.money })).toBeTruthy()
	expect(within(table).queryAllByRole("textbox")).toEqual([])
	expect(screen.getByRole("button", { name: t.addRound })).toBeTruthy()
})

test("Add round adds a row of empty cells", async () => {
	const { last } = setup()
	await fireEvent.click(screen.getByRole("button", { name: t.addRound }))
	expect(last().rounds).toEqual([{}])
	expect(cell(1, "money").value).toBe("")
	expect(cell(1, "time")).toBeTruthy()
})

test("a cell takes a grouped number, keeps it as typed, and writes the number", async () => {
	const { last } = setup(addRound(newDraft()))
	await fireEvent.input(cell(1, "money"), { target: { value: "12,000" } })
	expect(last().rounds).toEqual([{ money: 12000 }])
	expect(cell(1, "money").value).toBe("12,000")
})

test("a cell that does not read is marked and changes nothing", async () => {
	const { onchange } = setup(addRound(newDraft()))
	await fireEvent.input(cell(1, "money"), { target: { value: "1-2" } })
	expect(onchange).not.toHaveBeenCalled()
	expect(cell(1, "money").getAttribute("aria-invalid")).toBe("true")
	expect(screen.getByText(en.combi.issues.roundValue("money"))).toBeTruthy()
})

test("✕ removes its own round", async () => {
	const draft = setRoundValue(setRoundValue(addRound(addRound(newDraft())), 0, "money", 1), 1, "money", 2)
	const { last } = setup(draft)
	await fireEvent.click(screen.getByRole("button", { name: t.removeRound(1) }))
	expect(last().rounds).toEqual([{ money: 2 }])
	expect(cell(1, "money").value).toBe("2")
})

test("the Average row averages only filled-in values, as whole numbers", () => {
	let draft = addRound(addRound(addRound(newDraft())))
	draft = setRoundValue(draft, 0, "money", 10000)
	draft = setRoundValue(draft, 1, "money", 15001)
	draft = setRoundValue(draft, 1, "boxes", 0)
	setup(draft)
	const average = screen.getByRole("row", { name: new RegExp(en.combi.list.average) })
	const cells = within(average).getAllByRole("cell")
	// Score, money, exp, boxes, time, and the ✕ column; the row's header is "Average".
	expect(cells.map((c) => c.textContent?.trim())).toEqual(["", "12,501", "", "0", "", ""])
})

test("every cell has a name, for the browser to fill and restore", async () => {
	setup(addRound(newDraft()))
	for (const input of screen.getAllByRole("textbox")) expect(input.getAttribute("name")).not.toBeNull()
})

test("a change from elsewhere replaces what the cells show", async () => {
	const draft = setRoundValue(addRound(newDraft()), 0, "money", 5)
	const { onchange } = setup(draft)
	expect(cell(1, "money").value).toBe("5")
	onchange(setRoundValue(draft, 0, "money", 7))
	await Promise.resolve()
	expect(cell(1, "money").value).toBe("7")
})
