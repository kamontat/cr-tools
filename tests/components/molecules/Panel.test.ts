import type { Window as HappyWindow } from "happy-dom"

import { fireEvent, render, screen } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import Panel from "#components/molecules/Panel.svelte"

const children = createRawSnippet(() => ({
	render: () => `<div><button type="button">Inside</button></div>`,
}))
const footer = createRawSnippet(() => ({ render: () => `<p>Footer note</p>` }))
/** The caller names the controls in its language; there is no English default. */
const labels = { closeLabel: "Shut", resizeLabel: "Widen" }

const original = Object.getOwnPropertyDescriptor(window, "localStorage")

const viewport = (width: number) => (window as unknown as HappyWindow).happyDOM.setViewport({ width, height: 800 })

beforeEach(() => {
	viewport(1200)
	window.localStorage.clear()
})

afterEach(() => {
	if (original) Object.defineProperty(window, "localStorage", original)
	vi.restoreAllMocks()
	document.body.innerHTML = ""
})

const open = (props: Partial<{ id: string; onclose: () => void; withFooter: boolean }> = {}) => {
	const onclose = props.onclose ?? vi.fn()
	const result = render(Panel, {
		props: {
			id: props.id ?? "about",
			title: "About",
			open: true,
			onclose,
			children,
			...labels,
			...(props.withFooter ? { footer } : {}),
		},
	})
	return { ...result, onclose }
}

const panelWidth = () => screen.getByRole("dialog").style.getPropertyValue("--panel-width")

test("renders nothing when closed", () => {
	render(Panel, { props: { id: "about", title: "About", open: false, onclose: vi.fn(), children, ...labels } })
	expect(screen.queryByRole("dialog")).toBeNull()
	expect(screen.queryByText("Inside")).toBeNull()
})

test("when open, is a modal dialog named by its title, holding its content and footer", () => {
	open({ withFooter: true })
	const dialog = screen.getByRole("dialog", { name: "About" })
	expect(dialog.getAttribute("aria-modal")).toBe("true")
	expect(screen.getByRole("heading", { name: "About" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "Inside" })).toBeTruthy()
	expect(screen.getByText("Footer note")).toBeTruthy()
})

test("Escape calls onclose once", async () => {
	const { onclose } = open()
	await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
	expect(onclose).toHaveBeenCalledTimes(1)
})

test("Escape while closed, or already consumed inside, does not call onclose", async () => {
	const onclose = vi.fn()
	const { rerender } = render(Panel, {
		props: { id: "about", title: "About", open: false, onclose, children, ...labels },
	})
	await fireEvent.keyDown(document.body, { key: "Escape" })
	expect(onclose).not.toHaveBeenCalled()
	await rerender({ open: true })
	const inside = screen.getByRole("button", { name: "Inside" })
	inside.addEventListener("keydown", (event) => event.preventDefault())
	await fireEvent.keyDown(inside, { key: "Escape" })
	expect(onclose).not.toHaveBeenCalled()
})

const stack = () => {
	const closeEditor = vi.fn()
	const closeShare = vi.fn()
	const editor = render(Panel, {
		props: { id: "editor", title: "Editor", open: true, onclose: closeEditor, children, ...labels },
	})
	const share = render(Panel, {
		props: { id: "share", title: "Share", open: true, onclose: closeShare, children, ...labels },
	})
	return { editor, share, closeEditor, closeShare }
}

test("with a panel open over another, Escape closes only the top one, and a second Escape the other", async () => {
	const { share, closeEditor, closeShare } = stack()
	await fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
	expect(closeShare).toHaveBeenCalledTimes(1)
	expect(closeEditor).not.toHaveBeenCalled()
	await share.rerender({ open: false })
	expect(screen.getByRole("dialog", { name: "Editor" }).contains(document.activeElement)).toBe(true)
	await fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
	expect(closeEditor).toHaveBeenCalledTimes(1)
	expect(closeShare).toHaveBeenCalledTimes(1)
})

test("with a panel open over another, Tab in the top one never lands in the lower one", async () => {
	stack()
	const top = screen.getByRole("dialog", { name: "Share" })
	const lower = screen.getByRole("dialog", { name: "Editor" })
	const separator = top.querySelector('[role="separator"]') as HTMLElement
	separator.focus()
	await fireEvent.keyDown(separator, { key: "Tab" })
	expect(top.contains(document.activeElement)).toBe(true)
	await fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey: true })
	expect(top.contains(document.activeElement)).toBe(true)
	;(lower.querySelector("button") as HTMLElement).focus()
	expect(top.contains(document.activeElement)).toBe(true)
})

test("clicking the scrim or the close button calls onclose", async () => {
	const { onclose, container } = open()
	const scrim = container.querySelector(".panel-scrim") as HTMLElement
	await fireEvent.click(scrim)
	expect(onclose).toHaveBeenCalledTimes(1)
	await fireEvent.click(screen.getByRole("button", { name: "Shut" }))
	expect(onclose).toHaveBeenCalledTimes(2)
})

test("focus moves into the panel, and back to the opener when it closes", async () => {
	const opener = document.createElement("button")
	document.body.append(opener)
	opener.focus()
	const { rerender } = open()
	expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true)
	await rerender({ open: false })
	expect(document.activeElement).toBe(opener)
})

test("Tab stays inside the open panel", async () => {
	open()
	const separator = screen.getByRole("separator")
	separator.focus()
	await fireEvent.keyDown(separator, { key: "Tab" })
	expect(document.activeElement).toBe(screen.getByRole("button", { name: "Shut" }))
})

test("opens at 460px, and ArrowLeft on the separator widens it by 16 and remembers it", async () => {
	open()
	const separator = screen.getByRole("separator", { name: "Widen" })
	expect(separator.getAttribute("aria-orientation")).toBe("vertical")
	expect(separator.getAttribute("aria-valuenow")).toBe("460")
	expect(panelWidth()).toBe("460px")
	await fireEvent.keyDown(separator, { key: "ArrowLeft" })
	expect(separator.getAttribute("aria-valuenow")).toBe("476")
	expect(panelWidth()).toBe("476px")
	expect(window.localStorage.getItem("frame:panel-width:about")).toBe("476")
	await fireEvent.keyDown(separator, { key: "ArrowRight" })
	expect(window.localStorage.getItem("frame:panel-width:about")).toBe("460")
})

test("dragging the separator sizes the panel from the right edge and remembers it on release", async () => {
	open()
	const separator = screen.getByRole("separator")
	await fireEvent.pointerDown(separator, { clientX: 740, button: 0, pointerId: 1 })
	await fireEvent.pointerMove(separator, { clientX: 700, pointerId: 1 })
	expect(panelWidth()).toBe("500px")
	expect(window.localStorage.getItem("frame:panel-width:about")).toBeNull()
	await fireEvent.pointerUp(separator, { clientX: 700, pointerId: 1 })
	expect(window.localStorage.getItem("frame:panel-width:about")).toBe("500")
	await fireEvent.pointerMove(separator, { clientX: 600, pointerId: 1 })
	expect(panelWidth()).toBe("500px")
})

test("a drag ends when the button comes up off the handle, or the handle loses the pointer", async () => {
	const { container } = open()
	const separator = screen.getByRole("separator")
	const layer = () => container.querySelector(".panel-layer") as HTMLElement

	await fireEvent.pointerDown(separator, { clientX: 740, button: 0, pointerId: 1 })
	expect(layer().classList.contains("resizing")).toBe(true)
	await fireEvent.pointerUp(window, { clientX: 100, pointerId: 1 })
	expect(layer().classList.contains("resizing")).toBe(false)
	expect(window.localStorage.getItem("frame:panel-width:about")).not.toBeNull()

	await fireEvent.pointerDown(separator, { clientX: 740, button: 0, pointerId: 2 })
	await fireEvent(separator, new Event("lostpointercapture"))
	expect(layer().classList.contains("resizing")).toBe(false)
})

test("a stored width wider than the page allows opens clamped", () => {
	viewport(1000)
	window.localStorage.setItem("frame:panel-width:about", "1400")
	open()
	expect(panelWidth()).toBe("600px")
})

test("the editor opens at 640px", () => {
	open({ id: "editor" })
	expect(panelWidth()).toBe("640px")
})

test("a throwing storage still opens at the default width", () => {
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		get() {
			throw new Error("denied")
		},
	})
	const { unmount } = open()
	expect(panelWidth()).toBe("460px")
	unmount()
	open({ id: "editor" })
	expect(panelWidth()).toBe("640px")
})

test("a storage whose calls throw still opens at the default width and resizes", async () => {
	vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
		throw new Error("denied")
	})
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new Error("denied")
	})
	open()
	expect(panelWidth()).toBe("460px")
	await fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" })
	expect(panelWidth()).toBe("476px")
})

test("on a phone it is a bottom sheet with a grab handle and no separator", () => {
	viewport(390)
	const { container } = open()
	const dialog = screen.getByRole("dialog")
	expect(dialog.getAttribute("data-layout")).toBe("sheet")
	expect(container.querySelector(".panel-grab")).not.toBeNull()
	expect(screen.queryByRole("separator")).toBeNull()
	expect(panelWidth()).toBe("")
})

test("on a larger screen it is a side panel without a grab handle", () => {
	const { container } = open()
	expect(screen.getByRole("dialog").getAttribute("data-layout")).toBe("side")
	expect(container.querySelector(".panel-grab")).toBeNull()
})
