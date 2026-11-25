import { afterEach, expect, test, vi } from "vitest"

import { copyText, readClipboard } from "#lib/clipboard"

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard")
const setClipboard = (value: unknown) =>
	Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true })

afterEach(() => {
	if (original) Object.defineProperty(navigator, "clipboard", original)
	else setClipboard(undefined)
})

test("copies the text and says so", async () => {
	const writeText = vi.fn(() => Promise.resolve())
	setClipboard({ writeText })
	expect(await copyText("MS0A000000")).toBe(true)
	expect(writeText).toHaveBeenCalledWith("MS0A000000")
})

test("a browser with no clipboard gets false, not an error", async () => {
	setClipboard(undefined)
	expect(await copyText("MS0A000000")).toBe(false)
})

test("reading with no clipboard says missing", async () => {
	setClipboard(undefined)
	expect(await readClipboard()).toEqual({ ok: false, reason: "missing" })
	setClipboard({})
	expect(await readClipboard()).toEqual({ ok: false, reason: "missing" })
})

test("a refused read says refused, not a rejection", async () => {
	setClipboard({ readText: vi.fn(() => Promise.reject(new DOMException("denied", "NotAllowedError"))) })
	expect(await readClipboard()).toEqual({ ok: false, reason: "refused" })
})

test("a read gives the text", async () => {
	setClipboard({ readText: vi.fn(() => Promise.resolve("1-MS0A000000")) })
	expect(await readClipboard()).toEqual({ ok: true, text: "1-MS0A000000" })
})

test("a refused write gets false, not a rejection", async () => {
	setClipboard({ writeText: vi.fn(() => Promise.reject(new DOMException("denied", "NotAllowedError"))) })
	expect(await copyText("MS0A000000")).toBe(false)
})

test("a write that throws at once gets false too", async () => {
	setClipboard({
		writeText: () => {
			throw new Error("boom")
		},
	})
	expect(await copyText("MS0A000000")).toBe(false)
})
