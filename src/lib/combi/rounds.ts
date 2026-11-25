/**
 * The rounds a saved code was played: each one what that run brought home —
 * score, money, exp, boxes, and time in seconds — every value optional and one
 * whole number. They replace the single set of ranges `stats.ts` describes; an
 * old set converts on the way in (`roundsFromStats`), so old storage, old
 * backups and old share links all read the same way.
 *
 * None of it is part of the code. It belongs to a saved entry, travels in a
 * share link as one `round=` parameter per round (`roundParam`) and in text
 * as one `round:` line per round (`readRoundLine`).
 */

import { type Issue, issue } from "./issues"
import { inLimits, type RunStats, STAT_FIELDS, type StatField } from "./stats"

export type Round = { readonly [F in StatField]?: number }

/** A round being put together, a field at a time. */
export type RoundDraft = { -readonly [F in StatField]?: number }

export function isEmptyRound(round: Round): boolean {
	return STAT_FIELDS.every((field) => round[field] === undefined)
}

export type RoundValueResult = { ok: true; value: number | null } | { ok: false; issue: Issue }

/** Reads what someone typed for one value of a round. Blank is no value; digits may be grouped. */
export function parseRoundValue(field: StatField, text: string): RoundValueResult {
	const digits = text.replace(/[,\s]/g, "")
	if (digits === "") return { ok: true, value: null }
	const value = /^\d+$/.test(digits) ? Number(digits) : Number.NaN
	return inLimits(field, value) ? { ok: true, value } : { ok: false, issue: issue("roundValue", { field }) }
}

/** A round read back from storage, keeping only the fields that are well formed. */
export function readRound(value: unknown): Round {
	if (typeof value !== "object" || value === null) return {}
	const raw = value as { [F in StatField]?: unknown }
	const round: RoundDraft = {}
	for (const field of STAT_FIELDS) {
		const n = raw[field]
		if (typeof n === "number" && inLimits(field, n)) round[field] = n
	}
	return round
}

/** Rounds read back from storage; empty ones are dropped. */
export function readRounds(value: unknown): Round[] {
	if (!Array.isArray(value)) return []
	return value.map(readRound).filter((round) => !isEmptyRound(round))
}

/**
 * The rounds an old set of ranges stands for. A range is two runs, the worst
 * and the best, so any range gives two rounds — every minimum, then every
 * maximum — with time and the single values in both. Stats with no range at
 * all are one run, not two identical ones.
 */
export function roundsFromStats(stats: RunStats): Round[] {
	const low: RoundDraft = {}
	const high: RoundDraft = {}
	let ranged = false
	for (const field of STAT_FIELDS) {
		const value = stats[field]
		if (value === undefined) continue
		if (typeof value === "number") {
			low[field] = value
			high[field] = value
		} else {
			low[field] = value.min
			high[field] = value.max
			if (value.min !== value.max) ranged = true
		}
	}
	if (isEmptyRound(low)) return []
	return ranged ? [low, high] : [low]
}

/**
 * Each field's mean over the rounds that filled it in, rounded to a whole
 * number like every stat; a field none filled is left out.
 */
export function averageOf(rounds: readonly Round[]): Round {
	const average: RoundDraft = {}
	for (const field of STAT_FIELDS) {
		const values = rounds.flatMap((round) => (round[field] === undefined ? [] : [round[field]]))
		if (values.length > 0) average[field] = Math.round(values.reduce((sum, n) => sum + n, 0) / values.length)
	}
	return average
}

/** Splits `a=b c=d` style text into a round; null when any part does not read. */
function roundOf(entries: readonly [string, string][]): Round | null {
	const round: RoundDraft = {}
	for (const [name, text] of entries) {
		const field = name.toLowerCase()
		if (!(STAT_FIELDS as readonly string[]).includes(field)) return null
		const read = parseRoundValue(field as StatField, text)
		if (!read.ok) return null
		if (read.value !== null) round[field as StatField] = read.value
	}
	return isEmptyRound(round) ? null : round
}

/** A round as a share link carries it: the values in field order, joined by `:`, trailing blanks trimmed. */
export function roundParam(round: Round): string {
	return STAT_FIELDS.map((field) => (round[field] === undefined ? "" : String(round[field])))
		.join(":")
		.replace(/:+$/, "")
}

/** The round a share link's `round=` value carries, or null when it does not read. */
export function readRoundParam(text: string): Round | null {
	const parts = text.split(":")
	if (parts.length > STAT_FIELDS.length || parts.some((part) => /[,\s]/.test(part))) return null
	return roundOf(parts.map((part, at) => [STAT_FIELDS[at] ?? "", part]))
}

/** The round a backup line carries after `round:`, or null when it does not read. */
export function readRoundLine(text: string): Round | null {
	const pairs = text.trim().split(/\s+(?=[a-z]+\s*=)/i)
	const entries: [string, string][] = []
	for (const pair of pairs) {
		const at = pair.indexOf("=")
		if (at === -1) return null
		entries.push([pair.slice(0, at).trim(), pair.slice(at + 1).trim()])
	}
	return roundOf(entries)
}
