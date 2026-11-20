/**
 * Keeps keyboard focus inside an open modal, as `aria-modal="true"` promises:
 * focus moves in when it opens, Tab and Shift+Tab wrap around its own
 * controls, focus that lands behind it is pulled back, and when it closes
 * focus returns to whatever held it before.
 */

const FOCUSABLE = [
	"a[href]",
	"area[href]",
	"button:not([disabled])",
	"input:not([disabled]):not([type='hidden'])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"iframe",
	"[contenteditable]:not([contenteditable='false'])",
	"[tabindex]",
].join(",")

/** The elements inside `root` that Tab reaches, in document order. */
export function focusables(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
		(el) => el.tabIndex >= 0 && el.closest("[hidden], [inert]") === null,
	)
}

/**
 * Moves focus to `dialog` (which should carry `tabindex="-1"`) and holds it
 * there. Returns the release, which also gives focus back to the element
 * focused before.
 */
export function holdFocus(dialog: HTMLElement): () => void {
	const doc = dialog.ownerDocument
	const previous = doc.activeElement
	dialog.focus()

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key !== "Tab") return
		const items = focusables(dialog)
		const first = items[0]
		const last = items.at(-1)
		const active = doc.activeElement
		if (first === undefined || last === undefined) {
			event.preventDefault()
			dialog.focus()
			return
		}
		const outside = active === dialog || active === null || !dialog.contains(active)
		if (event.shiftKey && (outside || active === first)) {
			event.preventDefault()
			last.focus()
		} else if (!event.shiftKey && (outside || active === last)) {
			event.preventDefault()
			first.focus()
		}
	}

	const onFocusin = (event: FocusEvent) => {
		const target = event.target as Element | null
		if (target === null || dialog.contains(target)) return
		// Another modal opened over this one holds focus itself.
		if (target.closest?.('[aria-modal="true"]')) return
		dialog.focus()
	}

	doc.addEventListener("keydown", onKeydown)
	doc.addEventListener("focusin", onFocusin)

	return () => {
		doc.removeEventListener("keydown", onKeydown)
		doc.removeEventListener("focusin", onFocusin)
		if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
	}
}
