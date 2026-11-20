import type { Window as HappyWindow } from "happy-dom"
import type { Draft } from "#lib/combi/draft"
import type { SavedCode } from "#lib/combi/saved"

import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import CombiEditor from "#components/organisms/CombiEditor.svelte"
import { codeOf, newDraft, setEpisode, setMode, setNote } from "#lib/combi/draft"
import { EPISODE_LABELS } from "#lib/combi/labels"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"
import { applyLang } from "#lib/lang"

const viewport = (width: number) => (window as unknown as HappyWindow).happyDOM.setViewport({ width, height: 800 })

beforeEach(() => {
	viewport(1200)
	window.localStorage.clear()
	document.documentElement.lang = "en"
})

afterEach(() => {
	cleanup()
	document.documentElement.style.overflow = ""
	document.documentElement.lang = ""
	document.body.innerHTML = ""
})

type Handlers = {
	oncopy: () => void
	onshare: () => void
	onsave: () => void
	onupdate: () => void
	onsaveasnew: () => void
	ondelete: () => void
	onreset: () => void
	ontypecode: (code: string) => void
	onclose: () => void
}

/** Renders the editor holding its own draft, the way the page does. */
function setup(draft: Draft = newDraft(), saved: SavedCode | null = null) {
	const handlers: Handlers = {
		oncopy: vi.fn(),
		onshare: vi.fn(),
		onsave: vi.fn(),
		onupdate: vi.fn(),
		onsaveasnew: vi.fn(),
		ondelete: vi.fn(),
		onreset: vi.fn(),
		ontypecode: vi.fn(),
		onclose: vi.fn(),
	}
	let held = draft
	const onchange = vi.fn((next: Draft) => {
		held = next
		void result.rerender({ draft: next })
	})
	const result = render(CombiEditor, {
		props: { draft, saved, open: true, docked: false, onchange, ...handlers },
	})
	return { ...result, ...handlers, onchange, current: () => held }
}

const tab = (name: string) => screen.getByRole("tab", { name: new RegExp(`^${name}`) })

test("the five tabs and their panels are present", () => {
	setup()
	const t = en.combi.editor.tabs
	for (const name of [t.main, t.cookies, t.treasures, t.boosts, t.runLog]) expect(tab(name)).toBeTruthy()
	expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(5)
	expect(screen.getByRole("tabpanel", { name: t.main })).toBeTruthy()
})

test("picking Special Episode 1 disables Boosts and shows its note", async () => {
	setup()
	await fireEvent.click(screen.getByRole("button", { name: EPISODE_LABELS.special1 }))
	expect((tab(en.combi.editor.tabs.boosts) as HTMLButtonElement).disabled).toBe(true)
	expect(screen.getByText(en.combi.editor.takesNoBoosts(EPISODE_LABELS.special1), { exact: false })).toBeTruthy()
})

test("the help toggle shows the mode's help", async () => {
	setup()
	const [group] = screen.getAllByRole("group", { name: en.combi.describe.fields.mode }) as [HTMLElement]
	const toggle = within(group).getByRole("button", { name: en.combi.editor.help })
	const help = screen.getByText(en.combi.help.mode)
	expect(help.hidden).toBe(true)
	await fireEvent.click(toggle)
	expect(help.hidden).toBe(false)
})

test("jumping from the code display to the episode selects Main", async () => {
	setup()
	await fireEvent.click(tab(en.combi.editor.tabs.runLog))
	expect(tab(en.combi.editor.tabs.runLog).getAttribute("aria-selected")).toBe("true")
	await fireEvent.click(screen.getByRole("button", { name: new RegExp(en.combi.hints.slot4Episode) }))
	expect(tab(en.combi.editor.tabs.main).getAttribute("aria-selected")).toBe("true")
	await vi.waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toBe(en.combi.describe.anyEpisode))
})

test("the selected tab is remembered", async () => {
	setup()
	await fireEvent.click(tab(en.combi.editor.tabs.boosts))
	expect(window.localStorage.getItem("combi-name:tab")).toBe("boosts")
})

test("choosing a relay on an auto run shows the semi-auto verdict", async () => {
	setup(setMode(newDraft(), "auto"))
	expect(screen.getByText(en.combi.editor.verdictAuto)).toBeTruthy()
	await fireEvent.click(tab(en.combi.editor.tabs.cookies))
	const [relay] = screen.getAllByRole("group", { name: en.combi.describe.fields.relay }) as [HTMLElement]
	const options = within(relay).getAllByRole("button", { pressed: false })
	// The first option after the search is Any; the one after it a real cookie.
	await fireEvent.click(options.find((b) => b.getAttribute("aria-label") !== en.combi.editor.anyCookie) as HTMLElement)
	await fireEvent.click(tab(en.combi.editor.tabs.main))
	expect(screen.getByText(en.combi.editor.verdictSemi(en.combi.describe.relayCookie))).toBeTruthy()
	expect(screen.getByRole("button", { name: en.combi.modes.semiauto })).toBeTruthy()
})

test("Save shows for a new draft, and Update only when an entry is dirty", async () => {
	setup()
	expect(screen.getByRole("button", { name: en.combi.editor.save })).toBeTruthy()
	expect(screen.queryByRole("button", { name: en.combi.editor.update })).toBeNull()
	cleanup()

	const draft = { ...newDraft(), from: codeOf(newDraft()) }
	const saved: SavedCode = { code: codeOf(draft), description: "", savedAt: 0 }
	const { rerender } = setup(draft, saved)
	expect(screen.queryByRole("button", { name: en.combi.editor.save })).toBeNull()
	expect(screen.queryByRole("button", { name: en.combi.editor.update })).toBeNull()
	await rerender({ draft: setNote(draft, "changed") })
	expect(screen.getByRole("button", { name: en.combi.editor.update })).toBeTruthy()
})

test("Ctrl+Enter saves a new draft", async () => {
	const { onsave } = setup()
	await fireEvent.keyDown(screen.getByRole("button", { name: en.combi.modes.manual }), { key: "Enter", ctrlKey: true })
	expect(onsave).toHaveBeenCalled()
})

test("the menu offers Save as new and Delete only while editing", async () => {
	setup()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.editor.more }))
	expect(screen.queryByRole("menuitem", { name: en.combi.editor.delete })).toBeNull()
	cleanup()

	const draft = { ...newDraft(), from: codeOf(newDraft()) }
	const saved: SavedCode = { code: codeOf(draft), description: "", savedAt: 0 }
	const { ondelete, rerender } = setup(draft, saved)
	await fireEvent.click(screen.getByRole("button", { name: en.combi.editor.more }))
	expect(screen.queryByRole("menuitem", { name: en.combi.editor.saveAsNew })).toBeNull()
	await rerender({ draft: setEpisode(draft, "episode3") })
	expect(screen.getByRole("menuitem", { name: en.combi.editor.saveAsNew })).toBeTruthy()
	await fireEvent.click(screen.getByRole("menuitem", { name: en.combi.editor.delete }))
	expect(ondelete).toHaveBeenCalled()
})

test("⋯ → Type a code with a valid code calls ontypecode", async () => {
	const { ontypecode } = setup()
	await fireEvent.click(screen.getByRole("button", { name: en.combi.editor.more }))
	await fireEvent.click(screen.getByRole("menuitem", { name: en.combi.editor.typeCode }))
	const input = screen.getByRole("textbox", { name: en.combi.editor.code }) as HTMLInputElement
	expect(screen.getByText(en.combi.editor.typeHint)).toBeTruthy()
	await fireEvent.input(input, { target: { value: "10s" } })
	expect(input.value).toBe("10S")
	expect(screen.getByText(en.combi.editor.typeCount(3, 10))).toBeTruthy()
	const code = codeOf(setEpisode(newDraft(), "episode3"))
	await fireEvent.input(input, { target: { value: code.toLowerCase() } })
	expect(ontypecode).toHaveBeenCalledWith(code)
})

test("an unreadable stat is marked invalid with its issue", async () => {
	setup()
	await fireEvent.click(tab(en.combi.editor.tabs.runLog))
	const money = screen.getByRole("textbox", { name: en.combi.editor.statLabels.money })
	await fireEvent.input(money, { target: { value: "lots" } })
	expect(money.getAttribute("aria-invalid")).toBe("true")
	expect(screen.getByText(en.combi.issues.statFormat("money"))).toBeTruthy()
})

test("Thai is the default, and switching to English changes the labels", async () => {
	document.documentElement.lang = ""
	setup()
	expect(tab(th.combi.editor.tabs.main)).toBeTruthy()
	expect(screen.getByRole("button", { name: th.combi.editor.save })).toBeTruthy()
	applyLang("en", document)
	await Promise.resolve()
	expect(await screen.findByRole("button", { name: en.combi.editor.save })).toBeTruthy()
	expect(tab(en.combi.editor.tabs.main)).toBeTruthy()
})
