import { beforeEach, expect, test } from "vitest"

import { applyTheme, readTheme, THEME_KEY, writeTheme } from "#lib/theme"

beforeEach(() => localStorage.clear())

test("readTheme maps dark and light, anything else to system", () => {
	expect(readTheme()).toBe("system")
	localStorage.setItem(THEME_KEY, "dark")
	expect(readTheme()).toBe("dark")
	localStorage.setItem(THEME_KEY, "light")
	expect(readTheme()).toBe("light")
	localStorage.setItem(THEME_KEY, "purple")
	expect(readTheme()).toBe("system")
})

test("readTheme falls back to system when storage is null", () => {
	expect(readTheme(null)).toBe("system")
})

test("writeTheme stores dark and light, and system removes the key", () => {
	writeTheme("dark")
	expect(localStorage.getItem("theme")).toBe("dark")
	writeTheme("system")
	expect(localStorage.getItem("theme")).toBeNull()
})

test("applyTheme sets data-theme for dark and light and removes it for system", () => {
	const el = document.createElement("html")
	applyTheme("light", el)
	expect(el.getAttribute("data-theme")).toBe("light")
	applyTheme("dark", el)
	expect(el.getAttribute("data-theme")).toBe("dark")
	applyTheme("system", el)
	expect(el.hasAttribute("data-theme")).toBe(false)
})
