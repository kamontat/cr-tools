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

test("an option given a language marks its button with it, and one without carries none", () => {
	const named = [
		{ value: "th", label: "ไทย", lang: "th" },
		{ value: "en", label: "English", lang: "en" },
		{ value: "x", label: "Other" },
	]
	render(Segmented, { props: { label: "Language", options: named, value: "th", onchange: vi.fn() } })
	expect(screen.getByRole("button", { name: "ไทย" }).getAttribute("lang")).toBe("th")
	expect(screen.getByRole("button", { name: "English" }).getAttribute("lang")).toBe("en")
	expect(screen.getByRole("button", { name: "Other" }).hasAttribute("lang")).toBe(false)
})
