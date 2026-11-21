import { expect, test } from "vitest"

import { en } from "#lib/i18n/en"
import { both, l10nAttr, messagesFor } from "#lib/i18n/messages"
import { th } from "#lib/i18n/th"

type Leaf = { path: string; value: unknown }

function walk(node: unknown, prefix = ""): Leaf[] {
	if (typeof node === "string" || typeof node === "function") return [{ path: prefix, value: node }]
	if (node === null || typeof node !== "object") return []
	return Object.entries(node).flatMap(([key, child]) => walk(child, prefix === "" ? key : `${prefix}.${key}`))
}

const paths = (node: unknown) =>
	walk(node)
		.map((leaf) => leaf.path)
		.sort()

test("the walk finds every leaf", () => {
	expect(paths({ a: { b: "x", c: () => "y" } })).toEqual(["a.b", "a.c"])
})

test("Thai and English name the same keys", () => {
	expect(paths(th)).toEqual(paths(en))
	expect(paths(en).length).toBeGreaterThan(0)
	const thLeaves = new Map(walk(th).map((leaf) => [leaf.path, leaf.value]))
	for (const { path, value } of walk(en)) {
		if (typeof value !== "function") continue
		const other = thLeaves.get(path)
		expect(typeof other).toBe("function")
		expect((other as (...args: never[]) => string).length).toBe(value.length)
	}
})

test("no string is empty in either language", () => {
	for (const catalogue of [th, en]) {
		for (const { path, value } of walk(catalogue)) {
			if (typeof value === "string") expect(value.trim().length, path).toBeGreaterThan(0)
		}
	}
})

test("messagesFor picks the catalogue", () => {
	expect(messagesFor("th").frame.home).toBe("หน้าแรก")
	expect(messagesFor("en").frame.home).toBe("Home")
})

test("both gives each language's text", () => {
	expect(both((m) => m.frame.menu)).toEqual({ th: "เมนู", en: "Menu" })
})

test("l10nAttr defaults to Thai and carries both", () => {
	expect(l10nAttr("aria-label", (m) => m.frame.menu)).toEqual({
		"aria-label": "เมนู",
		"data-aria-label-th": "เมนู",
		"data-aria-label-en": "Menu",
		"data-l10n": "",
	})
})

test("the changes a code was read with join the way each language writes sentences", () => {
	expect(en.combi.notices.changes(["One", "Two"])).toBe("One. Two")
	expect(th.combi.notices.changes(["หนึ่ง", "สอง"])).toBe("หนึ่ง สอง")
})
