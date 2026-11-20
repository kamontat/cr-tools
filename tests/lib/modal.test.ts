import { afterEach, expect, test } from "vitest"

import { focusables, holdFocus } from "#lib/modal"

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

test("after release, Tab is no longer held", () => {
	const { dialog } = setUp()
	const release = holdFocus(dialog)
	release()
	;(dialog.querySelector("#last") as HTMLElement).focus()
	expect(tab().defaultPrevented).toBe(false)
})
