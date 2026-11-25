process.env["TZ"] = "Asia/Bangkok"

import type { SavedCode } from "#lib/combi/saved"

import { cleanup, render, screen, waitFor } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test } from "vitest"

import StorageBox from "#components/organisms/StorageBox.svelte"
import { LOCAL_LIMIT, localUse, usageText } from "#lib/combi/backup"
import { en } from "#lib/i18n/en"

const entries: SavedCode[] = [
	{
		code: "1-MS0A000000",
		description: "Money farm",
		savedAt: Date.UTC(2026, 10, 1, 5),
		rounds: [{ money: 1 }, { money: 2 }],
	},
	{ code: "1-AM0A000000", description: "", savedAt: Date.UTC(2026, 10, 20, 5) },
]

const storage = Object.getOwnPropertyDescriptor(navigator, "storage")
const setStorage = (value: unknown) =>
	Object.defineProperty(navigator, "storage", { value, configurable: true, writable: true })

beforeEach(() => {
	window.localStorage.clear()
	document.documentElement.lang = "en"
	setStorage(undefined)
})

afterEach(() => {
	cleanup()
	document.documentElement.lang = ""
	document.body.innerHTML = ""
	if (storage) Object.defineProperty(navigator, "storage", storage)
	else setStorage(undefined)
})

const open = () => render(StorageBox, { props: { entries, m: en, store: window.localStorage, refresh: 0 } })

const shown = (term: string) => {
	const dt = [...document.querySelectorAll("dt")].find((one) => one.textContent === term)
	return dt?.nextElementSibling?.textContent
}

test("lists the six counts", () => {
	open()
	const c = en.settings.data.counts
	expect(shown(c.codes)).toBe("2")
	expect(shown(c.rounds)).toBe("2")
	expect(shown(c.withRounds)).toBe("1")
	expect(shown(c.withNote)).toBe("1")
	expect(shown(c.first)).toBe("Nov 1, 2026")
	expect(shown(c.last)).toBe("Nov 20, 2026")
})

test("with nothing saved the dates are a dash", () => {
	render(StorageBox, { props: { entries: [], m: en, store: window.localStorage, refresh: 0 } })
	expect(shown(en.settings.data.counts.first)).toBe("-")
})

test("localStorage use against the limit, said to be approximate", () => {
	window.localStorage.setItem("a", "bbbb")
	open()
	const use = usageText(localUse(window.localStorage), LOCAL_LIMIT, "en-US")
	expect(shown(en.settings.data.localStorage)).toBe(`${use.used} / ${use.limit} (${use.percent})`)
	expect(screen.getByText(en.settings.data.approximate)).toBeTruthy()
})

test("site storage is not reported without navigator.storage", () => {
	open()
	expect(shown(en.settings.data.siteStorage)).toBe(en.settings.data.notReported)
})

test("site storage is usage / quota when the estimate resolves", async () => {
	setStorage({ estimate: () => Promise.resolve({ usage: 1024 * 1024, quota: 100 * 1024 * 1024 }) })
	open()
	const use = usageText(1024 * 1024, 100 * 1024 * 1024, "en-US")
	await waitFor(() => expect(shown(en.settings.data.siteStorage)).toBe(`${use.used} / ${use.limit} (${use.percent})`))
})

test("a rejecting estimate is not reported", async () => {
	setStorage({ estimate: () => Promise.reject(new Error("no")) })
	open()
	await waitFor(() => expect(shown(en.settings.data.siteStorage)).toBe(en.settings.data.notReported))
})

test("the numbers follow refresh", async () => {
	const { rerender } = open()
	const before = shown(en.settings.data.localStorage)
	window.localStorage.setItem("more", "x".repeat(5000))
	await rerender({ entries, m: en, store: window.localStorage, refresh: 1 })
	expect(shown(en.settings.data.localStorage)).not.toBe(before)
})

test("site storage shows a neutral word until the estimate resolves", async () => {
	let finish: (value: { usage: number; quota: number }) => void = () => {}
	setStorage({ estimate: () => new Promise((done) => (finish = done)) })
	open()
	expect(shown(en.settings.data.siteStorage)).toBe(en.settings.data.checking)
	finish({ usage: 1024, quota: 1024 * 1024 })
	await waitFor(() => expect(shown(en.settings.data.siteStorage)).not.toBe(en.settings.data.checking))
})
