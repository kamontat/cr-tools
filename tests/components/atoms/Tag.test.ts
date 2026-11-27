import { render, screen } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, expect, test } from "vitest"

import Tag from "#components/atoms/Tag.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const children = createRawSnippet(() => ({ render: () => `<span>Tower</span>` }))

test("is a small span with its text, muted by default", () => {
	render(Tag, { props: { children } })
	const tag = screen.getByText("Tower").parentElement
	expect(tag?.tagName).toBe("SPAN")
	expect(tag?.classList.contains("tag")).toBe(true)
	expect(tag?.classList.contains("muted")).toBe(true)
})

test("the tone is a class: muted, outlined or filled", async () => {
	const { rerender } = render(Tag, { props: { children, tone: "filled" } })
	const tag = () => screen.getByText("Tower").parentElement
	expect(tag()?.classList.contains("filled")).toBe(true)
	await rerender({ tone: "outlined" })
	expect(tag()?.classList.contains("outlined")).toBe(true)
	expect(tag()?.classList.contains("filled")).toBe(false)
})
