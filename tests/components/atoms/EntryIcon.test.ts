import { render, screen } from "@testing-library/svelte"
import { afterEach, expect, test } from "vitest"

import EntryIcon from "#components/atoms/EntryIcon.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

test("an image carries the name as alt and title, and loads lazily", () => {
	render(EntryIcon, { props: { src: "/assets/x.png", name: "Brave" } })
	const img = screen.getByRole("img", { name: "Brave" })
	expect(img.tagName).toBe("IMG")
	expect(img.getAttribute("title")).toBe("Brave")
	expect(img.getAttribute("loading")).toBe("lazy")
	expect(img.getAttribute("src")).toBe("/assets/x.png")
})

test("an image's size is set in its style too, since the reset's height: auto overrides the attribute", () => {
	render(EntryIcon, { props: { src: "/assets/x.png", name: "Brave", size: 36 } })
	const img = screen.getByRole("img", { name: "Brave" })
	expect(img.getAttribute("width")).toBe("36")
	expect(img.style.width).toBe("36px")
	expect(img.style.height).toBe("36px")
})

test("without a src a placeholder carries the name", () => {
	const { container } = render(EntryIcon, { props: { src: null, name: "Brave" } })
	expect(container.querySelector("img")).toBeNull()
	const tile = screen.getByLabelText("Brave")
	expect(tile.getAttribute("title")).toBe("Brave")
})

test("a treasure's kind frames its picture in the kind's colour, with its letter on the corner", () => {
	for (const [kind, letter] of [
		["base", "N"],
		["evolved", "E"],
		["blessed", "B"],
	] as const) {
		const { container } = render(EntryIcon, { props: { src: "/assets/x.png", name: `T ${kind}`, kind } })
		const frame = container.querySelector(".kind")
		expect(frame?.getAttribute("data-kind")).toBe(kind)
		expect(frame?.contains(screen.getByRole("img", { name: `T ${kind}` }))).toBe(true)
		const badge = frame?.querySelector(".badge")
		expect(badge?.textContent?.trim()).toBe(letter)
		expect(badge?.getAttribute("aria-hidden")).toBe("true")
	}
})

test("without a kind there is no frame", () => {
	const { container } = render(EntryIcon, { props: { src: "/assets/x.png", name: "Brave" } })
	expect(container.querySelector(".kind")).toBeNull()
	expect(container.querySelector(".badge")).toBeNull()
})
