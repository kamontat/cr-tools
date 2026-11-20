import { expect, test } from "vitest"

import { decode } from "#lib/combi/codec"
import { CodeError, ISSUE_IDS, type Issue, issueText } from "#lib/combi/issues"
import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"
import { thrownIssue } from "./issue-expect"

/** Values for every placeholder any issue reads, so each one can be worded. */
const SAMPLE: Issue["values"] = {
	length: 10,
	got: 9,
	code: "MS0A00000",
	slots: "2-3",
	field: "goal",
	chars: "Z0",
	goals: "score, money",
	max: 100,
	floor: 101,
	text: "H00",
	rest: "X00",
	expected: "000",
	separator: "-",
	count: 2,
	version: "2",
	tag: "T",
	id: "098",
	level: "X",
	min: 9,
	width: 3,
	noun: "treasure",
	slot: 2,
	flag: "X",
}

test("every IssueId has text in both languages", () => {
	expect(ISSUE_IDS.length).toBeGreaterThan(0)
	for (const id of ISSUE_IDS) {
		for (const m of [en, th]) {
			expect(m.combi.issues[id], id).toBeDefined()
			// A stat's field is a stat, not a slot of the code.
			const values = id === "statFormat" ? { ...SAMPLE, field: "boxes" } : SAMPLE
			const text = issueText({ id, values }, m)
			expect(text.trim().length, id).toBeGreaterThan(0)
			expect(text, id).not.toContain("undefined")
		}
	}
	expect(Object.keys(en.combi.issues).sort()).toEqual([...ISSUE_IDS].sort())
})

test("a thrown CodeError keeps the English message", () => {
	let caught: unknown
	try {
		decode("MS0AZ00000")
	} catch (error) {
		caught = error
	}
	expect(caught).toBeInstanceOf(CodeError)
	expect(caught).toBeInstanceOf(Error)
	const error = caught as CodeError
	expect(error.issue).toEqual({ id: "unknownChar", values: { slots: "5", field: "boosts", chars: "Z" } })
	expect(error.message).toBe('slot 5 (boosts): unknown char "Z"')
	expect(error.message).toBe(issueText(error.issue, en))
})

test("Thai text differs from English", () => {
	const issue = thrownIssue(() => decode("MS0AZ00000"))
	expect(issueText(issue, th)).not.toBe(issueText(issue, en))
	expect(issueText({ id: "episodeNoBoosts" }, th)).not.toBe(issueText({ id: "episodeNoBoosts" }, en))
})
