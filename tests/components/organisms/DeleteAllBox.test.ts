import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/svelte"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import DeleteAllBox from "#components/organisms/DeleteAllBox.svelte"
import { readSaved, SAVED_KEY } from "#lib/combi/saved"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"

const entries = [
	{ code: "1-MS0A000000", description: "", savedAt: 1 },
	{ code: "1-AM0A000000", description: "", savedAt: 2 },
]

beforeEach(() => {
	window.localStorage.clear()
	window.localStorage.setItem(SAVED_KEY, JSON.stringify(entries))
})

afterEach(() => {
	cleanup()
	document.body.innerHTML = ""
})

const open = (m = en, store: Storage = window.localStorage, count = 2) => {
	const ondeleted = vi.fn()
	render(DeleteAllBox, { props: { store, count, m, ondeleted } })
	return ondeleted
}

/** The button in the row, which asks first. */
const ask = (m = en) => screen.getByRole("button", { name: m.settings.data.deleteButton })
const dialog = (m = en, n = 2) => screen.getByRole("dialog", { name: m.settings.data.deleteTitle(n) })
const confirm = (m = en) => within(dialog(m)).getByRole("button", { name: m.settings.data.deleteButton })

test("says it cannot be undone and deletes nothing until confirmed", async () => {
	const ondeleted = open()
	expect(screen.getByText(en.settings.data.deleteWarning(2))).toBeTruthy()
	expect(screen.queryByRole("dialog")).toBeNull()
	await fireEvent.click(ask())
	expect(dialog()).toBeTruthy()
	expect(readSaved(window.localStorage)).toHaveLength(2)
	expect(ondeleted).not.toHaveBeenCalled()
})

test("the confirm dialog is the danger kind, in the page's language", async () => {
	open(th)
	await fireEvent.click(ask(th))
	expect(dialog(th).getAttribute("data-layout")).toBe("dialog")
	expect(dialog(th).classList.contains("danger")).toBe(true)
	expect(within(dialog(th)).getByText(th.settings.data.deleteWarning(2))).toBeTruthy()
})

test("Cancel closes the dialog and keeps the codes", async () => {
	const ondeleted = open()
	await fireEvent.click(ask())
	await fireEvent.click(within(dialog()).getByRole("button", { name: en.frame.cancel }))
	expect(screen.queryByRole("dialog")).toBeNull()
	expect(readSaved(window.localStorage)).toHaveLength(2)
	expect(ondeleted).not.toHaveBeenCalled()
})

test("Escape closes the dialog and keeps the codes", async () => {
	open()
	await fireEvent.click(ask())
	await fireEvent.keyDown(dialog(), { key: "Escape" })
	expect(screen.queryByRole("dialog")).toBeNull()
	expect(readSaved(window.localStorage)).toHaveLength(2)
})

test("the dialog starts on Cancel, so Enter does not delete", async () => {
	open()
	await fireEvent.click(ask())
	await waitFor(() =>
		expect(document.activeElement).toBe(within(dialog()).getByRole("button", { name: en.frame.cancel })),
	)
})

test("confirming clears the saved codes, closes the dialog, says so and tells the page", async () => {
	const ondeleted = open()
	await fireEvent.click(ask())
	await fireEvent.click(confirm())
	expect(readSaved(window.localStorage)).toEqual([])
	expect(screen.queryByRole("dialog")).toBeNull()
	expect(await screen.findByText(en.settings.data.deleted(2))).toBeTruthy()
	expect(ondeleted).toHaveBeenCalledTimes(1)
})

test("a browser that refuses keeps the entries and says so", async () => {
	const refusing = {
		getItem: () => JSON.stringify(entries),
		setItem: () => {
			throw new Error("full")
		},
	} as unknown as Storage
	const ondeleted = open(en, refusing)
	await fireEvent.click(ask())
	await fireEvent.click(confirm())
	expect(await screen.findByText(en.settings.data.notStored)).toBeTruthy()
	expect(ondeleted).not.toHaveBeenCalled()
	expect(readSaved(window.localStorage)).toHaveLength(2)
})

test("with nothing saved it says so and offers nothing", () => {
	open(en, window.localStorage, 0)
	expect(screen.getByText(en.settings.data.nothingSaved)).toBeTruthy()
	expect(screen.queryByRole("button")).toBeNull()
})

test("the Deleted notice goes when codes are saved again", async () => {
	const ondeleted = vi.fn()
	const { rerender } = render(DeleteAllBox, { props: { store: window.localStorage, count: 2, m: en, ondeleted } })
	await fireEvent.click(ask())
	await fireEvent.click(confirm())
	await rerender({ store: window.localStorage, count: 0, m: en, ondeleted })
	expect(screen.getByText(en.settings.data.deleted(2))).toBeTruthy()
	await rerender({ store: window.localStorage, count: 3, m: en, ondeleted })
	expect(screen.queryByText(en.settings.data.deleted(2))).toBeNull()
})
