/**
 * Copies `text` to the clipboard. Resolves true when it was copied, and false
 * when the browser has no clipboard or refuses — it never rejects, so a caller
 * only chooses what to say.
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		const clipboard = globalThis.navigator?.clipboard
		if (typeof clipboard?.writeText !== "function") return false
		await clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}

/**
 * Reads the clipboard's text. `missing` is a browser with no way to read it,
 * `refused` one that has and said no (a denied permission, a page not in
 * focus) — never a rejection, so a caller only chooses what to say.
 */
export async function readClipboard(): Promise<
	{ ok: true; text: string } | { ok: false; reason: "missing" | "refused" }
> {
	const clipboard = globalThis.navigator?.clipboard
	if (typeof clipboard?.readText !== "function") return { ok: false, reason: "missing" }
	try {
		return { ok: true, text: await clipboard.readText() }
	} catch {
		return { ok: false, reason: "refused" }
	}
}
