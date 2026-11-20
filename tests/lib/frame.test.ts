import { Window as HappyWindow } from "happy-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { initFrame, SIDEBAR_KEY, sidebarMode } from "#lib/frame"
import { holdFocus } from "#lib/modal"

const throwing = {
	getItem() {
		throw new Error("denied")
	},
	setItem() {
		throw new Error("denied")
	},
	removeItem() {
		throw new Error("denied")
	},
} as unknown as Storage

const memory = (): Storage => {
	const map = new Map<string, string>()
	return {
		get length() {
			return map.size
		},
		clear: () => map.clear(),
		getItem: (key) => map.get(key) ?? null,
		key: (index) => [...map.keys()][index] ?? null,
		removeItem: (key) => {
			map.delete(key)
		},
		setItem: (key, value) => {
			map.set(key, value)
		},
	}
}

// Each test gets its own window: initFrame listens on window and document for
// the life of the page, so a shared one would carry earlier tests' listeners.
let happy: HappyWindow
let win: Window
let doc: Document

const width = (value: number) => {
	happy.happyDOM.setViewport({ width: value })
	expect(win.innerWidth).toBe(value)
}

const toggle = () => doc.getElementById("menu-toggle") as HTMLButtonElement
const pressEscape = () =>
	doc.dispatchEvent(new happy.KeyboardEvent("keydown", { key: "Escape", bubbles: true }) as unknown as Event)
const link = () => {
	const anchor = doc.querySelector("#sidebar a") as HTMLAnchorElement
	anchor.addEventListener("click", (event) => event.preventDefault())
	return anchor
}

beforeEach(() => {
	happy = new HappyWindow({ width: 1024, height: 768 })
	win = happy as unknown as Window
	doc = win.document
	doc.body.innerHTML = `
		<header><button id="menu-toggle" aria-controls="sidebar" aria-expanded="false">☰</button></header>
		<nav id="sidebar"><a href="/">Home</a><a href="/settings/">Settings</a></nav>
		<div id="sidebar-scrim"></div>
		<main id="content"></main>`
})

afterEach(async () => {
	await happy.happyDOM.close()
})

test.each([
	[390, "drawer"],
	[699, "drawer"],
	[700, "rail"],
	[1099, "rail"],
	[1100, "full"],
	[1680, "full"],
] as const)("sidebarMode(%i) is %s", (value, mode) => {
	expect(sidebarMode(value)).toBe(mode)
})

test("SIDEBAR_KEY is frame:sidebar", () => {
	expect(SIDEBAR_KEY).toBe("frame:sidebar")
})

test("on a wide screen it starts open, and ☰ closes it and remembers that", () => {
	width(1280)
	const store = memory()
	initFrame(doc, store)
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
	expect(toggle().getAttribute("aria-expanded")).toBe("true")

	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
	expect(toggle().getAttribute("aria-expanded")).toBe("false")
	expect(store.getItem(SIDEBAR_KEY)).toBe("closed")

	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
	expect(store.getItem(SIDEBAR_KEY)).toBe("open")
})

test("on a wide screen a remembered closed sidebar starts closed", () => {
	width(1280)
	const store = memory()
	store.setItem(SIDEBAR_KEY, "closed")
	initFrame(doc, store)
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
	expect(toggle().getAttribute("aria-expanded")).toBe("false")
})

test("on a phone it starts closed, ☰ opens it, Escape closes it and focus returns to ☰", () => {
	width(390)
	const store = memory()
	store.setItem(SIDEBAR_KEY, "open")
	initFrame(doc, store)
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")

	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
	expect(toggle().getAttribute("aria-expanded")).toBe("true")
	link().focus()

	pressEscape()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
	expect(toggle().getAttribute("aria-expanded")).toBe("false")
	expect(doc.activeElement).toBe(toggle())
	expect(store.getItem(SIDEBAR_KEY)).toBe("open")
})

test("on a phone the scrim closes the drawer", () => {
	width(390)
	initFrame(doc, memory())
	toggle().click()
	;(doc.getElementById("sidebar-scrim") as HTMLElement).click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
})

test("closing with the scrim returns focus to ☰ when it was inside the sidebar", () => {
	width(390)
	initFrame(doc, memory())
	toggle().click()
	link().focus()
	;(doc.getElementById("sidebar-scrim") as HTMLElement).click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
	expect(doc.activeElement).toBe(toggle())
})

test("closing with the scrim leaves focus alone when it was outside the sidebar", () => {
	width(390)
	const main = doc.getElementById("content") as HTMLElement
	main.tabIndex = -1
	initFrame(doc, memory())
	toggle().click()
	main.focus()
	;(doc.getElementById("sidebar-scrim") as HTMLElement).click()
	expect(doc.activeElement).toBe(main)
})

test("on a phone following a link closes the drawer", () => {
	width(390)
	initFrame(doc, memory())
	toggle().click()
	link().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
})

test("between 700 and 1099px it starts as the rail, opens over the page, and does not persist", () => {
	width(900)
	const store = memory()
	initFrame(doc, store)
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
	expect(store.getItem(SIDEBAR_KEY)).toBeNull()
	pressEscape()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
})

test("on a wide screen Escape leaves the sidebar alone", () => {
	width(1280)
	initFrame(doc, memory())
	pressEscape()
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
})

test("on a wide screen following a link leaves the sidebar alone", () => {
	width(1280)
	initFrame(doc, memory())
	link().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
})

test("crossing a breakpoint resets to that mode's default", () => {
	width(1280)
	initFrame(doc, memory())
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
	width(390)
	win.dispatchEvent(new happy.Event("resize") as unknown as Event)
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
	expect(toggle().getAttribute("aria-expanded")).toBe("false")
})

test("storage that throws still toggles", () => {
	width(1280)
	initFrame(doc, throwing)
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
})

test("on a phone, Escape with a pop-up open over the drawer closes only the pop-up", () => {
	width(390)
	initFrame(doc, memory())
	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")

	const dialog = doc.createElement("div") as HTMLElement
	dialog.tabIndex = -1
	doc.body.append(dialog)
	const onescape = vi.fn()
	const release = holdFocus(dialog, onescape)

	pressEscape()
	expect(onescape).toHaveBeenCalledTimes(1)
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")

	release()
	pressEscape()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
})

test("an Escape something else already handled leaves the drawer open", () => {
	width(390)
	initFrame(doc, memory())
	toggle().click()
	const event = new happy.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	event.preventDefault()
	doc.dispatchEvent(event as unknown as Event)
	expect(doc.body.getAttribute("data-sidebar")).toBe("open")
})

test("no storage at all still toggles", () => {
	width(1280)
	initFrame(doc, null)
	toggle().click()
	expect(doc.body.getAttribute("data-sidebar")).toBe("closed")
})
