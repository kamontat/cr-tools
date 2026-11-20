import { fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import Toast from "#components/atoms/Toast.svelte"

afterEach(() => {
	document.body.innerHTML = ""
})

test("info and warn are a status region, error an alert", () => {
	for (const tone of ["info", "warn"] as const) {
		const { unmount } = render(Toast, { props: { message: "Hi", tone, ondismiss: vi.fn() } })
		expect(screen.getByRole("status")).toBeTruthy()
		unmount()
	}
	render(Toast, { props: { message: "Bad", tone: "error", ondismiss: vi.fn() } })
	expect(screen.getByRole("alert")).toBeTruthy()
})

test("the message shows while non-null, and the region stays in the DOM without one", async () => {
	const { rerender } = render(Toast, { props: { message: "Saved", tone: "info", ondismiss: vi.fn() } })
	expect(screen.getByRole("status").textContent).toContain("Saved")
	await rerender({ message: null })
	expect(screen.getByRole("status").textContent?.trim()).toBe("")
})

test("clicking the message dismisses it", async () => {
	const ondismiss = vi.fn()
	render(Toast, { props: { message: "Saved", tone: "info", ondismiss } })
	await fireEvent.click(screen.getByText("Saved"))
	expect(ondismiss).toHaveBeenCalled()
})
