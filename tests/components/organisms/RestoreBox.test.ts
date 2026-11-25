import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import RestoreBox from "#components/organisms/RestoreBox.svelte"
import { writeBackup } from "#lib/backup"
import { exportCodes } from "#lib/combi/backup"
import { formatSaved, parseSaved, readSaved, SAVED_KEY, type SavedCode } from "#lib/combi/saved"
import { en } from "#lib/i18n/en"

const t = en.settings.data
const a = "1-MS0A000000"
const b = "1-AM0A000000"
const list = (...codes: string[]): SavedCode[] =>
	codes.map((code, at) => ({ code, description: `note ${at}`, savedAt: 1764000000000 + at }))
const json = (...codes: string[]) => writeBackup({ "combi-codes": exportCodes(list(...codes)) }, new Date(0))

const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")
const setClipboard = (value: unknown) =>
	Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true })
const clipboardWith = (text: string) => setClipboard({ readText: () => Promise.resolve(text) })

let onrestored: ReturnType<typeof vi.fn>

beforeEach(() => {
	window.localStorage.clear()
	document.documentElement.lang = "en"
	onrestored = vi.fn()
})

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
	document.documentElement.lang = ""
	document.body.innerHTML = ""
	if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard)
	else setClipboard(undefined)
})

const open = (store: Storage = window.localStorage) =>
	render(RestoreBox, { props: { store, m: en, onrestored: (entries: SavedCode[]) => onrestored(entries) } })

const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }))

const seed = (...codes: string[]) => window.localStorage.setItem(SAVED_KEY, JSON.stringify(list(...codes)))

test("the start step offers the four sources and writes nothing", () => {
	open()
	for (const name of [t.fromClipboard, t.fromFile, t.fromLink, t.byHand]) {
		expect(screen.getByRole("button", { name })).toBeTruthy()
	}
	expect(screen.queryByRole("dialog")).toBeNull()
})

test("the clipboard's JSON previews what it found and Restore adds it", async () => {
	seed(a)
	clipboardWith(json(a, b))
	open()
	await press(t.fromClipboard)
	expect(await screen.findByText(t.found(2, 1, 1))).toBeTruthy()
	await press(t.restoreButton)
	expect(await screen.findByText(t.restored(1))).toBeTruthy()
	expect(readSaved(window.localStorage).map((entry) => entry.code)).toEqual([b, a])
	expect(onrestored).toHaveBeenCalledTimes(1)
	expect(onrestored.mock.calls[0]?.[0]).toHaveLength(2)
})

test("nothing is added until Restore is pressed", async () => {
	clipboardWith(json(a))
	open()
	await press(t.fromClipboard)
	await screen.findByText(t.found(1, 1, 0))
	expect(readSaved(window.localStorage)).toEqual([])
})

test("with every code already saved there is nothing to restore", async () => {
	seed(a)
	clipboardWith(json(a))
	open()
	await press(t.fromClipboard)
	await screen.findByText(t.found(1, 0, 1))
	expect(screen.queryByRole("button", { name: t.restoreButton })).toBeNull()
})

test("a bad entry among good ones is named by its position", async () => {
	const text = JSON.stringify({ "combi-codes": [{ code: a }, { code: "nonsense" }], version: 1 })
	clipboardWith(text)
	open()
	await press(t.fromClipboard)
	expect(await screen.findByText(t.found(1, 1, 0))).toBeTruthy()
	expect(screen.getByText(t.skipped(1))).toBeTruthy()
	expect(screen.getByText("combi-codes[1]")).toBeTruthy()
	await press(t.restoreButton)
	await screen.findByText(t.restored(1))
})

test("a missing clipboard goes to the paste box with the reason", async () => {
	setClipboard(undefined)
	open()
	await press(t.fromClipboard)
	expect(await screen.findByText(t.clipboardMissing)).toBeTruthy()
	expect(screen.getByRole("textbox", { name: t.pasteLabel })).toBeTruthy()
})

test("a refused clipboard goes to the paste box with its own reason", async () => {
	setClipboard({ readText: () => Promise.reject(new Error("denied")) })
	open()
	await press(t.fromClipboard)
	expect(await screen.findByText(t.clipboardRefused)).toBeTruthy()
	expect(screen.getByRole("textbox", { name: t.pasteLabel })).toBeTruthy()
})

test("pasted junk says it is not a backup and offers no Restore", async () => {
	open()
	await press(t.byHand)
	await fireEvent.input(screen.getByRole("textbox", { name: t.pasteLabel }), { target: { value: "hello there" } })
	expect(screen.getByText(t.notBackup)).toBeTruthy()
	expect(screen.queryByRole("button", { name: t.restoreButton })).toBeNull()
})

test("pasted JSON previews as it is typed", async () => {
	open()
	await press(t.byHand)
	await fireEvent.input(screen.getByRole("textbox", { name: t.pasteLabel }), { target: { value: json(a, b) } })
	expect(screen.getByText(t.found(2, 2, 0))).toBeTruthy()
	await press(t.restoreButton)
	await screen.findByText(t.restored(2))
})

test("a backup from a newer site is refused, naming its version", async () => {
	clipboardWith(JSON.stringify({ "combi-codes": [], version: 7 }))
	open()
	await press(t.fromClipboard)
	expect(await screen.findByText(t.newer(7))).toBeTruthy()
	expect(screen.queryByRole("button", { name: t.restoreButton })).toBeNull()
})

test("a JSON file with no combi-codes field says it found none", async () => {
	clipboardWith(JSON.stringify({ version: 1 }))
	open()
	await press(t.fromClipboard)
	expect(await screen.findByText(t.foundNone)).toBeTruthy()
})

test("an old text export restores as it always did", async () => {
	const old = `${formatSaved([{ code: a, description: "Money farm", savedAt: 1, rounds: [{ money: 12000 }] }])}\n${b}\nmoney: 1200-1500\n`
	clipboardWith(old)
	open()
	await press(t.fromClipboard)
	expect(await screen.findByText(t.found(2, 2, 0))).toBeTruthy()
	await press(t.restoreButton)
	await screen.findByText(t.restored(2))
	const saved = readSaved(window.localStorage)
	expect(saved.find((entry) => entry.code === a)?.description).toBe("Money farm")
	expect(saved.find((entry) => entry.code === a)?.rounds?.[0]?.money).toBe(12000)
	expect(saved.find((entry) => entry.code === b)?.rounds).toEqual(parseSaved(old).entries[1]?.rounds)
})

test("a file previews, named by the file", async () => {
	const { container } = open()
	const input = container.querySelector('input[type="file"]') as HTMLInputElement
	expect(input.accept).toBe(".json,application/json,.txt,text/plain")
	const file = new File([json(a)], "backup.json", { type: "application/json" })
	Object.defineProperty(input, "files", { value: [file], configurable: true })
	await fireEvent.change(input)
	expect(await screen.findByText(`${t.found(1, 1, 0)} ${t.foundIn("backup.json")}`)).toBeTruthy()
})

test("the link step's Restore waits for an address, and Enter submits", async () => {
	const fetcher = vi.fn(() => Promise.resolve(new Response(json(a))))
	vi.stubGlobal("fetch", fetcher)
	open()
	await press(t.fromLink)
	const field = screen.getByRole("textbox", { name: t.linkLabel }) as HTMLInputElement
	expect(field.getAttribute("inputmode")).toBe("url")
	const go = screen.getByRole("button", { name: t.restoreButton }) as HTMLButtonElement

	await fireEvent.input(field, { target: { value: "nodot" } })
	expect(go.disabled).toBe(true)
	await fireEvent.keyDown(field, { key: "Enter" })
	expect(fetcher).not.toHaveBeenCalled()

	await fireEvent.input(field, { target: { value: "pastefox.com/206br1" } })
	expect(go.disabled).toBe(false)
	await fireEvent.keyDown(field, { key: "Enter" })
	expect(fetcher).toHaveBeenCalledWith("https://pastefox.com/api/pastes/206br1/raw")
	expect(await screen.findByText(`${t.found(1, 1, 0)} ${t.foundIn("206br1")}`)).toBeTruthy()
})

test("the link step names the two sites, as links opening in a new tab", async () => {
	open()
	await press(t.fromLink)
	const gist = screen.getByRole("link", { name: t.gist }) as HTMLAnchorElement
	const fox = screen.getByRole("link", { name: t.pastefox }) as HTMLAnchorElement
	expect(gist.href).toBe("https://gist.github.com/")
	expect(fox.href).toBe("https://pastefox.com/create")
	expect(gist.target).toBe("_blank")
	expect(fox.target).toBe("_blank")
})

test("a link whose fetch throws stays on the link step with the address kept", async () => {
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("cors")))
	open()
	await press(t.fromLink)
	const field = screen.getByRole("textbox", { name: t.linkLabel }) as HTMLInputElement
	await fireEvent.input(field, { target: { value: "https://example.com/b.json" } })
	await press(t.restoreButton)
	expect(await screen.findByText(t.link.unreachable)).toBeTruthy()
	expect((screen.getByRole("textbox", { name: t.linkLabel }) as HTMLInputElement).value).toBe(
		"https://example.com/b.json",
	)
	expect(readSaved(window.localStorage)).toEqual([])
})

test("a gist that is not there is worded for the site", async () => {
	vi.stubGlobal("fetch", () => Promise.resolve(new Response("", { status: 404 })))
	open()
	await press(t.fromLink)
	await fireEvent.input(screen.getByRole("textbox", { name: t.linkLabel }), {
		target: { value: "https://gist.github.com/kamontat/abc123" },
	})
	await press(t.restoreButton)
	expect(await screen.findByText(t.link.platform.missing("GitHub Gist"))).toBeTruthy()
})

test("an error status elsewhere names it", async () => {
	vi.stubGlobal("fetch", () => Promise.resolve(new Response("", { status: 500 })))
	open()
	await press(t.fromLink)
	await fireEvent.input(screen.getByRole("textbox", { name: t.linkLabel }), {
		target: { value: "https://example.com/b.json" },
	})
	await press(t.restoreButton)
	expect(await screen.findByText(t.link.status(500))).toBeTruthy()
})

test("text from a link that is no backup says so, on the link step", async () => {
	vi.stubGlobal("fetch", () => Promise.resolve(new Response("<html>hi</html>")))
	open()
	await press(t.fromLink)
	await fireEvent.input(screen.getByRole("textbox", { name: t.linkLabel }), {
		target: { value: "pastefox.com/206br1" },
	})
	await press(t.restoreButton)
	expect(await screen.findByText(t.link.platform.notBackup("PasteFox"))).toBeTruthy()
	expect(screen.getByRole("textbox", { name: t.linkLabel })).toBeTruthy()
})

test("Back returns to the start", async () => {
	open()
	await press(t.fromLink)
	await press(t.back)
	expect(screen.getByRole("button", { name: t.fromLink })).toBeTruthy()
	await press(t.byHand)
	await press(t.back)
	expect(screen.getByRole("button", { name: t.byHand })).toBeTruthy()
})

test("a browser that refuses to store says so and keeps the preview", async () => {
	const refusing = {
		getItem: () => null,
		setItem: () => {
			throw new Error("full")
		},
		removeItem: () => {},
		clear: () => {},
		key: () => null,
		length: 0,
	} as unknown as Storage
	clipboardWith(json(a))
	open(refusing)
	await press(t.fromClipboard)
	await screen.findByText(t.found(1, 1, 0))
	await press(t.restoreButton)
	expect(await screen.findByText(t.notStored)).toBeTruthy()
	await waitFor(() => expect(onrestored).not.toHaveBeenCalled())
})
