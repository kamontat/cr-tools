import { afterEach, expect, test } from "vitest"

import { localStore, memoryStore, readKey, writeKey } from "#lib/storage"

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

const original = Object.getOwnPropertyDescriptor(window, "localStorage")

afterEach(() => {
	if (original) Object.defineProperty(window, "localStorage", original)
})

test("readKey returns null when the store throws", () => {
	expect(readKey("k", throwing)).toBeNull()
})

test("writeKey returns false when the store throws", () => {
	expect(writeKey("k", "v", throwing)).toBe(false)
	expect(writeKey("k", null, throwing)).toBe(false)
})

test("localStore returns null when reaching localStorage throws", () => {
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		get() {
			throw new Error("denied")
		},
	})
	expect(localStore()).toBeNull()
	expect(readKey("k")).toBeNull()
	expect(writeKey("k", "v")).toBe(false)
})

test("readKey and writeKey round-trip, and null removes", () => {
	const store = localStore()
	expect(store).not.toBeNull()
	expect(writeKey("k", "v", store)).toBe(true)
	expect(readKey("k", store)).toBe("v")
	expect(writeKey("k", null, store)).toBe(true)
	expect(readKey("k", store)).toBeNull()
})

test("memoryStore keeps items for the visit like a Storage", () => {
	const store = memoryStore()
	expect(store.length).toBe(0)
	store.setItem("a", "1")
	store.setItem("b", 2 as unknown as string)
	expect(store.getItem("a")).toBe("1")
	expect(store.getItem("b")).toBe("2")
	expect(store.getItem("none")).toBeNull()
	expect(store.length).toBe(2)
	expect(store.key(0)).toBe("a")
	expect(store.key(5)).toBeNull()
	store.removeItem("a")
	expect(store.length).toBe(1)
	store.clear()
	expect(store.length).toBe(0)
	expect(memoryStore().getItem("b")).toBeNull()
})
