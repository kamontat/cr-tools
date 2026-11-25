import { cleanup, fireEvent, render, screen } from "@testing-library/svelte"
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

const field = (m = en) =>
	screen.getByRole("textbox", { name: m.settings.data.deletePrompt(m.settings.data.deleteWord) })
const button = (m = en) => screen.getByRole("button", { name: m.settings.data.deleteButton }) as HTMLButtonElement

test("says it cannot be undone and starts disabled", () => {
	open()
	expect(screen.getByText(en.settings.data.deleteWarning(2))).toBeTruthy()
	expect(button().disabled).toBe(true)
})

for (const typed of ["delete", "Delete", " delete ", "DELETE"]) {
	test(`English: "${typed}" enables the button`, async () => {
		open()
		await fireEvent.input(field(), { target: { value: typed } })
		expect(button().disabled).toBe(false)
	})
}

for (const typed of ["delet", "deletee", "ลบ", ""]) {
	test(`English: "${typed}" does not`, async () => {
		open()
		await fireEvent.input(field(), { target: { value: typed } })
		expect(button().disabled).toBe(true)
	})
}

test("Thai: ลบ enables, with spaces too; delete does not", async () => {
	open(th)
	await fireEvent.input(field(th), { target: { value: "delete" } })
	expect(button(th).disabled).toBe(true)
	await fireEvent.input(field(th), { target: { value: " ลบ " } })
	expect(button(th).disabled).toBe(false)
})

test("pressing clears the saved codes, says so and tells the page", async () => {
	const ondeleted = open()
	await fireEvent.input(field(), { target: { value: "delete" } })
	await fireEvent.click(button())
	expect(readSaved(window.localStorage)).toEqual([])
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
	await fireEvent.input(field(), { target: { value: "delete" } })
	await fireEvent.click(button())
	expect(await screen.findByText(en.settings.data.notStored)).toBeTruthy()
	expect(ondeleted).not.toHaveBeenCalled()
	expect(readSaved(window.localStorage)).toHaveLength(2)
})

test("with nothing saved it says so and offers nothing", () => {
	open(en, window.localStorage, 0)
	expect(screen.getByText(en.settings.data.nothingSaved)).toBeTruthy()
	expect(screen.queryByRole("button")).toBeNull()
	expect(screen.queryByRole("textbox")).toBeNull()
})
