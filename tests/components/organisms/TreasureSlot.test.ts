import { fireEvent, render, screen, within } from "@testing-library/svelte"
import { afterEach, expect, type Mock, test, vi } from "vitest"

import TreasureSlot from "#components/organisms/TreasureSlot.svelte"

type Pick = { id: string; name: string; src: string | null; levels: number[] }

const options = [
	{ id: "001", name: "Bear Jelly Parfait", src: "/assets/a.png" },
	{ id: "002", name: "Lucky Dice", src: null },
	{ id: "003", name: "Squishy Jelly Watch", src: "/assets/c.png" },
]
const labels = {
	add: "Add treasure",
	remove: "Remove",
	search: "Search treasures",
	allLevels: "All levels",
	level: (n: number) => `Level +${n}`,
}
const pick = (id: string, levels: number[]): Pick => {
	const option = options.find((o) => o.id === id) as (typeof options)[number]
	return { ...option, levels }
}

function setup(picks: Pick[]) {
	const onchange = vi.fn()
	const result = render(TreasureSlot, { props: { index: 1, label: "Slot 1", picks, options, onchange, labels } })
	return { ...result, onchange }
}

const strip = (name: string) => within(screen.getByRole("group", { name }))
const last = (onchange: Mock) => onchange.mock.calls.at(-1)?.[0] as Pick[]

afterEach(() => {
	document.body.innerHTML = ""
})

test("the slot is a group named by its label", () => {
	setup([])
	expect(screen.getByRole("group", { name: "Slot 1" })).toBeTruthy()
})

test("each pick shows ten levels, pressed as held", () => {
	setup([pick("002", [0, 3])])
	const levels = strip("Lucky Dice").getAllByRole("button", { name: /^Level/ })
	expect(levels.map((b) => b.textContent?.trim())).toEqual(["+0", "+1", "+2", "+3", "+4", "+5", "+6", "+7", "+8", "+9"])
	expect(levels.map((b) => b.getAttribute("aria-pressed") === "true")).toEqual([
		true,
		false,
		false,
		true,
		false,
		false,
		false,
		false,
		false,
		false,
	])
})

test("a click toggles one level", async () => {
	const { onchange } = setup([pick("002", [0])])
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Level +4" }))
	expect(last(onchange)).toEqual([pick("002", [0, 4])])
})

test("a level toggle never empties the pick", async () => {
	const { onchange, rerender } = setup([pick("002", [0, 4])])
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Level +4" }))
	expect(last(onchange)).toEqual([pick("002", [0])])
	await rerender({ picks: [pick("002", [0])] })
	onchange.mockClear()
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Level +0" }))
	expect(onchange).not.toHaveBeenCalled()
})

test("shift-click selects the range from the last pressed level", async () => {
	const { onchange, rerender } = setup([pick("002", [0])])
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Level +7" }))
	await rerender({ picks: [pick("002", [0, 7])] })
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Level +4" }), { shiftKey: true })
	expect(last(onchange)).toEqual([pick("002", [4, 5, 6, 7])])
})

test("shift-click before any press ranges from the lowest held level", async () => {
	const { onchange } = setup([pick("002", [2])])
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Level +5" }), { shiftKey: true })
	expect(last(onchange)).toEqual([pick("002", [2, 3, 4, 5])])
})

test("All levels toggles all of them, then back to +0", async () => {
	const { onchange, rerender } = setup([pick("002", [3])])
	const all = strip("Lucky Dice").getByRole("button", { name: "All levels" })
	expect(all.getAttribute("aria-pressed")).toBe("false")
	await fireEvent.click(all)
	expect(last(onchange)).toEqual([pick("002", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])])
	await rerender({ picks: [pick("002", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])] })
	const again = strip("Lucky Dice").getByRole("button", { name: "All levels" })
	expect(again.getAttribute("aria-pressed")).toBe("true")
	await fireEvent.click(again)
	expect(last(onchange)).toEqual([pick("002", [0])])
})

test("remove drops that pick", async () => {
	const { onchange } = setup([pick("001", [0]), pick("002", [1])])
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Remove" }))
	expect(last(onchange)).toEqual([pick("001", [0])])
})

test("the add picker adds at +0 in option order, and a picked one is pressed", async () => {
	const { onchange } = setup([pick("003", [2])])
	const add = screen.getByRole("button", { name: "Add treasure" })
	expect(add.getAttribute("aria-expanded")).toBe("false")
	expect(screen.queryByRole("group", { name: "Add treasure" })).toBeNull()
	await fireEvent.click(add)
	expect(add.getAttribute("aria-expanded")).toBe("true")
	const picker = within(screen.getByRole("group", { name: "Add treasure" }))
	expect(picker.getByRole("button", { name: "Squishy Jelly Watch" }).getAttribute("aria-pressed")).toBe("true")
	await fireEvent.click(picker.getByRole("button", { name: "Bear Jelly Parfait" }))
	expect(last(onchange)).toEqual([pick("001", [0]), pick("003", [2])])
})

test("the add picker removes a picked one, and its search narrows", async () => {
	const { onchange } = setup([pick("001", [0]), pick("003", [2])])
	await fireEvent.click(screen.getByRole("button", { name: "Add treasure" }))
	const picker = within(screen.getByRole("group", { name: "Add treasure" }))
	const search = picker.getByRole("searchbox", { name: "Search treasures" })
	await fireEvent.input(search, { target: { value: "dice" } })
	expect(picker.queryByRole("button", { name: "Bear Jelly Parfait" })).toBeNull()
	expect(picker.getByRole("button", { name: "Lucky Dice" })).toBeTruthy()
	await fireEvent.input(search, { target: { value: "" } })
	await fireEvent.click(picker.getByRole("button", { name: "Bear Jelly Parfait" }))
	expect(last(onchange)).toEqual([pick("003", [2])])
})

test("a carried pick the options lack stays, after the listed ones", async () => {
	const retired = { id: "0ZZ", name: "Old Relic", src: null, levels: [0] }
	const { onchange } = setup([retired])
	await fireEvent.click(screen.getByRole("button", { name: "Add treasure" }))
	const picker = within(screen.getByRole("group", { name: "Add treasure" }))
	await fireEvent.click(picker.getByRole("button", { name: "Lucky Dice" }))
	expect(last(onchange)).toEqual([pick("002", [0]), retired])
})

test("shift-click before any press ranges from the lowest level, whatever the order", async () => {
	const { onchange } = setup([pick("002", [6, 3])])
	await fireEvent.click(strip("Lucky Dice").getByRole("button", { name: "Level +1" }), { shiftKey: true })
	expect(last(onchange)).toEqual([pick("002", [1, 2, 3])])
})

test("two slots with the same index never share a DOM id", async () => {
	const first = setup([])
	const second = setup([])
	await fireEvent.click(within(first.container).getByRole("button", { name: "Add treasure" }))
	await fireEvent.click(within(second.container).getByRole("button", { name: "Add treasure" }))
	const ids = [...document.querySelectorAll("[id]")].map((el) => el.id)
	expect(ids.length).toBeGreaterThan(0)
	expect(new Set(ids).size).toBe(ids.length)
	for (const add of screen.getAllByRole("button", { name: "Add treasure" })) {
		expect(document.getElementById(add.getAttribute("aria-controls") ?? "")).not.toBeNull()
	}
})
