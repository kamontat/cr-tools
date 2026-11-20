import { expect, test } from "vitest"

import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"

const helpKeys = [
	"mode",
	"goal",
	"episode",
	"floor",
	"action",
	"cookie",
	"relay",
	"pet",
	"treasures",
	"boosts",
	"randomBoost",
	"cookiePower",
	"rounds",
] as const

test("every field has help in both languages", () => {
	for (const catalogue of [en, th]) {
		for (const key of helpKeys) {
			const value: unknown = catalogue.combi.help[key]
			expect(typeof value, key).toBe("string")
			expect((value as string).trim().length, key).toBeGreaterThan(0)
		}
	}
})

test("help names its slots", () => {
	for (const catalogue of [en, th]) {
		const help = catalogue.combi.help
		expect(help.mode).toContain("1")
		expect(help.goal).toContain("2-3")
		expect(help.episode).toContain("4")
		expect(help.boosts).toContain("5")
		expect(help.randomBoost).toContain("6-7")
		expect(help.cookiePower).toContain("8-10")
		expect(help.floor).toContain("5-7")
	}
})

test("Thai help opens with its slots and a colon, as English opens with them and a full stop", () => {
	const help = th.combi.help
	expect(help.mode).toMatch(/^ช่อง 1: /)
	expect(help.goal).toMatch(/^ช่อง 2-3: /)
	expect(help.episode).toMatch(/^ช่อง 4: /)
	expect(help.floor).toMatch(/^ช่อง 5-7: /)
	expect(help.boosts).toMatch(/^ช่อง 5: /)
	expect(help.randomBoost).toMatch(/^ช่อง 6-7: /)
	expect(help.cookiePower).toMatch(/^ช่อง 8-10: /)
})

test("the empty list quotes the New code button by its own label", () => {
	expect(th.combi.list.empty).toContain(`“${th.combi.list.newCode}”`)
	expect(en.combi.list.empty).toContain(`“${en.combi.list.newCode}”`)
})

test("the episode stays ตอน in Thai, never ด่าน", () => {
	expect(th.combi.describe.notUsed).toBe("ไม่ใช้กับตอนที่เลือก")
	expect(JSON.stringify(th.combi)).not.toContain("ด่าน")
})

test("treasures in an exact order say so in both languages", () => {
	expect(en.combi.describe.fields.treasuresOrdered).toBe("Treasures (exact order)")
	expect(th.combi.describe.fields.treasuresOrdered).toBe("สมบัติ (ต้องเรียงตามนี้)")
})

test("the combi tool's tagline calls the mode a mode", () => {
	expect(en.tools["combi-name"].tagline).toContain("mode")
	expect(en.tools["combi-name"].tagline).not.toMatch(/\btype\b/)
})

test("counts read naturally", () => {
	expect(en.combi.list.rounds(1)).toBe("1 round")
	expect(en.combi.list.rounds(3)).toBe("3 rounds")
	expect(th.combi.list.rounds(3)).toBe("3 รอบ")
})
