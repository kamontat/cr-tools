import { fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import Segmented from "#components/atoms/Segmented.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const options = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
]

test("clicking an option reports its value", async () => {
	const onchange = vi.fn()
	render(Segmented, { props: { label: "Pick", options, value: "a", onchange } })
	await fireEvent.click(screen.getByRole("button", { name: "Beta" }))
	expect(onchange).toHaveBeenCalledWith("b")
})

test("exactly one button is pressed, the current value", () => {
	render(Segmented, { props: { label: "Pick", options, value: "b", onchange: vi.fn() } })
	const pressed = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true")
	expect(pressed.map((b) => b.textContent?.trim())).toEqual(["Beta"])
	expect(screen.getByRole("group", { name: "Pick" })).toBeTruthy()
})
