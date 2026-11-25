/**
 * The site backup: one JSON file for everything the site keeps. Each tool owns
 * one field of it (`combi-codes` is the combi page's) and validates only that
 * field, so a later tool adds its own beside it without this file knowing.
 * A backup made before there was a JSON file is plain text, which `readBackup`
 * hands back as it is for the tool that wrote it to read.
 */

export const BACKUP_VERSION = 1

export type SiteBackup = { "combi-codes"?: unknown; version: number; exportedAt: string }

const two = (n: number): string => String(n).padStart(2, "0")

/** `cr-tools-2026-11-05.json`, from the local date. */
export function backupFileName(now: Date): string {
	return `cr-tools-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}.json`
}

/** The file's text: each tool's part first, then the version and the time. */
export function writeBackup(parts: { "combi-codes": unknown }, now: Date): string {
	const backup: SiteBackup = {
		"combi-codes": parts["combi-codes"],
		version: BACKUP_VERSION,
		exportedAt: now.toISOString(),
	}
	return JSON.stringify(backup, null, 2)
}

export type ReadBackup =
	| { kind: "json"; parts: Record<string, unknown> }
	| { kind: "text"; text: string }
	| { kind: "newer"; version: number }

/** A JSON object is a backup, a higher `version` is one this site cannot read, anything else is the old text. */
export function readBackup(text: string): ReadBackup {
	let parsed: unknown
	try {
		parsed = JSON.parse(text)
	} catch {
		return { kind: "text", text }
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { kind: "text", text }
	const parts = parsed as Record<string, unknown>
	const version = parts.version
	if (typeof version === "number" && version > BACKUP_VERSION) return { kind: "newer", version }
	return { kind: "json", parts }
}
