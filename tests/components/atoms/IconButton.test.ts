import { fireEvent, render, screen } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, expect, test, vi } from "vitest"

import IconButton from "#components/atoms/IconButton.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const children = createRawSnippet(() => ({ render: () => `<span>×</span>` }))

test("is a button named by its label, not by its icon", () => {
	render(IconButton, { props: { label: "Close", children } })
	const button = screen.getByRole("button", { name: "Close" })
	expect(button.getAttribute("type")).toBe("button")
	expect(button.textContent).toBe("×")
})

test("a press calls onclick, and a disabled one does not", async () => {
	const onclick = vi.fn()
	const { rerender } = render(IconButton, { props: { label: "Close", children, onclick } })
	await fireEvent.click(screen.getByRole("button"))
	expect(onclick).toHaveBeenCalledTimes(1)
	await rerender({ disabled: true })
	await fireEvent.click(screen.getByRole("button"))
	expect(onclick).toHaveBeenCalledTimes(1)
})

test("other attributes reach the button", () => {
	render(IconButton, { props: { label: "More", children, "aria-expanded": false, "aria-controls": "menu" } })
	const button = screen.getByRole("button", { name: "More" })
	expect(button.getAttribute("aria-expanded")).toBe("false")
	expect(button.getAttribute("aria-controls")).toBe("menu")
})
