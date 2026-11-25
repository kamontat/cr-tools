/**
 * Saves `text` as a file the browser downloads, by clicking a temporary
 * `<a download>` on a `Blob`. Returns false when the browser refuses or has no
 * way to — it never throws, so a caller only chooses what to say.
 */
export function downloadText(name: string, text: string, type = "application/json", doc: Document = document): boolean {
	let href: string | null = null
	let anchor: HTMLAnchorElement | null = null
	try {
		href = URL.createObjectURL(new Blob([text], { type }))
		anchor = doc.createElement("a")
		anchor.href = href
		anchor.download = name
		anchor.hidden = true
		doc.body.append(anchor)
		anchor.click()
		return true
	} catch {
		return false
	} finally {
		anchor?.remove()
		if (href !== null) {
			const kept = href
			// Safari and older Firefox cancel a download whose URL is revoked at once.
			setTimeout(() => {
				try {
					URL.revokeObjectURL(kept)
				} catch {
					// Nothing to free if the browser never kept it.
				}
			}, 0)
		}
	}
}
