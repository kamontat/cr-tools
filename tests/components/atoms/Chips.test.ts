import { fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import Chips from "#components/atoms/Chips.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const options = [
	{ value: "a", label: "Alpha", icon: "/assets/a.png" },
	{ value: "b", label: "Beta" },
	{ value: "c", label: "Gamma", disabled: true },
]

test("single mode replaces the value", async () => {
	const onchange = vi.fn()
	render(Chips, { props: { label: "Pick", options, value: ["a"], onchange } })
	await fireEvent.click(screen.getByRole("button", { name: "Beta" }))
	expect(onchange).toHaveBeenCalledWith(["b"])
})

test("multiple mode toggles a value on and off", async () => {
	const onchange = vi.fn()
	render(Chips, { props: { label: "Pick", options, value: ["a"], multiple: true, onchange } })
	await fireEvent.click(screen.getByRole("button", { name: "Beta" }))
	expect(onchange).toHaveBeenLastCalledWith(["a", "b"])
	await fireEvent.click(screen.getByRole("button", { name: "Alpha" }))
	expect(onchange).toHaveBeenLastCalledWith([])
})

test("a disabled option is disabled and does not fire", async () => {
	const onchange = vi.fn()
	render(Chips, { props: { label: "Pick", options, value: [], onchange } })
	const gamma = screen.getByRole("button", { name: "Gamma" }) as HTMLButtonElement
	expect(gamma.disabled).toBe(true)
	await fireEvent.click(gamma)
	expect(onchange).not.toHaveBeenCalled()
})

test("the group is named, pressed follows the value, and the icon is decorative", () => {
	const { container } = render(Chips, { props: { label: "Pick", options, value: ["b"], onchange: vi.fn() } })
	expect(screen.getByRole("group", { name: "Pick" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "Beta" }).getAttribute("aria-pressed")).toBe("true")
	expect(screen.getByRole("button", { name: "Alpha" }).getAttribute("aria-pressed")).toBe("false")
	const img = container.querySelector("img")
	expect(img?.getAttribute("alt")).toBe("")
	expect(img?.getAttribute("src")).toBe("/assets/a.png")
})
