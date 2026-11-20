import { Window as HappyWindow } from "happy-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import {
	applyLang,
	currentLang,
	LANG_KEY,
	onLangChange,
	readLang,
	syncFromStorage,
	syncOnRestore,
	writeLang,
} from "#lib/lang"

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

let happy: HappyWindow
let doc: Document

beforeEach(() => {
	happy = new HappyWindow()
	doc = (happy as unknown as Window).document
})

afterEach(async () => {
	await happy.happyDOM.close()
})

test("reads Thai when nothing is stored", () => {
	expect(readLang(memory())).toBe("th")
	expect(readLang(null)).toBe("th")
})

test("reads a stored choice", () => {
	const store = memory()
	store.setItem(LANG_KEY, "en")
	expect(readLang(store)).toBe("en")
	store.setItem(LANG_KEY, "th")
	expect(readLang(store)).toBe("th")
})

test.each(["TH", "fr", "", "en "])("anything else reads as Thai: %j", (value) => {
	const store = memory()
	store.setItem(LANG_KEY, value)
	expect(readLang(store)).toBe("th")
})

test("storage that throws reads Thai and writes nothing", () => {
	expect(readLang(throwing)).toBe("th")
	expect(() => writeLang("en", throwing)).not.toThrow()
})

test("writeLang stores Thai too", () => {
	const store = memory()
	writeLang("th", store)
	expect(store.getItem("lang")).toBe("th")
	writeLang("en", store)
	expect(store.getItem("lang")).toBe("en")
})

test("applyLang sets lang, the title and every localized attribute, then tells listeners", () => {
	const root = doc.documentElement
	root.setAttribute("data-title-th", "ตั้งค่า")
	root.setAttribute("data-title-en", "Settings")
	doc.body.innerHTML = `<button data-l10n aria-label="เมนู" data-aria-label-th="เมนู" data-aria-label-en="Menu"></button>`
	const button = doc.querySelector("button") as HTMLButtonElement

	const listener = vi.fn()
	const off = onLangChange(doc, listener)

	applyLang("en", doc)
	expect(root.lang).toBe("en")
	expect(doc.title).toBe("Settings")
	expect(button.getAttribute("aria-label")).toBe("Menu")
	expect(listener).toHaveBeenCalledTimes(1)
	expect(listener).toHaveBeenCalledWith("en")

	off()
	applyLang("th", doc)
	expect(listener).toHaveBeenCalledTimes(1)
	expect(button.getAttribute("aria-label")).toBe("เมนู")
	expect(doc.title).toBe("ตั้งค่า")
})

test("currentLang reads <html lang>, and anything else as Thai", () => {
	doc.documentElement.lang = "en"
	expect(currentLang(doc)).toBe("en")
	doc.documentElement.lang = ""
	expect(currentLang(doc)).toBe("th")
	doc.documentElement.lang = "de"
	expect(currentLang(doc)).toBe("th")
})

const englishPage = () => {
	const root = doc.documentElement
	root.lang = "th"
	root.setAttribute("data-title-th", "หน้าแรก")
	root.setAttribute("data-title-en", "Home")
	doc.title = "หน้าแรก"
	doc.body.innerHTML = `<button data-l10n aria-label="เมนู" data-aria-label-th="เมนู" data-aria-label-en="Menu"></button>`
	return doc.querySelector("button") as HTMLButtonElement
}

const pageshow = (persisted: boolean) => {
	const event = new happy.Event("pageshow")
	Object.defineProperty(event, "persisted", { value: persisted })
	;(happy as unknown as Window).dispatchEvent(event as unknown as Event)
}

test("syncFromStorage brings a Thai page to the stored English, with its title and attributes", () => {
	const button = englishPage()
	const store = memory()
	store.setItem(LANG_KEY, "en")
	store.setItem("theme", "light")
	const listener = vi.fn()
	onLangChange(doc, listener)

	syncFromStorage(doc, store)
	expect(doc.documentElement.lang).toBe("en")
	expect(doc.title).toBe("Home")
	expect(button.getAttribute("aria-label")).toBe("Menu")
	expect(doc.documentElement.getAttribute("data-theme")).toBe("light")
	expect(listener).toHaveBeenCalledWith("en")
})

test("syncFromStorage leaves a page already in the stored language alone, and clears a theme the store no longer holds", () => {
	englishPage()
	doc.documentElement.setAttribute("data-theme", "dark")
	const listener = vi.fn()
	onLangChange(doc, listener)
	syncFromStorage(doc, memory())
	expect(doc.documentElement.lang).toBe("th")
	expect(listener).not.toHaveBeenCalled()
	expect(doc.documentElement.hasAttribute("data-theme")).toBe(false)
})

test("syncFromStorage survives storage that throws", () => {
	englishPage()
	expect(() => syncFromStorage(doc, throwing)).not.toThrow()
	expect(doc.documentElement.lang).toBe("th")
})

test("a page restored from the back-forward cache picks up the language chosen since", () => {
	const button = englishPage()
	const store = memory()
	const off = syncOnRestore(happy as unknown as Window, doc, store)
	store.setItem(LANG_KEY, "en")

	pageshow(false)
	expect(doc.documentElement.lang).toBe("th")

	pageshow(true)
	expect(doc.documentElement.lang).toBe("en")
	expect(doc.title).toBe("Home")
	expect(button.getAttribute("aria-label")).toBe("Menu")

	off()
	store.setItem(LANG_KEY, "th")
	pageshow(true)
	expect(doc.documentElement.lang).toBe("en")
})
