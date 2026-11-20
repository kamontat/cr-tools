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

test("counts read naturally", () => {
	expect(en.combi.list.rounds(1)).toBe("1 round")
	expect(en.combi.list.rounds(3)).toBe("3 rounds")
	expect(th.combi.list.rounds(3)).toBe("3 รอบ")
})
