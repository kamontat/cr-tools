import { fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import Tabs from "#components/atoms/Tabs.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const tabs = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta", disabled: true },
	{ value: "c", label: "Gamma", badge: "3" },
]

test("a tablist of tabs, the current one selected", () => {
	render(Tabs, { props: { label: "Sections", tabs, value: "c", onchange: vi.fn() } })
	expect(screen.getByRole("tablist", { name: "Sections" })).toBeTruthy()
	const all = screen.getAllByRole("tab")
	expect(all.map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "false", "true"])
	expect(all[2]?.textContent).toContain("3")
})

test("clicking a tab selects it", async () => {
	const onchange = vi.fn()
	render(Tabs, { props: { label: "Sections", tabs, value: "a", onchange } })
	await fireEvent.click(screen.getByRole("tab", { name: /Gamma/ }))
	expect(onchange).toHaveBeenCalledWith("c")
})

test("arrow keys move and select, skipping disabled tabs and wrapping", async () => {
	const onchange = vi.fn()
	render(Tabs, { props: { label: "Sections", tabs, value: "a", onchange } })
	await fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowRight" })
	expect(onchange).toHaveBeenLastCalledWith("c")
	await fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowLeft" })
	expect(onchange).toHaveBeenLastCalledWith("c")
})

test("a disabled tab is disabled", () => {
	render(Tabs, { props: { label: "Sections", tabs, value: "a", onchange: vi.fn() } })
	expect((screen.getByRole("tab", { name: "Beta" }) as HTMLButtonElement).disabled).toBe(true)
})
