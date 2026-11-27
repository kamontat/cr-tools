import { render } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, expect, test } from "vitest"

import Surface from "#components/atoms/Surface.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const children = createRawSnippet(() => ({ render: () => `<p>Inside</p>` }))

test("is a div card by default, with its children inside", () => {
	const { container } = render(Surface, { props: { children } })
	const surface = container.querySelector(".surface")
	expect(surface?.tagName).toBe("DIV")
	expect(surface?.classList.contains("card")).toBe(true)
	expect(surface?.textContent).toBe("Inside")
})

test("the kind is a class: card, sunken or row", async () => {
	const { container, rerender } = render(Surface, { props: { children, kind: "sunken" } })
	const surface = () => container.querySelector(".surface")
	expect(surface()?.classList.contains("sunken")).toBe(true)
	await rerender({ kind: "row" })
	expect(surface()?.classList.contains("row")).toBe(true)
	expect(surface()?.classList.contains("sunken")).toBe(false)
})

test("renders the element asked for, with the caller's class and attributes", () => {
	const { container } = render(Surface, {
		props: { children, element: "section", class: "share", "aria-label": "Share" },
	})
	const surface = container.querySelector("section")
	expect(surface?.classList.contains("surface")).toBe(true)
	expect(surface?.classList.contains("share")).toBe(true)
	expect(surface?.getAttribute("aria-label")).toBe("Share")
})
