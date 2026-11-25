import { fireEvent, render, screen } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, expect, test, vi } from "vitest"

import Button from "#components/atoms/Button.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

const children = createRawSnippet(() => ({ render: () => `<span>Go</span>` }))

test("is a button of type button by default, with its children inside", () => {
	render(Button, { props: { children } })
	const button = screen.getByRole("button", { name: "Go" })
	expect(button.tagName).toBe("BUTTON")
	expect(button.getAttribute("type")).toBe("button")
})

test("takes the submit type when asked", () => {
	render(Button, { props: { children, type: "submit" } })
	expect(screen.getByRole("button").getAttribute("type")).toBe("submit")
})

test("a press calls onclick, and a disabled button does not", async () => {
	const onclick = vi.fn()
	const { rerender } = render(Button, { props: { children, onclick } })
	await fireEvent.click(screen.getByRole("button"))
	expect(onclick).toHaveBeenCalledTimes(1)
	await rerender({ disabled: true })
	const button = screen.getByRole("button") as HTMLButtonElement
	expect(button.disabled).toBe(true)
	await fireEvent.click(button)
	expect(onclick).toHaveBeenCalledTimes(1)
})

test("the variant is a class: plain by default, then primary and danger", async () => {
	const { rerender } = render(Button, { props: { children } })
	const button = screen.getByRole("button")
	expect(button.classList.contains("plain")).toBe(true)
	await rerender({ variant: "primary" })
	expect(button.classList.contains("primary")).toBe(true)
	expect(button.classList.contains("plain")).toBe(false)
	await rerender({ variant: "danger" })
	expect(button.classList.contains("danger")).toBe(true)
})

test("other attributes reach the button", () => {
	render(Button, { props: { children, "aria-expanded": true, "aria-label": "Share", "aria-controls": "x" } })
	const button = screen.getByRole("button", { name: "Share" })
	expect(button.getAttribute("aria-expanded")).toBe("true")
	expect(button.getAttribute("aria-controls")).toBe("x")
})
