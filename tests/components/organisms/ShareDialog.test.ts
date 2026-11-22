import { cleanup, fireEvent, render, screen } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import ShareDialog from "#components/organisms/ShareDialog.svelte"
import { shareHashFor } from "#lib/combi/state"
import { en } from "#lib/i18n/en"

const code = "1-MS0A000000"
const entry = { code, note: "Money farm", rounds: [{ money: 12000 }, { money: 15000 }] }

const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")
const share = Object.getOwnPropertyDescriptor(navigator, "share")

const setNavigator = (name: "clipboard" | "share", value: unknown) =>
	Object.defineProperty(navigator, name, { value, configurable: true, writable: true })

beforeEach(() => {
	window.localStorage.clear()
	document.documentElement.lang = "en"
	setNavigator("share", undefined)
})

afterEach(() => {
	cleanup()
	document.documentElement.style.overflow = ""
	document.documentElement.lang = ""
	document.body.innerHTML = ""
	if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard)
	else setNavigator("clipboard", undefined)
	if (share) Object.defineProperty(navigator, "share", share)
	else setNavigator("share", undefined)
	vi.restoreAllMocks()
})

const open = () => {
	const onclose = vi.fn()
	render(ShareDialog, { props: { entry, onclose } })
	return { onclose }
}

test("the link carries the code and its note", () => {
	open()
	const dialog = screen.getByRole("dialog", { name: en.combi.share.title })
	const link = `${location.origin}${location.pathname}${shareHashFor(code, entry.note, entry.rounds)}`
	expect(link).toContain(`#${code}?note=`)
	expect(link).toContain("&round=:12000&round=:15000")
	expect(dialog.textContent).toContain(link)
})

test("the full code shows", () => {
	open()
	expect(screen.getAllByText(code).length).toBeGreaterThan(0)
	expect(screen.getByRole("button", { name: en.combi.share.copyFull(code) })).toBeTruthy()
})

test("nothing renders without an entry", () => {
	render(ShareDialog, { props: { entry: null, onclose: vi.fn() } })
	expect(screen.queryByRole("dialog")).toBeNull()
})

test("Share to app is hidden without navigator.share", () => {
	open()
	expect(screen.queryByRole("button", { name: en.combi.share.shareToApp })).toBeNull()
})

test("Share to app calls navigator.share, and a cancel is ignored", async () => {
	const native = vi.fn(() => Promise.reject(new DOMException("cancelled", "AbortError")))
	setNavigator("share", native)
	open()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.shareToApp }))
	expect(native).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining(`#${code}`) }))
	await Promise.resolve()
})

test("Copy writes the value and says so", async () => {
	const writeText = vi.fn(() => Promise.resolve())
	setNavigator("clipboard", { writeText })
	open()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.copyLink }))
	expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`#${code}?note=`))
	expect(await screen.findByText(en.combi.share.copied)).toBeTruthy()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.copyFull(code) }))
	expect(writeText).toHaveBeenLastCalledWith(code)
})

test("a clipboard refusal shows the error toast, selects the value and does not throw", async () => {
	const writeText = vi.fn(() => Promise.reject(new Error("denied")))
	setNavigator("clipboard", { writeText })
	open()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.copyFull(code) }))
	const alert = await screen.findByText(en.combi.share.copyFailed)
	expect(alert.closest("[role=alert]")).toBeTruthy()
	expect(window.getSelection()?.toString()).toBe(code)
})

test("no clipboard API shows the error toast too", async () => {
	setNavigator("clipboard", undefined)
	open()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.copyFull(code) }))
	expect(await screen.findByText(en.combi.share.copyFailed)).toBeTruthy()
})

test("a notice from one share does not carry over to the next, or to a reopened one", async () => {
	setNavigator("clipboard", { writeText: vi.fn(() => Promise.resolve()) })
	const onclose = vi.fn()
	const { rerender } = render(ShareDialog, { props: { entry, onclose } })
	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.copyFull(code) }))
	expect(await screen.findByText(en.combi.share.copied)).toBeTruthy()

	await rerender({ entry: { code: "1-AM0A000000", note: "", rounds: [] } })
	expect(screen.queryByText(en.combi.share.copied)).toBeNull()

	await fireEvent.click(screen.getByRole("button", { name: en.combi.share.copyLink }))
	expect(await screen.findByText(en.combi.share.copied)).toBeTruthy()
	await rerender({ entry: null })
	await rerender({ entry })
	expect(screen.queryByText(en.combi.share.copied)).toBeNull()
})
