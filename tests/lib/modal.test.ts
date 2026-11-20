import { afterEach, expect, test, vi } from "vitest"

import { focusables, holdFocus, isModalOpen, lockScroll } from "#lib/modal"

afterEach(() => {
	document.body.innerHTML = ""
})

function setUp() {
	const opener = document.createElement("button")
	opener.textContent = "Open"
	const dialog = document.createElement("div")
	dialog.tabIndex = -1
	dialog.innerHTML = `
		<button id="first">First</button>
		<button disabled>Off</button>
		<div hidden><button>Hidden</button></div>
		<input id="field" />
		<span tabindex="-1">Skipped</span>
		<div id="last" tabindex="0">Last</div>`
	const after = document.createElement("button")
	after.textContent = "Behind"
	document.body.append(opener, dialog, after)
	opener.focus()
	return { opener, dialog, after }
}

const tab = (shiftKey = false) => {
	const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true })
	;(document.activeElement ?? document.body).dispatchEvent(event)
	return event
}

test("lists the elements Tab can reach, in order", () => {
	const { dialog } = setUp()
	expect(focusables(dialog).map((el) => el.id || el.textContent)).toEqual(["first", "field", "last"])
})

test("moves focus into the dialog, and back to the opener when released", () => {
	const { opener, dialog } = setUp()
	const release = holdFocus(dialog)
	expect(document.activeElement).toBe(dialog)
	release()
	expect(document.activeElement).toBe(opener)
})

test("Tab on the last element wraps to the first, Shift+Tab on the first to the last", () => {
	const { dialog } = setUp()
	const release = holdFocus(dialog)
	;(dialog.querySelector("#last") as HTMLElement).focus()
	expect(tab().defaultPrevented).toBe(true)
	expect(document.activeElement?.id).toBe("first")
	expect(tab(true).defaultPrevented).toBe(true)
	expect(document.activeElement?.id).toBe("last")
	release()
})

test("Tab from the dialog itself goes to its first element, Shift+Tab to its last", () => {
	const { dialog } = setUp()
	const release = holdFocus(dialog)
	tab(true)
	expect(document.activeElement?.id).toBe("last")
	dialog.focus()
	tab()
	expect(document.activeElement?.id).toBe("first")
	release()
})

test("Tab between inner elements is left to the browser", () => {
	const { dialog } = setUp()
	const release = holdFocus(dialog)
	;(dialog.querySelector("#first") as HTMLElement).focus()
	expect(tab().defaultPrevented).toBe(false)
	release()
})

test("focus that lands behind the dialog is pulled back in", () => {
	const { dialog, after } = setUp()
	const release = holdFocus(dialog)
	after.focus()
	expect(dialog.contains(document.activeElement)).toBe(true)
	release()
	after.focus()
	expect(document.activeElement).toBe(after)
})

const pressEscape = (target: Element | null = document.activeElement) => {
	const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	;(target ?? document.body).dispatchEvent(event)
	return event
}

function stacked() {
	const { dialog: lower } = setUp()
	const upper = document.createElement("div")
	upper.tabIndex = -1
	upper.innerHTML = `<button id="up-first">Up first</button><button id="up-last">Up last</button>`
	document.body.append(upper)
	return { lower, upper }
}

test("Escape calls the open modal's onescape once and marks the event handled", () => {
	const { dialog } = setUp()
	const onescape = vi.fn()
	const release = holdFocus(dialog, onescape)
	expect(isModalOpen(document)).toBe(true)
	expect(pressEscape().defaultPrevented).toBe(true)
	expect(onescape).toHaveBeenCalledTimes(1)
	release()
	expect(isModalOpen(document)).toBe(false)
})

test("an Escape a control inside already consumed does not close the modal", () => {
	const { dialog } = setUp()
	const onescape = vi.fn()
	const release = holdFocus(dialog, onescape)
	const field = dialog.querySelector("#field") as HTMLElement
	field.addEventListener("keydown", (event) => event.preventDefault())
	field.focus()
	pressEscape()
	expect(onescape).not.toHaveBeenCalled()
	release()
})

test("with two modals stacked, Escape reaches only the topmost", () => {
	const { lower, upper } = stacked()
	const closeLower = vi.fn()
	const closeUpper = vi.fn()
	const releaseLower = holdFocus(lower, closeLower)
	const releaseUpper = holdFocus(upper, closeUpper)
	pressEscape()
	expect(closeUpper).toHaveBeenCalledTimes(1)
	expect(closeLower).not.toHaveBeenCalled()
	releaseUpper()
	pressEscape()
	expect(closeLower).toHaveBeenCalledTimes(1)
	expect(closeUpper).toHaveBeenCalledTimes(1)
	releaseLower()
})

test("with two modals stacked, Tab wraps inside the topmost and never lands in the lower one", () => {
	const { lower, upper } = stacked()
	const releaseLower = holdFocus(lower)
	const releaseUpper = holdFocus(upper)
	;(upper.querySelector("#up-last") as HTMLElement).focus()
	tab()
	expect(document.activeElement?.id).toBe("up-first")
	tab(true)
	expect(document.activeElement?.id).toBe("up-last")
	;(lower.querySelector("#first") as HTMLElement).focus()
	expect(upper.contains(document.activeElement)).toBe(true)
	releaseUpper()
	expect(lower.contains(document.activeElement)).toBe(true)
	releaseLower()
})

test("after release, Tab is no longer held", () => {
	const { dialog } = setUp()
	const release = holdFocus(dialog)
	release()
	;(dialog.querySelector("#last") as HTMLElement).focus()
	expect(tab().defaultPrevented).toBe(false)
})

test("skips hidden and inert elements", () => {
	const root = document.createElement("div")
	root.innerHTML = `
		<button id="shown">Shown</button>
		<button hidden>Hidden itself</button>
		<div hidden><button>Inside hidden</button></div>
		<button inert>Inert itself</button>
		<div inert><a href="#x">Inside inert</a></div>
		<button style="display: none">Display none</button>
		<div style="display:none"><input /></div>
		<input id="kept" />`
	document.body.append(root)
	expect(focusables(root).map((el) => el.id)).toEqual(["shown", "kept"])
})

test("lockScroll hides the page's overflow until the last release, and a second release is ignored", () => {
	const root = document.documentElement
	root.style.overflow = "auto"
	const first = lockScroll(document)
	const second = lockScroll(document)
	expect(root.style.overflow).toBe("hidden")
	first()
	first()
	expect(root.style.overflow).toBe("hidden")
	second()
	expect(root.style.overflow).toBe("auto")
	root.style.overflow = ""
})
