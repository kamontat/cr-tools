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

test("without a src a placeholder carries the name", () => {
	const { container } = render(EntryIcon, { props: { src: null, name: "Brave" } })
	expect(container.querySelector("img")).toBeNull()
	const tile = screen.getByLabelText("Brave")
	expect(tile.getAttribute("title")).toBe("Brave")
})
