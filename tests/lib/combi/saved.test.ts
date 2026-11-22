import { expect, test } from "vitest"

import {
	cleanDescription,
	clearSaved,
	DESCRIPTION_MAX,
	descriptionTitle,
	formatSaved,
	importSaved,
	LEGACY_SAVED_KEY,
	parseSaved,
	readSaved,
	removeSaved,
	SAVED_KEY,
	saveCode,
	updateSaved,
} from "#lib/combi/saved"
import { shareHashFor } from "#lib/combi/state"
import { englishOf } from "./issue-expect"

/** A storage holding `initial` as the list, under `key`. */
function storage(initial: string | null = null, key = SAVED_KEY): Storage {
	const held = new Map<string, string>(initial === null ? [] : [[key, initial]])
	return {
		getItem: (name: string) => held.get(name) ?? null,
		setItem: (name: string, value: string) => {
			held.set(name, value)
		},
	} as unknown as Storage
}

const REFUSING = {
	getItem() {
		throw new Error("storage is off")
	},
	setItem() {
		throw new Error("storage is off")
	},
} as unknown as Storage

test("a saved code comes back with its description", () => {
	const held = storage()

	saveCode(held, "1-MS0A000000", { description: "  Score run  " }, 1)

	expect(readSaved(held)).toEqual([{ code: "1-MS0A000000", description: "Score run", savedAt: 1 }])
})

test("the newest save leads the list", () => {
	const held = storage()

	saveCode(held, "1-MS0A000000", { description: "first" }, 1)
	saveCode(held, "1-MM0A000000", { description: "second" }, 2)

	expect(readSaved(held).map((entry) => entry.code)).toEqual(["1-MM0A000000", "1-MS0A000000"])
})

test("saving a code again replaces its description and moves it to the top", () => {
	const held = storage()

	saveCode(held, "1-MS0A000000", { description: "old" }, 1)
	saveCode(held, "1-MM0A000000", { description: "other" }, 2)
	const { entries } = saveCode(held, "1-MS0A000000", { description: "new" }, 3)

	expect(entries).toEqual([
		{ code: "1-MS0A000000", description: "new", savedAt: 3 },
		{ code: "1-MM0A000000", description: "other", savedAt: 2 },
	])
	expect(readSaved(held)).toEqual(entries)
})

test("a description longer than the limit is cut to it", () => {
	const { entries } = saveCode(storage(), "1-MS0A000000", {
		description: "x".repeat(500),
	})

	expect(entries[0]?.description).toHaveLength(DESCRIPTION_MAX)
})

test("removing a code takes only that code out", () => {
	const held = storage()
	saveCode(held, "1-MS0A000000", { description: "a" }, 1)
	saveCode(held, "1-MM0A000000", { description: "b" }, 2)

	const { entries } = removeSaved(held, "1-MS0A000000")

	expect(entries.map((entry) => entry.code)).toEqual(["1-MM0A000000"])
	expect(readSaved(held)).toEqual(entries)
})

test("clearing the list takes every code out", () => {
	const held = storage()
	saveCode(held, "1-MS0A000000", { description: "a" }, 1)
	saveCode(held, "1-MM0A000000", { description: "b" }, 2)

	const { entries, stored } = clearSaved(held)

	expect(entries).toEqual([])
	expect(stored).toBe(true)
	expect(readSaved(held)).toEqual([])
	expect(clearSaved(REFUSING).stored).toBe(false)
})

test("a list that is not this file's shape reads as empty or loses the bad rows", () => {
	expect(readSaved(storage("not json"))).toEqual([])
	expect(readSaved(storage('{"code":"1-MS0A000000"}'))).toEqual([])
	expect(
		readSaved(
			storage(
				JSON.stringify([
					{ code: "1-MS0A000000", description: "ok", savedAt: 1 },
					{ code: "", description: "empty", savedAt: 1 },
					{ code: "1-MM0A000000", savedAt: 1 },
					null,
				]),
			),
		),
	).toEqual([{ code: "1-MS0A000000", description: "ok", savedAt: 1 }])
})

test("a browser that refuses storage still answers, and says the save was not kept", () => {
	expect(readSaved(REFUSING)).toEqual([])

	const { entries, stored } = saveCode(REFUSING, "1-MS0A000000", { description: "a" }, 1)

	expect(stored).toBe(false)
	expect(entries).toHaveLength(1)
	expect(removeSaved(REFUSING, "1-MS0A000000").stored).toBe(false)
})

test("the storage key names the page, apart from the last-build key", () => {
	expect(SAVED_KEY).toBe("combi-name:saved:v2")
	expect(LEGACY_SAVED_KEY).toBe("combi-name:saved")
})

test("a description keeps its line breaks, minus the blank edges", () => {
	expect(cleanDescription("\n\n  Coin farm  \r\nuse Fairy   \n\n")).toBe("Coin farm\nuse Fairy")
	expect(cleanDescription("one\n\nthree")).toBe("one\n\nthree")
	expect(cleanDescription("  \n \n ")).toBe("")
})

test("a description's title is its first line", () => {
	expect(descriptionTitle("Coin farm\nuse Fairy")).toBe("Coin farm")
	expect(descriptionTitle("")).toBe("")
})

test("updating an entry's note keeps its code and its place in the list", () => {
	const held = storage()
	saveCode(held, "1-MS0A000000", { description: "a" }, 1)
	saveCode(held, "1-MM0A000000", { description: "b" }, 2)

	const result = updateSaved(held, "1-MS0A000000", { code: "1-MS0A000000", description: " new note " }, 3)

	expect(result.ok).toBe(true)
	expect(readSaved(held)).toEqual([
		{ code: "1-MM0A000000", description: "b", savedAt: 2 },
		{ code: "1-MS0A000000", description: "new note", savedAt: 3 },
	])
})

test("updating an entry's code moves the note onto the new code in place", () => {
	const held = storage()
	saveCode(held, "1-MS0A000000", { description: "a" }, 1)
	saveCode(held, "1-MM0A000000", { description: "b" }, 2)

	updateSaved(held, "1-MS0A000000", { code: "1-MB05000000", description: "a" }, 3)

	expect(readSaved(held).map((entry) => entry.code)).toEqual(["1-MM0A000000", "1-MB05000000"])
})

test("an update onto a code another entry holds is refused, and nothing changes", () => {
	const held = storage()
	saveCode(held, "1-MS0A000000", { description: "a" }, 1)
	saveCode(held, "1-MM0A000000", { description: "b" }, 2)
	const before = readSaved(held)

	const result = updateSaved(held, "1-MS0A000000", {
		code: "1-MM0A000000",
		description: "a",
	})

	expect(result).toEqual({ ok: false, reason: "taken", entries: before })
	expect(readSaved(held)).toEqual(before)
})

test("an update to an entry that is gone is refused", () => {
	const result = updateSaved(storage(), "1-MS0A000000", {
		code: "1-MS0A000000",
		description: "a",
	})

	expect(result).toEqual({ ok: false, reason: "missing", entries: [] })
})

test("the list as text is each code on its own line with its note quoted under it", () => {
	expect(
		formatSaved([
			{
				code: "1-MM0A000000",
				description: "Coin farm\n\nuse Fairy",
				savedAt: 2,
			},
			{ code: "1-MS0A000000", description: "", savedAt: 1 },
		]),
	).toBe("1-MM0A000000\n> Coin farm\n>\n> use Fairy\n\n1-MS0A000000\n")
})

test("the text a list is written as reads back as the same list", () => {
	const entries = [
		{ code: "1-MM0A000000", description: "Coin farm\n\nuse Fairy", savedAt: 2 },
		{ code: "1-MS0A000000", description: "", savedAt: 1 },
	]

	expect(parseSaved(formatSaved(entries))).toEqual({
		entries: entries.map(({ code, description }) => ({ code, description })),
		skipped: [],
	})
})

test("reading text takes bare codes, canonicalises them, and skips what does not read", () => {
	const { entries, skipped } = parseSaved("  mm0a000000  \nnot a code\n> orphan note\n1-MS0A000000\n>no space\n")

	expect(entries).toEqual([
		{ code: "1-MM0A000000", description: "" },
		{ code: "1-MS0A000000", description: "no space" },
	])
	expect(skipped.map((line) => line.line)).toEqual([2])
	expect(skipped.map((line) => line.reason.id)).toEqual(["unknownChar"])
	expect(englishOf(skipped.map((line) => line.reason))).toEqual(['slot 1 (mode): unknown char "N"'])
})

test("reading text takes a shared link, and the note the link carries", () => {
	const { entries } = parseSaved(
		`https://example.com/combi-name/${shareHashFor("1-MM0A000000", "Coin farm")}\nhttps://example.com/combi-name/#1-MS0A000000\n> typed under it`,
	)

	expect(entries).toEqual([
		{ code: "1-MM0A000000", description: "Coin farm" },
		{ code: "1-MS0A000000", description: "typed under it" },
	])
})

test("a code listed twice in the text is read once, keeping the first note", () => {
	const { entries } = parseSaved("1-MM0A000000\n> first\n1-MM0A000000\n> second")

	expect(entries).toEqual([{ code: "1-MM0A000000", description: "first" }])
})

test("importing adds the codes not yet saved, in order at the top, and leaves saved ones alone", () => {
	const held = storage()
	saveCode(held, "1-MS0A000000", { description: "mine" }, 1)

	const result = importSaved(
		held,
		[
			{ code: "1-MM0A000000", description: "a" },
			{ code: "1-MS0A000000", description: "theirs" },
			{ code: "1-MB05000000", description: "b" },
		],
		5,
	)

	expect(result.added).toBe(2)
	expect(result.kept).toBe(1)
	expect(result.stored).toBe(true)
	expect(readSaved(held)).toEqual([
		{ code: "1-MM0A000000", description: "a", savedAt: 5 },
		{ code: "1-MB05000000", description: "b", savedAt: 5 },
		{ code: "1-MS0A000000", description: "mine", savedAt: 1 },
	])
})

test("an entry keeps its rounds, and drops values and rounds that are not well formed", () => {
	const held = storage()
	saveCode(held, "1-MM0A000000", { description: "Coin farm", rounds: [{}, { money: 12000, time: 245 }] }, 1)

	expect(readSaved(held)).toEqual([
		{ code: "1-MM0A000000", description: "Coin farm", rounds: [{ money: 12000, time: 245 }], savedAt: 1 },
	])
	expect(
		readSaved(
			storage(
				JSON.stringify([
					{ code: "1-MS0A000000", description: "", savedAt: 1, rounds: [{ boxes: 9, exp: 5 }, { money: "x" }] },
					{ code: "1-MM0A000000", description: "", savedAt: 1, rounds: "junk" },
				]),
			),
		),
	).toEqual([
		{ code: "1-MS0A000000", description: "", rounds: [{ exp: 5 }], savedAt: 1 },
		{ code: "1-MM0A000000", description: "", savedAt: 1 },
	])
})

test("an entry whose rounds are all blank is kept with none", () => {
	const held = storage()
	saveCode(held, "1-MM0A000000", { description: "", rounds: [{}] }, 1)
	expect(readSaved(held)).toEqual([{ code: "1-MM0A000000", description: "", savedAt: 1 }])
})

test("the first read moves the old list to the new key, its ranges as rounds, and leaves the old key alone", () => {
	const old = JSON.stringify([
		{ code: "1-MM0A000000", description: "a", savedAt: 2, stats: { money: { min: 1, max: 2 }, time: 30 } },
		{ code: "1-MS0A000000", description: "", savedAt: 1, stats: { time: 60 } },
	])
	const held = storage(old, LEGACY_SAVED_KEY)

	const moved = [
		{
			code: "1-MM0A000000",
			description: "a",
			rounds: [
				{ money: 1, time: 30 },
				{ money: 2, time: 30 },
			],
			savedAt: 2,
		},
		{ code: "1-MS0A000000", description: "", rounds: [{ time: 60 }], savedAt: 1 },
	]
	expect(readSaved(held)).toEqual(moved)
	expect(JSON.parse(held.getItem(SAVED_KEY) ?? "null")).toEqual(moved)
	expect(held.getItem(LEGACY_SAVED_KEY)).toBe(old)
})

test("a list emptied after the move stays empty, and the old list is not read again", () => {
	const held = storage(JSON.stringify([{ code: "1-MM0A000000", description: "", savedAt: 1 }]), LEGACY_SAVED_KEY)
	held.setItem(SAVED_KEY, "[]")
	expect(readSaved(held)).toEqual([])
})

test("a browser that refuses the move's write still shows the moved list", () => {
	const old = JSON.stringify([{ code: "1-MM0A000000", description: "", savedAt: 1, stats: { time: 60 } }])
	const refusingWrites = {
		getItem: (name: string) => (name === LEGACY_SAVED_KEY ? old : null),
		setItem() {
			throw new Error("storage is full")
		},
	} as unknown as Storage
	expect(readSaved(refusingWrites)).toEqual([
		{ code: "1-MM0A000000", description: "", rounds: [{ time: 60 }], savedAt: 1 },
	])
})

test("an entry under the new key that still has old stats converts too", () => {
	const held = storage(
		JSON.stringify([{ code: "1-MM0A000000", description: "", savedAt: 1, stats: { money: { min: 3, max: 3 } } }]),
	)
	expect(readSaved(held)[0]?.rounds).toEqual([{ money: 3 }])
})

test("updating an entry rewrites its rounds, and clearing them takes them off", () => {
	const held = storage()
	saveCode(held, "1-MS0A000000", { description: "a", rounds: [{ time: 60 }] }, 1)

	updateSaved(held, "1-MS0A000000", { code: "1-MS0A000000", description: "a", rounds: [{ time: 90 }] }, 2)
	expect(readSaved(held)[0]?.rounds).toEqual([{ time: 90 }])

	updateSaved(held, "1-MS0A000000", { code: "1-MS0A000000", description: "a" }, 3)
	expect(readSaved(held)[0]).toEqual({ code: "1-MS0A000000", description: "a", savedAt: 3 })
})

test("exported text carries each round on a line of its own and reads them back", () => {
	const entries = [
		{
			code: "1-MM0A000000",
			description: "Coin farm",
			rounds: [
				{ money: 12000, boxes: 2, time: 245 },
				{ score: 1200000, money: 15000 },
			],
			savedAt: 2,
		},
		{ code: "1-MS0A000000", description: "", savedAt: 1 },
	]
	const text = formatSaved(entries)

	expect(text).toBe(
		"1-MM0A000000\nround: money=12000 boxes=2 time=245\nround: score=1200000 money=15000\n> Coin farm\n\n1-MS0A000000\n",
	)
	expect(parseSaved(text)).toEqual({
		entries: entries.map(({ savedAt: _savedAt, ...entry }) => entry),
		skipped: [],
	})
})

test("text written before rounds still reads, its stat lines as rounds", () => {
	expect(parseSaved("1-MM0A000000\nmoney: 1,000 - 2,000\nTime: 60").entries).toEqual([
		{
			code: "1-MM0A000000",
			description: "",
			rounds: [
				{ money: 1000, time: 60 },
				{ money: 2000, time: 60 },
			],
		},
	])
	expect(parseSaved("1-MS0A000000\nScore: 1,200,000").entries).toEqual([
		{ code: "1-MS0A000000", description: "", rounds: [{ score: 1200000 }] },
	])
})

test("a round or stat line that does not read is skipped and reported, and the entry stays", () => {
	const { entries, skipped } = parseSaved("1-MM0A000000\nboxes: 9\nround: money=1-2\nROUND: Money=1,000")

	expect(entries).toEqual([{ code: "1-MM0A000000", description: "", rounds: [{ money: 1000 }] }])
	expect(skipped).toEqual([
		{ line: 2, text: "boxes: 9", reason: { id: "statFormat", values: { field: "boxes" } } },
		{ line: 3, text: "round: money=1-2", reason: { id: "roundLine" } },
	])
	expect(englishOf(skipped.map((line) => line.reason))).toEqual([
		"Boxes takes 0 to 5, or a range like 2-4.",
		"this round does not read; write it as round: money=12000 time=245",
	])
})

test("a shared link's rounds come in with it, and typed rounds replace them", () => {
	const link = `https://example.com/combi-name/${shareHashFor("1-MM0A000000", "", [{ money: 1 }, { money: 2 }])}`

	expect(parseSaved(link).entries).toEqual([
		{ code: "1-MM0A000000", description: "", rounds: [{ money: 1 }, { money: 2 }] },
	])
	expect(parseSaved(`${link}\nround: time=90`).entries).toEqual([
		{ code: "1-MM0A000000", description: "", rounds: [{ time: 90 }] },
	])
})

test("importing keeps the rounds that came in", () => {
	const held = storage()

	importSaved(held, [{ code: "1-MM0A000000", description: "a", rounds: [{ time: 60 }] }], 5)

	expect(readSaved(held)[0]?.rounds).toEqual([{ time: 60 }])
})
