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
