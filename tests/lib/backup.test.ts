import { expect, test } from "vitest"

import { BACKUP_VERSION, backupFileName, readBackup, writeBackup } from "#lib/backup"

test("the file name is the local date", () => {
	expect(backupFileName(new Date(2026, 10, 5, 23, 59))).toBe("cr-tools-2026-11-05.json")
	expect(backupFileName(new Date(2026, 0, 31, 0, 0))).toBe("cr-tools-2026-01-31.json")
})

test("a backup writes combi-codes first, then version and time, indented by two", () => {
	const now = new Date("2026-11-25T08:00:00.000Z")
	const text = writeBackup({ "combi-codes": [{ code: "1-MS0A000000" }] }, now)
	expect(Object.keys(JSON.parse(text))).toEqual(["combi-codes", "version", "exportedAt"])
	expect(JSON.parse(text)).toEqual({
		"combi-codes": [{ code: "1-MS0A000000" }],
		version: BACKUP_VERSION,
		exportedAt: "2026-11-25T08:00:00.000Z",
	})
	expect(text).toContain('\n  "combi-codes": [')
})

test("a written backup reads back as json parts", () => {
	const text = writeBackup({ "combi-codes": [1] }, new Date(0))
	const read = readBackup(text)
	expect(read.kind).toBe("json")
	if (read.kind === "json") expect(read.parts["combi-codes"]).toEqual([1])
})

test("a file with no version is version 1", () => {
	expect(readBackup('{"combi-codes": []}').kind).toBe("json")
})

test("a higher version is newer", () => {
	expect(readBackup('{"version": 2}')).toEqual({ kind: "newer", version: 2 })
})

test("anything that is not a JSON object is text", () => {
	expect(readBackup("1-MM0A000000\n> note")).toEqual({ kind: "text", text: "1-MM0A000000\n> note" })
	expect(readBackup("[1,2]").kind).toBe("text")
	expect(readBackup('"x"').kind).toBe("text")
	expect(readBackup("null").kind).toBe("text")
})
