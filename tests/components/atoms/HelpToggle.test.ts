import { fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import HelpToggle from "#components/atoms/HelpToggle.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

test("aria-expanded follows the prop and aria-controls names the panel", async () => {
	const { rerender } = render(HelpToggle, {
		props: { label: "Help", controls: "p1", expanded: false, ontoggle: vi.fn() },
	})
	const button = screen.getByRole("button", { name: "Help" })
	expect(button.getAttribute("aria-expanded")).toBe("false")
	expect(button.getAttribute("aria-controls")).toBe("p1")
	await rerender({ expanded: true })
	expect(button.getAttribute("aria-expanded")).toBe("true")
})

test("a click calls ontoggle", async () => {
	const ontoggle = vi.fn()
	render(HelpToggle, { props: { label: "Help", controls: "p1", expanded: false, ontoggle } })
	await fireEvent.click(screen.getByRole("button", { name: "Help" }))
	expect(ontoggle).toHaveBeenCalledTimes(1)
})
