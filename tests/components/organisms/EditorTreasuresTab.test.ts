import type { Draft } from "#lib/combi/draft"

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import EditorTreasuresTab from "#components/organisms/EditorTreasuresTab.svelte"
import { newDraft, setOrdered } from "#lib/combi/draft"
import { en } from "#lib/i18n/en"

afterEach(cleanup)

function setup(draft: Draft = newDraft()) {
	const onchange = vi.fn((next: Draft) => void result.rerender({ draft: next }))
	const result = render(EditorTreasuresTab, { props: { uid: "t", draft, m: en, onchange } })
	return { onchange }
}

test("the order is a switch in the treasures' own heading, not a row of its own", () => {
	setup()
	const order = screen.getByRole("switch", { name: en.combi.editor.exactOrder })
	expect((order as HTMLInputElement).checked).toBe(false)
	expect(screen.queryByRole("group", { name: "Order" })).toBeNull()
	const treasures = screen.getByRole("group", { name: en.combi.describe.fields.treasures })
	expect(treasures.querySelector(".head")?.contains(order)).toBe(true)
})

test("turning the switch on asks for the exact order, and off for any order", async () => {
	const { onchange } = setup()
	const order = screen.getByRole("switch", { name: en.combi.editor.exactOrder })
	await fireEvent.click(order)
	expect(onchange.mock.lastCall?.[0].picks.loadout.ordered).toBe(true)
	expect((order as HTMLInputElement).checked).toBe(true)
	expect(screen.getByText(en.combi.editor.slot(1))).toBeTruthy()
	await fireEvent.click(order)
	expect(onchange.mock.lastCall?.[0].picks.loadout.ordered).toBe(false)
})

test("a draft in exact order shows the switch on", () => {
	setup(setOrdered(newDraft(), true))
	expect((screen.getByRole("switch", { name: en.combi.editor.exactOrder }) as HTMLInputElement).checked).toBe(true)
})

test("the treasures' help also explains the order", () => {
	setup()
	expect(document.getElementById("t-treasures-help")?.textContent).toContain(en.combi.help.treasureOrder)
})
