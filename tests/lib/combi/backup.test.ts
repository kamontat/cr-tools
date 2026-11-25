import { expect, test } from "vitest"

import { writeBackup } from "#lib/backup"
import {
	exportCodes,
	LOCAL_LIMIT,
	localUse,
	previewRestore,
	type SavedCounts,
	savedCounts,
	usageText,
} from "#lib/combi/backup"
import { issue } from "#lib/combi/issues"
import { canonicalCode, formatSaved, parseSaved, type SavedCode } from "#lib/combi/saved"

const NOW = new Date("2026-11-25T08:00:00.000Z")

const LIST: SavedCode[] = [
	{ code: "1-MS0A000000", description: "Score run\nsecond line", savedAt: 3000, rounds: [{ money: 12000, time: 245 }] },
	{ code: "1-MM0A000000", description: "", savedAt: 2000 },
	{ code: "1-MB05000000", description: "auto", savedAt: 1000, rounds: [{ score: 5 }, { exp: 7 }] },
]

const jsonOf = (list: unknown): string => writeBackup({ "combi-codes": list }, NOW)

test("canonicalCode writes a bare code the way the page does", () => {
	expect(canonicalCode("1-ms0a000000")).toBe("1-MS0A000000")
	expect(() => canonicalCode("nope")).toThrow()
})

test("exportCodes leaves rounds off an entry with none", () => {
	const out = exportCodes(LIST)
	expect(out[1]).toEqual({ code: "1-MM0A000000", description: "", savedAt: 2000 })
	expect(Object.keys(out[0] as object)).toEqual(["code", "description", "savedAt", "rounds"])
})

test("a written backup previews as the same codes, notes and rounds", () => {
	const preview = previewRestore(jsonOf(exportCodes(LIST)), [])
	expect(preview.entries.map(({ code, description, rounds }) => ({ code, description, rounds }))).toEqual(
		LIST.map(({ code, description, rounds }) => ({ code, description, rounds })),
	)
	expect(preview.fresh).toBe(3)
	expect(preview.kept).toBe(0)
	expect(preview.skipped).toEqual([])
})

test("an entry's saved time is kept when it is a positive number", () => {
	const preview = previewRestore(
		jsonOf([
			{ code: "1-MS0A000000", description: "", savedAt: 42 },
			{ code: "1-MM0A000000", description: "", savedAt: -1 },
		]),
		[],
	)
	expect(preview.entries[0]?.savedAt).toBe(42)
	expect(preview.entries[1]?.savedAt).toBeUndefined()
})

test("a bad entry is skipped with its position and the rest restore", () => {
	const preview = previewRestore(
		jsonOf([{ code: "1-MS0A000000", description: "a" }, { code: "bad" }, { code: "1-MM0A000000", description: "b" }]),
		[],
	)
	expect(preview.entries.map((entry) => entry.code)).toEqual(["1-MS0A000000", "1-MM0A000000"])
	expect(preview.skipped).toHaveLength(1)
	expect(preview.skipped[0]).toMatchObject({ line: 2, text: "combi-codes[1]" })
	expect(preview.skipped[0]?.reason.id).toBe("codeLength")
})

test("an entry that is not an object, or has no string code, is unreadable", () => {
	const preview = previewRestore(jsonOf([5, { code: 7 }, null, {}]), [])
	expect(preview.entries).toEqual([])
	expect(preview.skipped.map((s) => [s.line, s.text, s.reason])).toEqual([
		[1, "combi-codes[0]", issue("unreadableLine")],
		[2, "combi-codes[1]", issue("unreadableLine")],
		[3, "combi-codes[2]", issue("unreadableLine")],
		[4, "combi-codes[3]", issue("unreadableLine")],
	])
})

test("a duplicate code in the file keeps the first", () => {
	const preview = previewRestore(
		jsonOf([
			{ code: "1-MS0A000000", description: "first" },
			{ code: "1-ms0a000000", description: "second" },
		]),
		[],
	)
	expect(preview.entries).toEqual([{ code: "1-MS0A000000", description: "first" }])
})

test("the description is cleaned and the rounds read", () => {
	const preview = previewRestore(
		jsonOf([{ code: "1-MS0A000000", description: "  hi  \n", rounds: [{ money: 1 }, { money: "x" }, 4] }]),
		[],
	)
	expect(preview.entries[0]).toMatchObject({ code: "1-MS0A000000", description: "hi", rounds: [{ money: 1 }] })
})

test("a file with no combi-codes finds nothing and reports nothing", () => {
	expect(previewRestore('{"version": 1}', [])).toEqual({ entries: [], fresh: 0, kept: 0, skipped: [] })
	expect(previewRestore('{"combi-codes": "x"}', [])).toEqual({ entries: [], fresh: 0, kept: 0, skipped: [] })
})

test("a newer file is named, not read", () => {
	expect(previewRestore('{"version": 2, "combi-codes": []}', [])).toEqual({
		entries: [],
		fresh: 0,
		kept: 0,
		skipped: [],
		newer: 2,
	})
})

test("today's text export previews as parseSaved reads it", () => {
	const text = `${formatSaved(LIST)}\n1-MM0A000000\nmoney: 1200-1500\n`
	const preview = previewRestore(text, [])
	const { entries, skipped } = parseSaved(text)
	expect(preview.entries).toEqual(entries)
	expect(preview.skipped).toEqual(skipped)
	const old = previewRestore("1-MM0A000000\nmoney: 1200-1500\n> note\nround: score=5", [])
	expect(old.entries[0]?.rounds).toEqual([{ score: 5 }, { money: 1200 }, { money: 1500 }])
})

test("fresh and kept count against what is already saved", () => {
	const preview = previewRestore(jsonOf(exportCodes(LIST)), [LIST[1] as SavedCode])
	expect(preview.fresh).toBe(2)
	expect(preview.kept).toBe(1)
	expect(preview.entries).toHaveLength(3)
})

test("localUse counts every key and value at two bytes a character", () => {
	expect(localUse({ length: 2, key: (i: number) => ["a", "de"][i] ?? null, getItem: (k: string) => (k === "a" ? "bc" : "f") } as unknown as Storage)).toBe(12)
	expect(localUse(null)).toBe(0)
})

test("localUse is zero when storage throws", () => {
	const broken = {
		get length(): number {
			throw new Error("off")
		},
	} as unknown as Storage
	expect(localUse(broken)).toBe(0)
})

test("savedCounts over three entries", () => {
	const counts: SavedCounts = savedCounts(LIST)
	expect(counts).toEqual({ codes: 3, rounds: 3, withRounds: 2, withNote: 2, first: 1000, last: 3000 })
	expect(savedCounts([])).toEqual({ codes: 0, rounds: 0, withRounds: 0, withNote: 0, first: null, last: null })
})

test("usageText writes bytes, kB or MB and a whole percent", () => {
	expect(usageText(12_288, LOCAL_LIMIT, "en-US")).toEqual({
		used: "12.0 kB",
		limit: "5.0 MB",
		percent: "0%",
		ratio: 12_288 / LOCAL_LIMIT,
	})
	expect(usageText(512, LOCAL_LIMIT, "en-US").used).toBe("512 B")
	expect(usageText(LOCAL_LIMIT / 2, LOCAL_LIMIT, "en-US")).toMatchObject({ used: "2.5 MB", percent: "50%", ratio: 0.5 })
})
