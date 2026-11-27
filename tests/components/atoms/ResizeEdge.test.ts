import { cleanup, fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, expect, test, vi } from "vitest"

import ResizeEdge from "#components/atoms/ResizeEdge.svelte"

afterEach(() => {
	cleanup()
	document.body.innerHTML = ""
})

const setup = (value = 460) => {
	const handlers = { onresize: vi.fn(), oncommit: vi.fn(), onreset: vi.fn() }
	render(ResizeEdge, {
		props: { label: "Widen", value, min: 360, max: 720, rightEdge: () => 1000, ...handlers },
	})
	return { separator: screen.getByRole("separator", { name: "Widen" }), ...handlers }
}

test("is a focusable vertical separator carrying its value and limits", () => {
	const { separator } = setup()
	expect(separator.getAttribute("aria-orientation")).toBe("vertical")
	expect(separator.getAttribute("aria-valuenow")).toBe("460")
	expect(separator.getAttribute("aria-valuemin")).toBe("360")
	expect(separator.getAttribute("aria-valuemax")).toBe("720")
	expect(separator.tabIndex).toBe(0)
})

test("← widens and → narrows by 16; Home and End go to the limits; each commits", async () => {
	const { separator, onresize, oncommit } = setup()
	for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) await fireEvent.keyDown(separator, { key })
	expect(onresize.mock.calls.map(([width]) => width)).toEqual([476, 444, 360, 720])
	expect(oncommit).toHaveBeenCalledTimes(4)
	await fireEvent.keyDown(separator, { key: "a" })
	expect(onresize).toHaveBeenCalledTimes(4)
})

test("a drag measures from the right edge and commits once, when the button comes up", async () => {
	const { separator, onresize, oncommit } = setup()
	await fireEvent.pointerMove(separator, { clientX: 500, pointerId: 1 })
	expect(onresize).not.toHaveBeenCalled()
	await fireEvent.pointerDown(separator, { clientX: 540, button: 0, pointerId: 1 })
	await fireEvent.pointerMove(separator, { clientX: 500, pointerId: 1 })
	expect(onresize).toHaveBeenLastCalledWith(500)
	expect(separator.classList.contains("dragging")).toBe(true)
	expect(oncommit).not.toHaveBeenCalled()
	await fireEvent.pointerUp(window, { pointerId: 1 })
	expect(oncommit).toHaveBeenCalledTimes(1)
	expect(separator.classList.contains("dragging")).toBe(false)
	await fireEvent.pointerUp(window, { pointerId: 1 })
	expect(oncommit).toHaveBeenCalledTimes(1)
})

test("a double-click resets", async () => {
	const { separator, onreset } = setup()
	await fireEvent.dblClick(separator)
	expect(onreset).toHaveBeenCalledTimes(1)
})
