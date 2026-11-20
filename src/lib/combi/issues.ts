/**
 * What the codec says about a code, as ids rather than sentences: a page shows
 * them in the visitor's language, worded from `combi.issues` in the catalogue.
 * The English wording is the one the codec has always used, and a thrown
 * `CodeError` still carries it as its `message`, so a log reads as it did.
 */

import type { Messages } from "#lib/i18n/messages"
import type { StatField } from "./stats"

import { en } from "#lib/i18n/en"

/** The field a slot of the ten characters holds, as an unknown character names it. */
export type SlotField = "mode" | "goal" | "episode" | "boosts" | "randomBoost" | "cookiePower"

/** What a loadout id names, as an id no entry has names it. */
export type LoadoutNoun = "cookie" | "pet" | "treasure"

/** The values each issue is worded with; `undefined` for an issue that needs none. */
export type IssueValues = {
	codeLength: { length: number; got: number; code: string }
	unknownChar: { slots: string; field: SlotField; chars: string }
	goalSet: { goals: string }
	floorRange: { max: number; floor: number }
	floorDigits: { text: string }
	floorAbove: { text: string; max: number }
	floorReserved: { rest: string; expected: string }
	episodeNoBoosts: undefined
	autoScore: undefined
	autoButSemi: undefined
	semiButAuto: undefined
	separators: { separator: string; count: number }
	episodeNoRelay: undefined
	episodeNoTreasures: undefined
	relayButAuto: undefined
	loadoutEmpty: undefined
	loadoutVersion: { version: string }
	loadoutUnknownGroup: { tag: string }
	loadoutGroupTwice: { tag: string }
	loadoutGroupOrder: { tag: string }
	loadoutLevelDigits: { tag: string; text: string; level: string }
	loadoutLevelBackwards: { tag: string; id: string; min: number; max: number }
	loadoutNoLevel: { tag: string; id: string }
	loadoutLevelOutside: { tag: string; id: string; level: number; max: number }
	loadoutIdShape: { tag: string; id: string; width: number }
	loadoutUnknownId: { tag: string; noun: LoadoutNoun; id: string }
	loadoutTooManySlots: { tag: string; count: number; max: number }
	loadoutSlotEmpty: { tag: string; slot: number }
	loadoutSlotTwice: { tag: string; slot: number; id: string }
	loadoutNoOrderFlag: { tag: string }
	loadoutOrderFlag: { tag: string; flag: string }
	statFormat: { field: StatField }
	unreadableLine: undefined
}

export type IssueId = keyof IssueValues

/** Every id, for walking them all; a test holds it to the catalogue's keys. */
export const ISSUE_IDS = [
	"codeLength",
	"unknownChar",
	"goalSet",
	"floorRange",
	"floorDigits",
	"floorAbove",
	"floorReserved",
	"episodeNoBoosts",
	"autoScore",
	"autoButSemi",
	"semiButAuto",
	"separators",
	"episodeNoRelay",
	"episodeNoTreasures",
	"relayButAuto",
	"loadoutEmpty",
	"loadoutVersion",
	"loadoutUnknownGroup",
	"loadoutGroupTwice",
	"loadoutGroupOrder",
	"loadoutLevelDigits",
	"loadoutLevelBackwards",
	"loadoutNoLevel",
	"loadoutLevelOutside",
	"loadoutIdShape",
	"loadoutUnknownId",
	"loadoutTooManySlots",
	"loadoutSlotEmpty",
	"loadoutSlotTwice",
	"loadoutNoOrderFlag",
	"loadoutOrderFlag",
	"statFormat",
	"unreadableLine",
] as const satisfies readonly IssueId[]

export type Issue = {
	readonly id: IssueId
	readonly values?: Readonly<Record<string, string | number>>
}

/** An issue whose values are checked against the id at the call site. */
export function issue<I extends IssueId>(
	id: I,
	...values: IssueValues[I] extends undefined ? [] : [IssueValues[I]]
): Issue {
	const [given] = values
	return given === undefined ? { id } : { id, values: given as Record<string, string | number> }
}

/** A code that cannot be read or written; `message` is the English text. */
export class CodeError extends Error {
	readonly issue: Issue

	constructor(found: Issue) {
		super(issueText(found, en))
		this.name = "CodeError"
		this.issue = found
	}
}

export function issueText(issue: Issue, m: Messages): string {
	const values = issue.values ?? {}
	const str = (key: string): string => String(values[key] ?? "")
	const num = (key: string): number => Number(values[key])
	const t = m.combi.issues

	switch (issue.id) {
		case "codeLength":
			return t.codeLength(num("length"), num("got"), str("code"))
		case "unknownChar":
			return t.unknownChar(str("slots"), str("field") as SlotField, str("chars"))
		case "goalSet":
			return t.goalSet(str("goals"))
		case "floorRange":
			return t.floorRange(num("max"), num("floor"))
		case "floorDigits":
			return t.floorDigits(str("text"))
		case "floorAbove":
			return t.floorAbove(str("text"), num("max"))
		case "floorReserved":
			return t.floorReserved(str("rest"), str("expected"))
		case "separators":
			return t.separators(str("separator"), num("count"))
		case "loadoutVersion":
			return t.loadoutVersion(str("version"))
		case "loadoutUnknownGroup":
			return t.loadoutUnknownGroup(str("tag"))
		case "loadoutGroupTwice":
			return t.loadoutGroupTwice(str("tag"))
		case "loadoutGroupOrder":
			return t.loadoutGroupOrder(str("tag"))
		case "loadoutLevelDigits":
			return t.loadoutLevelDigits(str("tag"), str("text"), str("level"))
		case "loadoutLevelBackwards":
			return t.loadoutLevelBackwards(str("tag"), str("id"), num("min"), num("max"))
		case "loadoutNoLevel":
			return t.loadoutNoLevel(str("tag"), str("id"))
		case "loadoutLevelOutside":
			return t.loadoutLevelOutside(str("tag"), str("id"), num("level"), num("max"))
		case "loadoutIdShape":
			return t.loadoutIdShape(str("tag"), str("id"), num("width"))
		case "loadoutUnknownId":
			return t.loadoutUnknownId(str("tag"), str("noun") as LoadoutNoun, str("id"))
		case "loadoutTooManySlots":
			return t.loadoutTooManySlots(str("tag"), num("count"), num("max"))
		case "loadoutSlotEmpty":
			return t.loadoutSlotEmpty(str("tag"), num("slot"))
		case "loadoutSlotTwice":
			return t.loadoutSlotTwice(str("tag"), num("slot"), str("id"))
		case "loadoutNoOrderFlag":
			return t.loadoutNoOrderFlag(str("tag"))
		case "loadoutOrderFlag":
			return t.loadoutOrderFlag(str("tag"), str("flag"))
		case "statFormat":
			return t.statFormat(str("field") as StatField)
		case "episodeNoBoosts":
		case "autoScore":
		case "autoButSemi":
		case "semiButAuto":
		case "episodeNoRelay":
		case "episodeNoTreasures":
		case "relayButAuto":
		case "loadoutEmpty":
		case "unreadableLine":
			return t[issue.id]
	}
}
