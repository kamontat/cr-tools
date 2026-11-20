import { fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import EntryPicker from "#components/molecules/EntryPicker.svelte"

const options = [
	{ id: "01", name: "Brave", src: "/assets/brave.png" },
	{ id: "02", name: "Strawberry", src: null },
	{ id: "03", name: "Pure Vanilla", src: "/assets/pv.png" },
]
const base = { label: "Cookie", searchLabel: "Search cookies", options, value: null }

afterEach(() => {
	document.body.innerHTML = ""
})

test("every option is a button with its name, pressed when it is the value", () => {
	render(EntryPicker, { props: { ...base, value: "02", onpick: vi.fn() } })
	expect(screen.getByRole("group", { name: "Cookie" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "Brave" }).getAttribute("aria-pressed")).toBe("false")
	expect(screen.getByRole("button", { name: "Strawberry" }).getAttribute("aria-pressed")).toBe("true")
})

test("images load lazily", () => {
	const { container } = render(EntryPicker, { props: { ...base, onpick: vi.fn() } })
	const images = [...container.querySelectorAll("img")]
	expect(images).toHaveLength(2)
	for (const img of images) expect(img.getAttribute("loading")).toBe("lazy")
})

test("the search narrows by name, case-insensitive", async () => {
	render(EntryPicker, { props: { ...base, onpick: vi.fn() } })
	const search = screen.getByRole("searchbox", { name: "Search cookies" })
	await fireEvent.input(search, { target: { value: "VAN" } })
	expect(screen.queryByRole("button", { name: "Brave" })).toBeNull()
	expect(screen.getByRole("button", { name: "Pure Vanilla" })).toBeTruthy()
	await fireEvent.input(search, { target: { value: "" } })
	expect(screen.getByRole("button", { name: "Brave" })).toBeTruthy()
})

test("a click picks", async () => {
	const onpick = vi.fn()
	render(EntryPicker, { props: { ...base, onpick } })
	await fireEvent.click(screen.getByRole("button", { name: "Pure Vanilla" }))
	expect(onpick).toHaveBeenCalledWith("03")
})

test("the none button calls onclear, and is pressed while nothing is picked", async () => {
	const onclear = vi.fn()
	render(EntryPicker, { props: { ...base, onpick: vi.fn(), noneLabel: "None", onclear } })
	const none = screen.getByRole("button", { name: "None" })
	expect(none.getAttribute("aria-pressed")).toBe("true")
	await fireEvent.click(none)
	expect(onclear).toHaveBeenCalledTimes(1)
})

test("without onclear there is no none button", () => {
	render(EntryPicker, { props: { ...base, onpick: vi.fn(), noneLabel: "None" } })
	expect(screen.queryByRole("button", { name: "None" })).toBeNull()
})
