import type { Window as HappyWindow } from "happy-dom"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import Overlay from "#components/molecules/Overlay.svelte"

const children = createRawSnippet(() => ({
	render: () => `<div><button type="button" class="first">Inside</button></div>`,
}))
const footer = createRawSnippet(() => ({ render: () => `<p>Footer note</p>` }))
const labels = { closeLabel: "Shut", resizeLabel: "Widen", expandLabel: "Taller" }

const viewport = (width: number, height = 800) =>
	(window as unknown as HappyWindow).happyDOM.setViewport({ width, height })

beforeEach(() => {
	viewport(1000)
	window.localStorage.clear()
})

afterEach(() => {
	cleanup()
	document.body.innerHTML = ""
})

type Over = Partial<{ kind: "panel" | "dialog"; danger: boolean; open: boolean; focus: string }>

const setup = (over: Over = {}) => {
	const onclose = vi.fn()
	const result = render(Overlay, {
		props: { id: "about", title: "About", open: true, onclose, children, footer, ...labels, ...over },
	})
	return { ...result, onclose }
}

const dialog = () => screen.getByRole("dialog", { name: "About" })
const layout = () => dialog().getAttribute("data-layout")

test("renders nothing when closed", () => {
	setup({ open: false })
	expect(screen.queryByRole("dialog")).toBeNull()
})

test("is a modal dialog named by its title, with its content, a footer and a close button", () => {
	setup()
	expect(dialog().getAttribute("aria-modal")).toBe("true")
	expect(screen.getByRole("heading", { name: "About" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "Inside" })).toBeTruthy()
	expect(screen.getByText("Footer note").closest("footer")).toBeTruthy()
	expect(screen.getByRole("button", { name: "Shut" })).toBeTruthy()
})

test("takes focus on open, by default itself or the element a selector names, and hands it back on close", async () => {
	const before = document.createElement("button")
	document.body.append(before)
	before.focus()
	const { unmount } = setup()
	await waitFor(() => expect(document.activeElement).toBe(dialog()))
	unmount()
	expect(document.activeElement).toBe(before)

	setup({ focus: ".first" })
	await waitFor(() => expect(document.activeElement?.textContent).toBe("Inside"))
})

test("closes on Escape, the scrim and the close button; an Escape already handled does not", async () => {
	const { onclose, container } = setup()
	const inside = screen.getByRole("button", { name: "Inside" })
	await fireEvent.keyDown(inside, { key: "Escape" })
	expect(onclose).toHaveBeenCalledTimes(1)
	inside.addEventListener("keydown", (event) => event.preventDefault())
	await fireEvent.keyDown(inside, { key: "Escape" })
	expect(onclose).toHaveBeenCalledTimes(1)
	await fireEvent.click(container.querySelector(".overlay-scrim") as HTMLElement)
	expect(onclose).toHaveBeenCalledTimes(2)
	await fireEvent.click(screen.getByRole("button", { name: "Shut" }))
	expect(onclose).toHaveBeenCalledTimes(3)
})

test("a panel is a side panel from 700px and a sheet below, switching without closing", async () => {
	const { onclose } = setup()
	expect(layout()).toBe("side")
	expect(screen.getByRole("separator", { name: "Widen" })).toBeTruthy()
	expect(screen.queryByRole("button", { name: "Taller" })).toBeNull()

	viewport(699)
	window.dispatchEvent(new Event("resize"))
	await waitFor(() => expect(layout()).toBe("sheet"))
	expect(screen.queryByRole("separator")).toBeNull()
	expect(screen.getByRole("button", { name: "Taller" })).toBeTruthy()

	viewport(700)
	window.dispatchEvent(new Event("resize"))
	await waitFor(() => expect(layout()).toBe("side"))
	expect(onclose).not.toHaveBeenCalled()
})

test("the side panel's edge resizes in 16px steps, remembers the width per id, and resets on double-click", async () => {
	setup()
	const separator = screen.getByRole("separator", { name: "Widen" })
	expect(separator.getAttribute("aria-valuenow")).toBe("460")
	expect(dialog().style.getPropertyValue("--panel-width")).toBe("460px")
	await fireEvent.keyDown(separator, { key: "ArrowLeft" })
	expect(dialog().style.getPropertyValue("--panel-width")).toBe("476px")
	expect(window.localStorage.getItem("frame:panel-width:about")).toBe("476")
	await fireEvent.keyDown(separator, { key: "End" })
	expect(separator.getAttribute("aria-valuenow")).toBe("600")
	await fireEvent.dblClick(separator)
	expect(separator.getAttribute("aria-valuenow")).toBe("460")
	expect(window.localStorage.getItem("frame:panel-width:about")).toBeNull()
})

test("a remembered width opens the side panel at it", () => {
	window.localStorage.setItem("frame:panel-width:about", "520")
	setup()
	expect(dialog().style.getPropertyValue("--panel-width")).toBe("520px")
})

test("the sheet's handle: a tap, ↑ and ↓ toggle full height", async () => {
	viewport(400)
	setup()
	const handle = screen.getByRole("button", { name: "Taller" })
	expect(handle.getAttribute("aria-expanded")).toBe("false")
	await fireEvent.click(handle)
	expect(handle.getAttribute("aria-expanded")).toBe("true")
	expect(dialog().classList.contains("full")).toBe(true)
	await fireEvent.keyDown(handle, { key: "ArrowDown" })
	expect(handle.getAttribute("aria-expanded")).toBe("false")
	await fireEvent.keyDown(handle, { key: "ArrowUp" })
	expect(handle.getAttribute("aria-expanded")).toBe("true")
})

test("the sheet's handle: dragged up past 70% it snaps to full height; dragged down 100px it closes", async () => {
	viewport(400, 1000)
	const { onclose } = setup()
	const handle = screen.getByRole("button", { name: "Taller" })
	await fireEvent.pointerDown(handle, { clientY: 500, button: 0, pointerId: 1 })
	await fireEvent.pointerMove(handle, { clientY: 250, pointerId: 1 })
	await fireEvent.pointerUp(handle, { clientY: 250, pointerId: 1 })
	await fireEvent.click(handle)
	expect(handle.getAttribute("aria-expanded")).toBe("true")
	expect(onclose).not.toHaveBeenCalled()

	await fireEvent.pointerDown(handle, { clientY: 100, button: 0, pointerId: 2 })
	await fireEvent.pointerMove(handle, { clientY: 220, pointerId: 2 })
	await fireEvent.pointerUp(handle, { clientY: 220, pointerId: 2 })
	expect(onclose).toHaveBeenCalledTimes(1)
})

test("a dialog is centred, with no resize edge or handle at any width; danger marks it", () => {
	setup({ kind: "dialog", danger: true })
	expect(layout()).toBe("dialog")
	expect(dialog().classList.contains("danger")).toBe(true)
	expect(screen.queryByRole("separator")).toBeNull()
	expect(screen.queryByRole("button", { name: "Taller" })).toBeNull()
})
