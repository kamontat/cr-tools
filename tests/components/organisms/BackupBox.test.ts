import type { SavedCode } from "#lib/combi/saved"

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import BackupBox from "#components/organisms/BackupBox.svelte"
import { backupFileName, writeBackup } from "#lib/backup"
import { exportCodes } from "#lib/combi/backup"
import { en } from "#lib/i18n/en"

const download = vi.hoisted(() => ({ downloadText: vi.fn(() => true) }))
vi.mock("#lib/download", () => download)

const entries: SavedCode[] = [
	{ code: "1-MS0A000000", description: "Money farm", savedAt: 1764000000000, rounds: [{ money: 12000 }] },
	{ code: "1-AM0A000000", description: "", savedAt: 1764000001000 },
]
const now = new Date(2026, 10, 25, 8, 0, 0)

const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")
const setClipboard = (value: unknown) =>
	Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true })

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(now)
	download.downloadText.mockReset()
	download.downloadText.mockReturnValue(true)
	document.documentElement.lang = "en"
})

afterEach(() => {
	cleanup()
	vi.useRealTimers()
	document.documentElement.lang = ""
	document.body.innerHTML = ""
	if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard)
	else setClipboard(undefined)
})

const open = (list: SavedCode[] = entries) => render(BackupBox, { props: { entries: list, m: en } })
const expected = () => writeBackup({ "combi-codes": exportCodes(entries) }, now)

test("the download row shows the file name and saves the backup under it", async () => {
	open()
	expect(screen.getByText(en.settings.data.fileName(backupFileName(now)))).toBeTruthy()
	await fireEvent.click(screen.getByRole("button", { name: en.settings.data.download }))
	expect(download.downloadText).toHaveBeenCalledWith(backupFileName(now), expected())
})

test("a download the browser refuses says so and points to As text", async () => {
	download.downloadText.mockReturnValue(false)
	open()
	await fireEvent.click(screen.getByRole("button", { name: en.settings.data.download }))
	expect(await screen.findByText(en.settings.data.downloadFailed)).toBeTruthy()
})

test("As text shows the same JSON in a read-only box, and Copy copies it", async () => {
	const writeText = vi.fn(() => Promise.resolve())
	setClipboard({ writeText })
	open()
	expect(screen.queryByRole("textbox")).toBeNull()
	await fireEvent.click(screen.getByRole("button", { name: en.settings.data.asText }))
	const box = screen.getByRole("textbox") as HTMLTextAreaElement
	expect(box.readOnly).toBe(true)
	expect(box.value).toBe(expected())
	await fireEvent.click(screen.getByRole("button", { name: en.settings.data.copy }))
	expect(writeText).toHaveBeenCalledWith(expected())
	expect(await screen.findByText(en.settings.data.copied)).toBeTruthy()
})

test("a clipboard that refuses says so", async () => {
	setClipboard(undefined)
	open()
	await fireEvent.click(screen.getByRole("button", { name: en.settings.data.asText }))
	await fireEvent.click(screen.getByRole("button", { name: en.settings.data.copy }))
	expect(await screen.findByText(en.settings.data.copyFailed)).toBeTruthy()
})

test("with nothing saved there is a line and neither action", () => {
	open([])
	expect(screen.getByText(en.settings.data.nothingSaved)).toBeTruthy()
	expect(screen.queryByRole("button", { name: en.settings.data.download })).toBeNull()
	expect(screen.queryByRole("button", { name: en.settings.data.asText })).toBeNull()
})
