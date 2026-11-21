import type { Window as HappyWindow } from "happy-dom"
import type { Combi } from "#lib/combi/codec"
import type { SavedCode } from "#lib/combi/saved"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import CombiApp from "#components/organisms/CombiApp.svelte"
import { combiSectionOf, encodeFull } from "#lib/combi/full-code"
import { emptyLoadout, type Loadout } from "#lib/combi/loadout"
import { readSaved, SAVED_KEY } from "#lib/combi/saved"
import { shareHashFor } from "#lib/combi/state"
import { en } from "#lib/i18n/en"

const viewport = (width: number) => (window as unknown as HappyWindow).happyDOM.setViewport({ width, height: 800 })

const combi: Combi = {
	goals: ["score"],
	mode: "manual",
	episode: "any",
	floor: null,
	boosts: [],
	randomBoost: null,
	cookiePowers: [],
	action: "none",
}

const full = (loadout: Partial<Loadout> = {}, over: Partial<Combi> = {}) =>
	encodeFull({ loadout: { ...emptyLoadout(), ...loadout }, combi: { ...combi, ...over } })

const scoreCode = full({ cookie: "01" })
const moneyCode = full({ cookie: "06" }, { goals: ["money"] })
/** A code nobody saved, for links and pastes. */
const linkCode = full({}, { goals: ["money"], mode: "auto", episode: "episode3" })

const seeded: SavedCode[] = [
	{ code: scoreCode, description: "Score farm", savedAt: 2 },
	{ code: moneyCode, description: "", stats: { money: { min: 12000, max: 15000 } }, savedAt: 1 },
]

const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")
const setClipboard = (value: unknown) =>
	Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true })

const seed = (entries: unknown[]) => window.localStorage.setItem(SAVED_KEY, JSON.stringify(entries))
const stored = () => readSaved(window.localStorage)

beforeEach(() => {
	viewport(1200)
	window.localStorage.clear()
	seed(seeded)
	document.documentElement.lang = "en"
	history.replaceState(null, "", "/combi-name/")
})

afterEach(() => {
	cleanup()
	document.documentElement.style.overflow = ""
	document.documentElement.lang = ""
	document.body.innerHTML = ""
	if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard)
	else setClipboard(undefined)
	vi.restoreAllMocks()
})

const rows = () => screen.getAllByRole("listitem").filter((item) => item.matches("li.entry"))
/** The saved entry's row, opened so its actions show. */
const expandRow = async (code: string) => {
	const row = rows().find((item) => item.textContent?.includes(combiSectionOf(code))) as HTMLElement
	const toggle = row.querySelector("button[aria-expanded]") as HTMLButtonElement
	if (toggle.getAttribute("aria-expanded") !== "true") await fireEvent.click(toggle)
	return row
}
/** Opens a saved entry in the editor through its row's Edit. */
const openEntry = async (code: string) => {
	await expandRow(code)
	await fireEvent.click(button(en.combi.list.editCode(combiSectionOf(code))))
}
const editor = () => screen.queryByRole("dialog")
const notice = () => document.querySelector('[role="status"] button, [role="alert"] button')?.textContent ?? ""
const button = (name: string) => screen.getByRole("button", { name })
const tab = (name: string) => screen.getByRole("tab", { name: new RegExp(`^${name}`) })

test("the list shows every saved code", () => {
	render(CombiApp)
	expect(rows()).toHaveLength(2)
	expect(rows()[0]?.textContent).toContain(combiSectionOf(scoreCode))
	expect(rows()[1]?.textContent).toContain(combiSectionOf(moneyCode))
})

test("New code opens the editor, and the address bar follows its code", async () => {
	render(CombiApp)
	expect(editor()).toBeNull()
	await fireEvent.click(button(en.combi.list.newCode))
	expect(editor()).not.toBeNull()
	expect(location.hash).toMatch(/^#1-/)
	await fireEvent.click(button(en.frame.close))
	expect(editor()).toBeNull()
	expect(location.hash).toBe("")
})

test("Save adds a third entry, and Copy copies the 10 characters", async () => {
	const writeText = vi.fn(() => Promise.resolve())
	setClipboard({ writeText })
	render(CombiApp)
	await fireEvent.click(button(en.combi.list.newCode))
	await fireEvent.click(button(en.combi.editor.save))
	expect(stored()).toHaveLength(3)
	expect(rows()).toHaveLength(3)
	const code = stored()[0]?.code ?? ""
	expect(notice()).toBe(en.combi.notices.saved(combiSectionOf(code)))

	await fireEvent.click(button(en.combi.editor.copy))
	expect(writeText).toHaveBeenCalledWith(combiSectionOf(code))
	expect(combiSectionOf(code)).toHaveLength(10)
	await waitFor(() => expect(notice()).toBe(en.combi.notices.copied(combiSectionOf(code))))
})

test("a notice shown over the pop-up editor is inside it, so it is seen and heard", async () => {
	viewport(1000)
	render(CombiApp)
	await fireEvent.click(button(en.combi.list.newCode))
	await fireEvent.click(button(en.combi.editor.save))
	await Promise.resolve()
	const shown = screen.getByRole("button", { name: en.combi.notices.saved(combiSectionOf(stored()[0]?.code ?? "")) })
	expect(editor()?.contains(shown)).toBe(true)
})

test("a row's Copy copies that row's 10 characters", async () => {
	const writeText = vi.fn(() => Promise.resolve())
	setClipboard({ writeText })
	render(CombiApp)
	await expandRow(moneyCode)
	await fireEvent.click(button(en.combi.list.copyCode(combiSectionOf(moneyCode))))
	expect(writeText).toHaveBeenCalledWith(combiSectionOf(moneyCode))
	expect(editor()).toBeNull()
})

test("an old share link opens with its note and money, and Save keeps them once", async () => {
	history.replaceState(
		null,
		"",
		`/combi-name/${shareHashFor(combiSectionOf(linkCode), "Farm run", {})}&money=12000-15000`,
	)
	render(CombiApp)
	expect(editor()).not.toBeNull()
	expect(notice()).toBe(en.combi.notices.linkBoth)

	await fireEvent.click(tab(en.combi.editor.tabs.runLog))
	expect((screen.getByRole("textbox", { name: en.combi.editor.note }) as HTMLTextAreaElement).value).toBe("Farm run")
	expect((screen.getByRole("textbox", { name: en.combi.editor.statLabels.money }) as HTMLInputElement).value).toBe(
		"12000-15000",
	)

	await fireEvent.click(button(en.combi.editor.save))
	// Saved, the entry is open: Save gives way to Update, so a second press cannot add it twice.
	expect(screen.queryByRole("button", { name: en.combi.editor.save })).toBeNull()
	const saved = stored().filter((entry) => entry.code === linkCode)
	expect(saved).toHaveLength(1)
	expect(saved[0]?.description).toBe("Farm run")
	expect(saved[0]?.stats).toEqual({ money: { min: 12000, max: 15000 } })

	// The same link again opens the saved entry rather than a second copy.
	await fireEvent.click(button(en.frame.close))
	history.replaceState(null, "", `/combi-name/${shareHashFor(linkCode, "Farm run", {})}`)
	window.dispatchEvent(new HashChangeEvent("hashchange"))
	await waitFor(() => expect(notice()).toBe(en.combi.notices.linkSaved("Farm run")))
	expect(screen.queryByRole("button", { name: en.combi.editor.save })).toBeNull()
	expect(stored().filter((entry) => entry.code === linkCode)).toHaveLength(1)
})

test("an unreadable saved entry lists, and opening it notices instead of throwing", async () => {
	seed([...seeded, { code: "1-ZZZZZZZZZZ", description: "Old", savedAt: 0 }])
	render(CombiApp)
	expect(rows()).toHaveLength(3)
	await openEntry("1-ZZZZZZZZZZ")
	expect(editor()).toBeNull()
	expect(notice()).toMatch(/^ZZZZZZZZZZ no longer reads: /)
})

test("a clipboard refusal notices with the code and does not throw", async () => {
	setClipboard({ writeText: vi.fn(() => Promise.reject(new Error("denied"))) })
	render(CombiApp)
	await expandRow(scoreCode)
	await fireEvent.click(button(en.combi.list.copyCode(combiSectionOf(scoreCode))))
	await waitFor(() => expect(notice()).toBe(en.combi.notices.copyBlocked(combiSectionOf(scoreCode))))
	expect(document.querySelector('[role="alert"] button')).not.toBeNull()
})

const paste = (text: string) => {
	const event = new Event("paste", { bubbles: true, cancelable: true })
	Object.defineProperty(event, "clipboardData", { value: { getData: () => text } })
	document.body.dispatchEvent(event)
}

test("pasting a code anywhere opens it", async () => {
	render(CombiApp)
	paste(`  ${combiSectionOf(linkCode).toLowerCase()} `)
	await waitFor(() => expect(editor()).not.toBeNull())
	expect(location.hash).toBe(`#${linkCode}`)
	expect(notice()).toBe(en.combi.notices.pasted)
})

test("an unreadable paste, or one into a text box, is ignored", async () => {
	render(CombiApp)
	paste("hello there")
	const search = screen.getByRole("searchbox")
	search.focus()
	paste(linkCode)
	await Promise.resolve()
	expect(editor()).toBeNull()
	expect(notice()).toBe("")
})

test("Update rewrites the open entry, and Delete removes it and closes the editor", async () => {
	render(CombiApp)
	await openEntry(scoreCode)
	await fireEvent.click(tab(en.combi.editor.tabs.runLog))
	await fireEvent.input(screen.getByRole("textbox", { name: en.combi.editor.note }), {
		target: { value: "Score farm v2" },
	})
	await fireEvent.click(button(en.combi.editor.update))
	expect(stored().find((entry) => entry.code === scoreCode)?.description).toBe("Score farm v2")
	expect(notice()).toBe(en.combi.notices.updated("Score farm v2"))

	await fireEvent.click(button(en.combi.editor.more))
	await fireEvent.click(screen.getByRole("menuitem", { name: en.combi.editor.delete }))
	expect(stored().map((entry) => entry.code)).toEqual([moneyCode])
	expect(editor()).toBeNull()
	expect(notice()).toBe(en.combi.notices.deleted(combiSectionOf(scoreCode)))
})

test("at 1440px the editor docks beside the list; at 1000px it pops up", async () => {
	viewport(1440)
	const { unmount } = render(CombiApp)
	await fireEvent.click(button(en.combi.list.newCode))
	expect(editor()).toBeNull()
	expect(document.querySelector('[data-layout="docked"]')).not.toBeNull()
	unmount()

	viewport(1000)
	render(CombiApp)
	await fireEvent.click(button(en.combi.list.newCode))
	expect(editor()).not.toBeNull()
	expect(document.querySelector('[data-layout="docked"]')).toBeNull()
})

const noteBox = () => screen.getByRole("textbox", { name: en.combi.editor.note }) as HTMLTextAreaElement

const editNote = async (value: string) => {
	await fireEvent.click(tab(en.combi.editor.tabs.runLog))
	await fireEvent.input(noteBox(), { target: { value } })
}

test("a bare-code link to a saved entry opens it without a notice", () => {
	history.replaceState(null, "", `/combi-name/#${scoreCode}`)
	render(CombiApp)
	expect(editor()).not.toBeNull()
	expect(screen.queryByRole("button", { name: en.combi.editor.save })).toBeNull()
	expect(notice()).toBe("")
})

test("a link's note stays in the address bar until Save", async () => {
	history.replaceState(null, "", `/combi-name/${shareHashFor(linkCode, "Farm run", {})}`)
	render(CombiApp)
	await waitFor(() => expect(editor()).not.toBeNull())
	expect(location.hash).toMatch(/[?&]note=/)
	await fireEvent.click(button(en.combi.editor.save))
	expect(location.hash).toBe(`#${linkCode}`)
})

test("an edit drops the link's note from the address bar", async () => {
	history.replaceState(null, "", `/combi-name/${shareHashFor(linkCode, "Farm run", {})}`)
	render(CombiApp)
	await editNote("Mine")
	expect(location.hash).toBe(`#${linkCode}`)
})

test("the editor's own address-bar writes do not re-open or re-notice", async () => {
	history.replaceState(null, "", `/combi-name/${shareHashFor(linkCode, "Farm run", {})}`)
	render(CombiApp)
	dismissNotice()
	window.dispatchEvent(new HashChangeEvent("hashchange"))
	await editNote("Edited")
	window.dispatchEvent(new HashChangeEvent("hashchange"))
	await Promise.resolve()
	expect(noteBox().value).toBe("Edited")
	expect(notice()).toBe("")
})

const dismissNotice = () => {
	const shown = document.querySelector<HTMLButtonElement>('[role="status"] button, [role="alert"] button')
	shown?.click()
}

test("a paste over unsaved edits in the docked editor is refused, and the edits stay", async () => {
	viewport(1440)
	render(CombiApp)
	await openEntry(scoreCode)
	await editNote("Edited")
	;(document.activeElement as HTMLElement | null)?.blur()
	paste(linkCode)
	await waitFor(() => expect(notice()).toBe(en.combi.notices.unsavedEdits))
	expect(noteBox().value).toBe("Edited")
	expect(location.hash).toBe(`#${scoreCode}`)
})

test("a paste over an unedited docked editor opens the pasted code", async () => {
	viewport(1440)
	render(CombiApp)
	await fireEvent.click(button(en.combi.list.newCode))
	paste(linkCode)
	await waitFor(() => expect(location.hash).toBe(`#${linkCode}`))
	expect(notice()).toBe(en.combi.notices.pasted)
})

test("a paste of a saved code says it opened that entry", async () => {
	render(CombiApp)
	paste(scoreCode)
	await waitFor(() => expect(editor()).not.toBeNull())
	expect(notice()).toBe(en.combi.notices.pastedSaved("Score farm"))
	expect(screen.queryByRole("button", { name: en.combi.editor.save })).toBeNull()
})

test("typing a note does not rewrite the address bar while the code stays the same", async () => {
	render(CombiApp)
	await openEntry(scoreCode)
	const write = vi.spyOn(history, "replaceState")
	await editNote("A")
	await fireEvent.input(noteBox(), { target: { value: "AB" } })
	await fireEvent.input(noteBox(), { target: { value: "ABC" } })
	expect(write).not.toHaveBeenCalled()
	expect(location.hash).toBe(`#${scoreCode}`)
})

test("a browser that refuses to rewrite the address bar does not break the editor", async () => {
	render(CombiApp)
	await fireEvent.click(button(en.combi.list.newCode))
	vi.spyOn(history, "replaceState").mockImplementation(() => {
		throw new DOMException("Attempt to use history.replaceState() more than 100 times per 10 seconds", "SecurityError")
	})
	await fireEvent.click(screen.getByRole("button", { name: en.combi.modes.auto }))
	expect(editor()).not.toBeNull()
})

/** The docked editor open on the score entry, with a note nobody saved. */
const editedDocked = async () => {
	viewport(1440)
	render(CombiApp)
	await openEntry(scoreCode)
	await editNote("Edited")
}

test("opening another row over unsaved edits in the docked editor is refused, and the edits stay", async () => {
	await editedDocked()
	await openEntry(moneyCode)
	expect(notice()).toBe(en.combi.notices.unsavedEdits)
	expect(noteBox().value).toBe("Edited")
	expect(location.hash).toBe(`#${scoreCode}`)
})

test("New code over unsaved edits in the docked editor is refused, and the edits stay", async () => {
	await editedDocked()
	await fireEvent.click(button(en.combi.list.newCode))
	expect(notice()).toBe(en.combi.notices.unsavedEdits)
	expect(noteBox().value).toBe("Edited")
})

test("a new link in the address bar over unsaved edits is refused, and the address bar goes back", async () => {
	await editedDocked()
	history.replaceState(null, "", `/combi-name/#${linkCode}`)
	window.dispatchEvent(new HashChangeEvent("hashchange"))
	await Promise.resolve()
	expect(notice()).toBe(en.combi.notices.unsavedEdits)
	expect(noteBox().value).toBe("Edited")
	expect(location.hash).toBe(`#${scoreCode}`)
})

test("pressing the open entry's own row again keeps its edits, without a word", async () => {
	await editedDocked()
	await openEntry(scoreCode)
	expect(noteBox().value).toBe("Edited")
	expect(notice()).toBe("")
})

test("a row's line opens the editor on that line's tab, and on the open entry switches the tab", async () => {
	viewport(1440)
	render(CombiApp)
	const game = combiSectionOf(scoreCode)
	const selected = () => screen.getByRole("tab", { selected: true }).textContent ?? ""
	await expandRow(scoreCode)
	await fireEvent.click(button(en.combi.list.editSection(en.combi.editor.tabs.boosts, game)))
	expect(location.hash).toBe(`#${scoreCode}`)
	expect(selected()).toContain(en.combi.editor.tabs.boosts)
	await fireEvent.click(button(en.combi.list.editSection(en.combi.editor.tabs.treasures, game)))
	expect(selected()).toContain(en.combi.editor.tabs.treasures)
})

test("with no edits, another row opens straight away", async () => {
	viewport(1440)
	render(CombiApp)
	await openEntry(scoreCode)
	await openEntry(moneyCode)
	expect(location.hash).toBe(`#${moneyCode}`)
	expect(notice()).toBe("")
})

test("closing the docked editor puts focus on New code, not nowhere", async () => {
	viewport(1440)
	render(CombiApp)
	await openEntry(scoreCode)
	button(en.frame.close).focus()
	await fireEvent.click(button(en.frame.close))
	await waitFor(() => expect(document.activeElement).toBe(button(en.combi.list.newCode)))
})

test("Delete puts focus on New code, not nowhere", async () => {
	render(CombiApp)
	await openEntry(scoreCode)
	await fireEvent.click(button(en.combi.editor.more))
	await fireEvent.click(screen.getByRole("menuitem", { name: en.combi.editor.delete }))
	await waitFor(() => expect(document.activeElement).toBe(button(en.combi.list.newCode)))
})

test("a row's Delete, pressed twice, removes the entry and closes an editor open on it", async () => {
	render(CombiApp)
	await openEntry(scoreCode)
	expect(editor()).toBeTruthy()
	const game = combiSectionOf(scoreCode)
	await fireEvent.click(button(en.combi.list.deleteCode(game)))
	await fireEvent.click(button(en.combi.list.confirmDeleteCode(game)))
	expect(rows()).toHaveLength(1)
	expect(rows()[0]?.textContent).toContain(combiSectionOf(moneyCode))
	expect(editor()).toBeNull()
	expect(notice()).toBe(en.combi.notices.deleted(game))
	expect(stored().map((entry) => entry.code)).toEqual([moneyCode])
})
