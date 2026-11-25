import type { Window as HappyWindow } from "happy-dom"

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte"
import { createRawSnippet } from "svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import Panel from "#components/molecules/Panel.svelte"

const children = createRawSnippet(() => ({
	render: () => `<div><button type="button">Inside</button></div>`,
}))
const footer = createRawSnippet(() => ({ render: () => `<p>Footer note</p>` }))
const actions = createRawSnippet(() => ({ render: () => `<button type="button">Act</button>` }))
/** The caller names the controls in its language; there is no English default. */
const labels = { closeLabel: "Shut", resizeLabel: "Widen" }

const original = Object.getOwnPropertyDescriptor(window, "localStorage")

const viewport = (width: number) => (window as unknown as HappyWindow).happyDOM.setViewport({ width, height: 800 })

beforeEach(() => {
	viewport(1200)
	window.localStorage.clear()
})

afterEach(() => {
	cleanup()
	if (original) Object.defineProperty(window, "localStorage", original)
	vi.restoreAllMocks()
	document.body.innerHTML = ""
})

const open = (
	props: Partial<{
		id: string
		onclose: () => void
		withFooter: boolean
		withActions: boolean
		back: boolean
	}> = {},
) => {
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
			...(props.withActions ? { actions } : {}),
			...(props.back ? { back: true } : {}),
		},
	})
	return { ...result, onclose }
}

const panelWidth = () => screen.getByRole("region").style.getPropertyValue("--panel-width")

test("renders nothing when closed", () => {
	render(Panel, { props: { id: "about", title: "About", open: false, onclose: vi.fn(), children, ...labels } })
	expect(screen.queryByRole("region")).toBeNull()
	expect(screen.queryByText("Inside")).toBeNull()
})

test("when open, is a section named by its title, holding its content and footer, never a modal dialog", () => {
	const { container } = open({ withFooter: true })
	const region = screen.getByRole("region", { name: "About" })
	expect(region.tagName).toBe("SECTION")
	expect(container.contains(region)).toBe(true)
	expect(screen.queryByRole("dialog")).toBeNull()
	expect(document.querySelector(".panel-scrim, .panel-layer, .panel-grab")).toBeNull()
	expect(screen.getByRole("heading", { name: "About" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "Inside" })).toBeTruthy()
	expect(screen.getByText("Footer note")).toBeTruthy()
})

test("Escape inside closes once; one outside, or already handled inside, does not", async () => {
	const { onclose } = open()
	const inside = screen.getByRole("button", { name: "Inside" })
	await fireEvent.keyDown(inside, { key: "Escape" })
	expect(onclose).toHaveBeenCalledTimes(1)
	await fireEvent.keyDown(document.body, { key: "Escape" })
	expect(onclose).toHaveBeenCalledTimes(1)
	inside.addEventListener("keydown", (event) => event.preventDefault())
	await fireEvent.keyDown(inside, { key: "Escape" })
	expect(onclose).toHaveBeenCalledTimes(1)
})

test("Tab is not trapped, and the page keeps scrolling", async () => {
	open()
	const separator = screen.getByRole("separator", { name: "Widen" })
	separator.focus()
	expect(await fireEvent.keyDown(separator, { key: "Tab" })).toBe(true)
	expect(document.documentElement.style.overflow).toBe("")
})

test("the close button calls onclose", async () => {
	const { onclose } = open()
	await fireEvent.click(screen.getByRole("button", { name: "Shut" }))
	expect(onclose).toHaveBeenCalledTimes(1)
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
	open()
	const separator = screen.getByRole("separator")
	const layer = () => screen.getByRole("region")

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

test("the editor's separator resizes and remembers the width", async () => {
	open({ id: "editor" })
	const separator = screen.getByRole("separator")
	await fireEvent.keyDown(separator, { key: "ArrowLeft" })
	expect(separator.getAttribute("aria-valuenow")).toBe("656")
	expect(window.localStorage.getItem("frame:panel-width:editor")).toBe("656")
})

test("actions sit in the header, before the close button", () => {
	open({ withActions: true })
	const header = document.querySelector(".panel-head") as HTMLElement
	const buttons = [...header.querySelectorAll("button")].map(
		(button) => button.getAttribute("aria-label") ?? button.textContent?.trim(),
	)
	expect(buttons).toEqual(["Act", "Shut"])
	expect(document.querySelector(".panel-foot")).toBeNull()
})

test("as a page's view: the close button is a back arrow before the title, and nothing resizes", async () => {
	const { onclose } = open({ back: true })
	const section = document.querySelector('[data-layout="view"]') as HTMLElement
	expect(section).not.toBeNull()
	const back = screen.getByRole("button", { name: "Shut" })
	expect(back.textContent?.trim()).toBe("←")
	// The arrow leads the header, before the title.
	expect(section.querySelector(".panel-head")?.firstElementChild).toBe(back)
	expect(screen.queryByRole("separator")).toBeNull()
	await fireEvent.click(back)
	expect(onclose).toHaveBeenCalledTimes(1)
})
