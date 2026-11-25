import { describe, expect, test } from "vitest"

import {
	averageOf,
	isEmptyRound,
	parseRoundValue,
	readRoundLine,
	readRoundParam,
	readRounds,
	roundParam,
	roundsFromStats,
} from "#lib/combi/rounds"

describe("roundsFromStats", () => {
	test("no stats give no rounds", () => {
		expect(roundsFromStats({})).toEqual([])
	})

	test("a range gives two rounds, minimums then maximums, with time and single values in both", () => {
		expect(roundsFromStats({ money: { min: 12000, max: 15000 }, exp: { min: 300, max: 300 }, time: 245 })).toEqual([
			{ money: 12000, exp: 300, time: 245 },
			{ money: 15000, exp: 300, time: 245 },
		])
	})

	test("stats with no range at all give one round", () => {
		expect(roundsFromStats({ time: 245 })).toEqual([{ time: 245 }])
		expect(roundsFromStats({ money: { min: 5, max: 5 }, boxes: { min: 0, max: 0 } })).toEqual([{ money: 5, boxes: 0 }])
	})
})

describe("averageOf", () => {
	test("averages only the filled values of each field, and boxes 0 is filled", () => {
		expect(averageOf([{ money: 10000, boxes: 0 }, { money: 15000 }, {}])).toEqual({ money: 12500, boxes: 0 })
	})

	test("an average is a whole number, rounded half up", () => {
		expect(
			averageOf([
				{ boxes: 2, time: 100 },
				{ boxes: 3, time: 101 },
			]),
		).toEqual({ boxes: 3, time: 101 })
		expect(averageOf([{ money: 1 }, { money: 1 }, { money: 2 }])).toEqual({ money: 1 })
	})

	test("no rounds average to nothing", () => {
		expect(averageOf([])).toEqual({})
	})
})

describe("parseRoundValue", () => {
	test("reads one whole number, grouped or not", () => {
		expect(parseRoundValue("money", "12,000")).toEqual({ ok: true, value: 12000 })
		expect(parseRoundValue("money", " 12 000 ")).toEqual({ ok: true, value: 12000 })
		expect(parseRoundValue("boxes", "0")).toEqual({ ok: true, value: 0 })
	})

	test("blank is no value", () => {
		expect(parseRoundValue("score", "  ")).toEqual({ ok: true, value: null })
	})

	test("a range or a value outside the limits is refused", () => {
		expect(parseRoundValue("money", "12000-15000")).toEqual({
			ok: false,
			issue: { id: "roundValue", values: { field: "money" } },
		})
		expect(parseRoundValue("boxes", "6").ok).toBe(false)
		expect(parseRoundValue("money", "0").ok).toBe(false)
		expect(parseRoundValue("time", "1.5").ok).toBe(false)
	})
})

describe("readRounds", () => {
	test("keeps well-formed fields and drops empty rounds and non-rounds", () => {
		expect(readRounds([{ money: 1 }, { money: "x" }, {}, 4, { boxes: 9, exp: 3 }])).toEqual([{ money: 1 }, { exp: 3 }])
	})

	test("anything but an array is no rounds", () => {
		expect(readRounds(null)).toEqual([])
		expect(readRounds({ money: 1 })).toEqual([])
	})
})

test("isEmptyRound", () => {
	expect(isEmptyRound({})).toBe(true)
	expect(isEmptyRound({ boxes: 0 })).toBe(false)
})

describe("the share-link form", () => {
	test("values in field order, blanks empty, trailing blanks trimmed", () => {
		expect(roundParam({ money: 12000, boxes: 3 })).toBe(":12000::3")
		expect(roundParam({ score: 5, time: 9 })).toBe("5::::9")
	})

	test("reads back, and refuses anything that does not read", () => {
		expect(readRoundParam(":12000::3")).toEqual({ money: 12000, boxes: 3 })
		expect(readRoundParam("1:x")).toBeNull()
		expect(readRoundParam("1:2:3:4:5:6")).toBeNull()
		expect(readRoundParam("")).toBeNull()
		expect(readRoundParam("::")).toBeNull()
	})
})

describe("the backup form", () => {
	test("reads back in any case and with grouping, and refuses anything else", () => {
		expect(readRoundLine("Money=12,000  boxes=3")).toEqual({ money: 12000, boxes: 3 })
		expect(readRoundLine("money=1-2")).toBeNull()
		expect(readRoundLine("gold=5")).toBeNull()
		expect(readRoundLine("")).toBeNull()
	})
})
