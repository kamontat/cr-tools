/**
 * Codes someone kept on purpose, each with a few words of their own saying what
 * it is for, and the rounds it was played (`rounds.ts`). `state.ts` remembers the last build whether anyone asked or not;
 * this is the list they asked for.
 *
 * It lives in `localStorage` under its own key and nowhere else. It leaves the
 * browser only when someone sends it: one entry as a link carrying its note
 * (`state.ts`'s `shareHashFor`), or the whole list as the text `formatSaved`
 * writes and `parseSaved` reads back. Nothing read back is trusted: the list
 * outlives the page that wrote it, so an entry that is not the shape this file
 * writes is dropped on the way in, every storage call is wrapped the way
 * `state.ts`'s are, and imported text is decoded code by code.
 */

import { decodeFull, encodeFull } from "./full-code"
import { CodeError, type Issue, issue } from "./issues"
import { isEmptyRound, type Round, readRoundLine, readRounds, roundLine, roundsFromStats } from "./rounds"
import { codeInHash, noteInHash, oldStatsInHash, roundsInHash } from "./state"
import { parseStat, putStat, type RunStats, readStats, type StatField, type StatsDraft } from "./stats"

/**
 * Where the list lives. Entries moved here when rounds replaced the single set
 * of ranges; `readSaved` fills it once from `LEGACY_SAVED_KEY`, converted, and
 * never writes the old key again, so a rolled-back page still finds the codes
 * as they were at the move.
 */
export const SAVED_KEY = "combi-name:saved:v2"

export const LEGACY_SAVED_KEY = "combi-name:saved"

/** Room for a few lines of notes, short enough that the list stays a list. */
export const DESCRIPTION_MAX = 500

export interface SavedCode {
	readonly code: string
	readonly description: string
	/** Left off rather than empty when the entry has none. */
	readonly rounds?: readonly Round[]
	/** Milliseconds since the epoch, when the entry was last saved. */
	readonly savedAt: number
}

function isSavedCode(value: unknown): value is SavedCode {
	if (typeof value !== "object" || value === null) return false
	const entry = value as { [K in keyof SavedCode]?: unknown }
	return (
		typeof entry.code === "string" &&
		entry.code !== "" &&
		typeof entry.description === "string" &&
		typeof entry.savedAt === "number" &&
		Number.isFinite(entry.savedAt)
	)
}

/**
 * A description as it is kept: line breaks are part of it, so only the blank
 * lines around it and the spaces closing each line go.
 */
export function cleanDescription(description: string): string {
	return description
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.replace(/^\s*\n|\n\s*$/g, "")
		.trim()
		.slice(0, DESCRIPTION_MAX)
}

/** What an entry says beside its code. */
export interface SavedNote {
	readonly description: string
	readonly rounds?: readonly Round[]
}

/** An entry as it is kept: a clean description, and rounds only if any has a value. */
function entryOf(code: string, note: SavedNote, savedAt: number): SavedCode {
	const rounds = readRounds(note.rounds)
	return {
		code,
		description: cleanDescription(note.description),
		...(rounds.length === 0 ? {} : { rounds }),
		savedAt,
	}
}

/** The rounds a stored entry holds, or the ones its old ranges stand for. */
function storedRounds(entry: { rounds?: unknown; stats?: unknown }): Round[] {
	return Array.isArray(entry.rounds) ? readRounds(entry.rounds) : roundsFromStats(readStats(entry.stats))
}

function entriesIn(raw: string): SavedCode[] {
	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		return []
	}
	if (!Array.isArray(parsed)) return []
	return parsed
		.filter(isSavedCode)
		.map((entry) => entryOf(entry.code, { description: entry.description, rounds: storedRounds(entry) }, entry.savedAt))
}

/** The first line, for anywhere a description has to fit in a sentence. */
export function descriptionTitle(description: string): string {
	return description.split("\n")[0] ?? ""
}

/**
 * Every saved code, newest first. The first read after the move to rounds
 * finds no list under `SAVED_KEY`, reads the old one, converts it and keeps it
 * under the new key; a browser that refuses the write still gets the list.
 */
export function readSaved(storage: Storage): SavedCode[] {
	try {
		const raw = storage.getItem(SAVED_KEY)
		if (raw !== null) return entriesIn(raw)
		const legacy = storage.getItem(LEGACY_SAVED_KEY)
		if (legacy === null) return []
		const entries = entriesIn(legacy)
		writeSaved(storage, entries)
		return entries
	} catch {
		return []
	}
}

function writeSaved(storage: Storage, entries: readonly SavedCode[]): boolean {
	try {
		storage.setItem(SAVED_KEY, JSON.stringify(entries))
		return true
	} catch {
		return false
	}
}

/**
 * Saves a code at the head of the list. A code already in the list is not
 * listed twice: saving it again takes the new description and rounds and moves it to the
 * top, since two notes on one code is one note someone forgot they wrote.
 *
 * Returns the list as it now stands, and whether the browser kept it — a
 * refused write still hands back the list the page should show for this visit.
 */
export function saveCode(
	storage: Storage,
	code: string,
	note: SavedNote,
	now: number = Date.now(),
): { entries: SavedCode[]; stored: boolean } {
	const entry = entryOf(code, note, now)
	const entries = [entry, ...readSaved(storage).filter((saved) => saved.code !== code)]
	return { entries, stored: writeSaved(storage, entries) }
}

export function removeSaved(storage: Storage, code: string): { entries: SavedCode[]; stored: boolean } {
	const entries = readSaved(storage).filter((saved) => saved.code !== code)
	return { entries, stored: writeSaved(storage, entries) }
}

/** Empties the list. Written as an empty list, the shape `removeSaved` leaves. */
export function clearSaved(storage: Storage): {
	entries: SavedCode[]
	stored: boolean
} {
	return { entries: [], stored: writeSaved(storage, []) }
}

export type UpdateResult =
	| { ok: true; entries: SavedCode[]; stored: boolean }
	| { ok: false; reason: "missing" | "taken"; entries: SavedCode[] }

/**
 * Rewrites one entry — its code, its description, its rounds — where it stands.
 * Editing is not saving afresh, so the entry keeps its place in the list.
 *
 * The list holds each code once, so moving an entry onto a code another entry
 * already holds is refused rather than quietly merging two notes into one.
 */
export function updateSaved(
	storage: Storage,
	code: string,
	change: SavedNote & { code: string },
	now: number = Date.now(),
): UpdateResult {
	const entries = readSaved(storage)
	const index = entries.findIndex((saved) => saved.code === code)
	if (index === -1) return { ok: false, reason: "missing", entries }
	if (change.code !== code && entries.some((saved) => saved.code === change.code)) {
		return { ok: false, reason: "taken", entries }
	}

	const next = entries.with(index, entryOf(change.code, change, now))
	return { ok: true, entries: next, stored: writeSaved(storage, next) }
}

/**
 * The list as text someone can paste into a chat, a note or a file: each code
 * on a line of its own, its rounds under it one per line as
 * `round: money=12000 time=245`, then its description with every line quoted
 * by `>`, and a blank line between entries. The quote is what tells a description
 * from a code on the way back in, so a note may say anything, a code included.
 */
export function formatSaved(entries: readonly SavedCode[]): string {
	return entries
		.map((entry) => {
			const note =
				entry.description === "" ? [] : entry.description.split("\n").map((line) => (line === "" ? ">" : `> ${line}`))
			const rounds = (entry.rounds ?? []).map((round) => `round: ${roundLine(round)}`)
			return [entry.code, ...rounds, ...note].join("\n")
		})
		.map((block) => `${block}\n`)
		.join("\n")
}

/** One entry read from text, before the list it joins gives it a time. */
export interface ParsedCode extends SavedNote {
	readonly code: string
	/** When a backup says the entry was saved; text has no such time. */
	readonly savedAt?: number
}

/** A line of text that named no code this page can read. */
export interface SkippedLine {
	/** One-based, the way an editor numbers it. */
	readonly line: number
	readonly text: string
	readonly reason: Issue
}

/** A round on a line of its own under a code, as `formatSaved` writes it. */
const ROUND_LINE = /^round\s*:\s*(.*)$/i

/** An old stat line, `money: 1200-1500`, as the list was written before rounds. */
const STAT_LINE = /^(score|money|exp|boxes|time)\s*:\s*(.*)$/i

/**
 * A bare code in the form the page itself would write it. Throws `CodeError`
 * when it cannot be read.
 */
export function canonicalCode(text: string): string {
	return encodeFull(decodeFull(text.toUpperCase()).full)
}

/** The code a line names, written in the form the page itself would write it. */
function codeOnLine(text: string): {
	code: string
	note: string | null
	rounds: Round[]
	stats: RunStats
} {
	// A link, or a bare hash: the code is the fragment, and it may carry a note.
	const at = text.indexOf("#")
	const raw = at === -1 ? text : text.slice(at)
	return {
		code: at === -1 ? canonicalCode(text) : encodeFull(decodeFull(codeInHash(raw) ?? "").full),
		note: at === -1 ? null : noteInHash(raw),
		rounds: at === -1 ? [] : roundsInHash(raw),
		stats: at === -1 ? {} : oldStatsInHash(raw),
	}
}

/**
 * Reads the text `formatSaved` writes, and the looser things people paste
 * instead: bare codes one per line, a shared link, a `>` with no space after
 * it, a label in any case, and the stat lines the list was written with
 * before rounds (`money: 1200-1500`), converted as `roundsFromStats` does.
 * A line that is neither a quote, a round, a stat nor a code, or one whose
 * value does not read, is skipped and reported rather than failing the lot,
 * since one typo should not cost someone a whole list. Rounds typed under a
 * code replace the ones its link carried.
 * A quote with no code above it belongs to nothing and goes without a word.
 *
 * A code listed twice is read once, keeping the first — the same rule the
 * saved list itself keeps.
 */
export function parseSaved(text: string): {
	entries: ParsedCode[]
	skipped: SkippedLine[]
} {
	const blocks: {
		code: string
		linkNote: string | null
		linkRounds: Round[]
		/** The stats an old-style link carried, which old stat lines under it add to. */
		linkStats: RunStats
		rounds: Round[]
		stats: StatsDraft
		lines: string[]
	}[] = []
	const skipped: SkippedLine[] = []
	let current: (typeof blocks)[number] | null = null

	text
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.forEach((raw, index) => {
			const line = raw.trim()
			if (line.startsWith(">")) {
				current?.lines.push(line.slice(1).replace(/^ /, ""))
				return
			}
			if (line === "") return
			const round = ROUND_LINE.exec(line)
			if (round !== null) {
				const read = readRoundLine(round[1] ?? "")
				if (read === null) skipped.push({ line: index + 1, text: line, reason: issue("roundLine") })
				else current?.rounds.push(read)
				return
			}
			const stat = STAT_LINE.exec(line)
			if (stat !== null) {
				const field = (stat[1] ?? "").toLowerCase() as StatField
				const parsed = parseStat(field, stat[2] ?? "")
				if (parsed.ok) {
					if (current !== null) putStat(current.stats, field, parsed.value)
				} else {
					skipped.push({ line: index + 1, text: line, reason: parsed.issue })
				}
				return
			}
			try {
				const { code, note, rounds, stats } = codeOnLine(line)
				current = { code, linkNote: note, linkRounds: rounds, linkStats: stats, rounds: [], stats: {}, lines: [] }
				blocks.push(current)
			} catch (error) {
				current = null
				skipped.push({
					line: index + 1,
					text: line,
					reason: error instanceof CodeError ? error.issue : issue("unreadableLine"),
				})
			}
		})

	const entries: ParsedCode[] = []
	for (const block of blocks) {
		if (entries.some((entry) => entry.code === block.code)) continue
		const typed = cleanDescription(block.lines.join("\n"))
		// Old stat lines add to an old link's stats, field by field, as they did before rounds.
		const typedStats =
			Object.keys(block.stats).length === 0 ? [] : roundsFromStats({ ...block.linkStats, ...block.stats })
		const typedRounds = [...block.rounds, ...typedStats]
		const rounds = (typedRounds.length > 0 ? typedRounds : block.linkRounds).filter((round) => !isEmptyRound(round))
		entries.push({
			code: block.code,
			description: typed !== "" ? typed : cleanDescription(block.linkNote ?? ""),
			...(rounds.length === 0 ? {} : { rounds }),
		})
	}
	return { entries, skipped }
}

/**
 * Adds what text brought in to the saved list. A code already saved keeps the
 * note it has: the note someone wrote for themselves outranks one that came
 * from somewhere else, and an import that could overwrite a list is one nobody
 * would dare run twice. New codes join the list in date order, newest first; ones with no date of their own are dated now and so go on top.
 */
export function importSaved(
	storage: Storage,
	incoming: readonly ParsedCode[],
	now: number = Date.now(),
): { entries: SavedCode[]; stored: boolean; added: number; kept: number } {
	const existing = readSaved(storage)
	const fresh = incoming
		.filter((entry) => !existing.some((saved) => saved.code === entry.code))
		.map((entry) => entryOf(entry.code, entry, entry.savedAt ?? now))
	// Newest first by the date each carries, so a year-old backup does not pose as the latest; ties keep fresh first.
	const entries = [...fresh, ...existing].sort((one, other) => other.savedAt - one.savedAt)
	return {
		entries,
		stored: fresh.length === 0 ? true : writeSaved(storage, entries),
		added: fresh.length,
		kept: incoming.length - fresh.length,
	}
}
