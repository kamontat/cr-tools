import { expect, test } from "vitest"

import {
	clampWidth,
	DEFAULT_WIDTH,
	defaultWidth,
	EDITOR_DEFAULT_WIDTH,
	initialWidth,
	MIN_WIDTH,
	maxRatio,
	readWidth,
	writeWidth,
} from "#lib/panel-width"

function memoryStorage(): Storage {
	const data = new Map<string, string>()
	return {
		get length() {
			return data.size
		},
		clear: () => data.clear(),
		getItem: (key) => data.get(key) ?? null,
		key: (index) => [...data.keys()][index] ?? null,
		removeItem: (key) => {
			data.delete(key)
		},
		setItem: (key, value) => {
			data.set(key, value)
		},
	}
}

const refusing = {
	getItem: () => {
		throw new Error("denied")
	},
	setItem: () => {
		throw new Error("denied")
	},
	removeItem: () => {
		throw new Error("denied")
	},
}

test("the editor may take 70% of the page, every other panel 60%", () => {
	expect(MIN_WIDTH).toBe(360)
	expect(maxRatio("editor")).toBe(0.7)
	expect(maxRatio("about")).toBe(0.6)
})

test("a width stays between 360px and the panel's share of the page", () => {
	expect(clampWidth(100, 1200, "about")).toBe(360)
	expect(clampWidth(1000, 1200, "about")).toBe(720)
	expect(clampWidth(1000, 1200, "editor")).toBe(840)
	expect(clampWidth(500, 1200, "about")).toBe(500)
	expect(clampWidth(500.6, 1200, "about")).toBe(501)
})

test("the default is 460px, or 640px for the editor", () => {
	expect(defaultWidth("about")).toBe(DEFAULT_WIDTH)
	expect(DEFAULT_WIDTH).toBe(460)
	expect(defaultWidth("editor")).toBe(EDITOR_DEFAULT_WIDTH)
	expect(EDITOR_DEFAULT_WIDTH).toBe(640)
})

test("a stored width reads back under frame:panel-width:<id>, and anything else reads as none", () => {
	const storage = memoryStorage()
	expect(readWidth(storage, "about")).toBeNull()
	writeWidth(storage, "about", 480)
	expect(storage.getItem("frame:panel-width:about")).toBe("480")
	expect(readWidth(storage, "about")).toBe(480)
	expect(readWidth(storage, "editor")).toBeNull()
	writeWidth(storage, "about", null)
	expect(readWidth(storage, "about")).toBeNull()
	storage.setItem("frame:panel-width:editor", "wide")
	expect(readWidth(storage, "editor")).toBeNull()
	storage.setItem("frame:panel-width:editor", "-5")
	expect(readWidth(storage, "editor")).toBeNull()
})

test("a browser that refuses storage, or has none, still resizes, it only forgets", () => {
	expect(readWidth(refusing, "about")).toBeNull()
	expect(() => writeWidth(refusing, "about", 480)).not.toThrow()
	expect(readWidth(null, "about")).toBeNull()
	expect(() => writeWidth(null, "about", 480)).not.toThrow()
})

test("a panel opens at its stored width, clamped to the page it opens on", () => {
	const storage = memoryStorage()
	writeWidth(storage, "about", 1400)
	expect(initialWidth(storage, "about", 1000)).toBe(600)
	expect(initialWidth(storage, "editor", 1000)).toBe(640)
	expect(initialWidth(refusing, "editor", 1400)).toBe(640)
	expect(initialWidth(null, "about", 1400)).toBe(460)
})
