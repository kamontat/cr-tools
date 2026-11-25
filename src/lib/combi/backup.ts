/**
 * The combi page's part of a site backup (`#lib/backup`): the `combi-codes`
 * field, written from the saved list and read back entry by entry, and the
 * numbers Settings shows about what is kept. A backup made before the JSON
 * file is the list's own text, which `parseSaved` still reads. Nothing is
 * written here; a restore adds what `previewRestore` found through `importSaved`.
 */

import { readBackup } from "#lib/backup"
import { CodeError, type Issue, issue } from "./issues"
import { readRounds } from "./rounds"
import { canonicalCode, cleanDescription, type ParsedCode, parseSaved, type SavedCode, type SkippedLine } from "./saved"

/** Each entry as the file keeps it; an entry with no rounds has no `rounds` field. */
export function exportCodes(entries: readonly SavedCode[]): unknown[] {
	return entries.map((entry) => ({
		code: entry.code,
		description: entry.description,
		savedAt: entry.savedAt,
		...(entry.rounds === undefined || entry.rounds.length === 0 ? {} : { rounds: entry.rounds }),
	}))
}

export type RestorePreview = {
	entries: ParsedCode[]
	/** Entries the saved list does not have. */
	fresh: number
	/** Entries it already has, which a restore leaves as they are. */
	kept: number
	skipped: SkippedLine[]
	/** The version of a file this site is too old to read. */
	newer?: number
}

function entryAt(value: unknown, index: number): { ok: true; entry: ParsedCode } | { ok: false; skipped: SkippedLine } {
	const skip = (reason: Issue) => ({
		ok: false as const,
		skipped: { line: index + 1, text: `combi-codes[${index}]`, reason },
	})
	if (typeof value !== "object" || value === null || Array.isArray(value)) return skip(issue("unreadableLine"))
	const raw = value as { code?: unknown; description?: unknown; savedAt?: unknown; rounds?: unknown }
	if (typeof raw.code !== "string") return skip(issue("unreadableLine"))
	let code: string
	try {
		code = canonicalCode(raw.code.trim())
	} catch (error) {
		return skip(error instanceof CodeError ? error.issue : issue("unreadableLine"))
	}
	const rounds = readRounds(raw.rounds)
	return {
		ok: true,
		entry: {
			code,
			description: cleanDescription(typeof raw.description === "string" ? raw.description : ""),
			...(rounds.length === 0 ? {} : { rounds }),
			...(typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt) && raw.savedAt > 0
				? { savedAt: raw.savedAt }
				: {}),
		},
	}
}

/**
 * What a restore would do with some text — a JSON backup or the list's old text
 * export — without doing it. One bad JSON entry is skipped and named by its
 * position, as a bad line of text is; the rest are read. A code listed twice
 * is read once, keeping the first.
 */
export function previewRestore(text: string, existing: readonly SavedCode[]): RestorePreview {
	const read = readBackup(text)
	if (read.kind === "newer") return { entries: [], fresh: 0, kept: 0, skipped: [], newer: read.version }

	let entries: ParsedCode[] = []
	let skipped: SkippedLine[] = []
	if (read.kind === "text") {
		;({ entries, skipped } = parseSaved(read.text))
	} else {
		const list = read.parts["combi-codes"]
		if (Array.isArray(list)) {
			list.forEach((value: unknown, index) => {
				const result = entryAt(value, index)
				if (!result.ok) skipped.push(result.skipped)
				else if (!entries.some((entry) => entry.code === result.entry.code)) entries.push(result.entry)
			})
		}
	}

	const fresh = entries.filter((entry) => !existing.some((saved) => saved.code === entry.code)).length
	return { entries, fresh, kept: entries.length - fresh, skipped }
}

/** What `localStorage` is said to hold: about 5 MiB in the browsers that matter. */
export const LOCAL_LIMIT = 5 * 1024 * 1024

/** Every key's and value's length, two bytes a character (UTF-16). 0 when there is no storage or it throws. */
export function localUse(store: Storage | null): number {
	if (store === null) return 0
	try {
		let chars = 0
		for (let index = 0; index < store.length; index++) {
			const key = store.key(index)
			if (key === null) continue
			chars += key.length + (store.getItem(key)?.length ?? 0)
		}
		return chars * 2
	} catch {
		return 0
	}
}

export type SavedCounts = {
	codes: number
	rounds: number
	withRounds: number
	withNote: number
	first: number | null
	last: number | null
}

export function savedCounts(entries: readonly SavedCode[]): SavedCounts {
	const times = entries.map((entry) => entry.savedAt)
	return {
		codes: entries.length,
		rounds: entries.reduce((sum, entry) => sum + (entry.rounds?.length ?? 0), 0),
		withRounds: entries.filter((entry) => (entry.rounds?.length ?? 0) > 0).length,
		withNote: entries.filter((entry) => entry.description !== "").length,
		first: times.length === 0 ? null : Math.min(...times),
		last: times.length === 0 ? null : Math.max(...times),
	}
}

function size(bytes: number, locale: string): string {
	const one = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
	if (bytes < 1024) return `${new Intl.NumberFormat(locale).format(bytes)} B`
	if (bytes < 1024 * 1024) return `${one.format(bytes / 1024)} kB`
	return `${one.format(bytes / (1024 * 1024))} MB`
}

/** Use against a limit as words, and as a 0 to 1 ratio for a bar. */
export function usageText(
	used: number,
	limit: number,
	locale: string,
): { used: string; limit: string; percent: string; ratio: number } {
	const ratio = limit > 0 ? used / limit : 0
	return {
		used: size(used, locale),
		limit: size(limit, locale),
		percent: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(ratio),
		ratio,
	}
}
