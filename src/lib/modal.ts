/**
 * Keeps keyboard focus inside an open modal, as `aria-modal="true"` promises:
 * focus moves in when it opens, Tab and Shift+Tab wrap around its own
 * controls, focus that lands behind it is pulled back, and when it closes
 * focus returns to whatever held it before. Modals stack (Share over the
 * editor): only the topmost one handles Tab, focus and Escape.
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

/** Open modals, oldest first; only the last one in its document handles keys and focus. */
const stack: HTMLElement[] = []

const isTop = (dialog: HTMLElement) =>
	stack.findLast((entry) => entry.ownerDocument === dialog.ownerDocument) === dialog

/** Whether a modal is open in `doc`; the frame's own Escape handling stands aside while one is. */
export function isModalOpen(doc: Document): boolean {
	return stack.some((entry) => entry.ownerDocument === doc)
}

/**
 * Moves focus to `dialog` (which should carry `tabindex="-1"`) and holds it
 * there while it is the topmost open modal: a modal opened over it takes
 * over Tab, focus and Escape until it closes. Escape calls `onescape` unless
 * something inside already handled it (`defaultPrevented`), and marks the
 * event handled. Returns the release, which also gives focus back to the
 * element focused before.
 */
export function holdFocus(dialog: HTMLElement, onescape?: () => void): () => void {
	const doc = dialog.ownerDocument
	const previous = doc.activeElement as HTMLElement | null
	stack.push(dialog)
	dialog.focus()

	const onTab = (event: KeyboardEvent) => {
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

	const onKeydown = (event: KeyboardEvent) => {
		if (!isTop(dialog)) return
		if (event.key === "Tab") onTab(event)
		else if (event.key === "Escape" && onescape !== undefined && !event.defaultPrevented) {
			event.preventDefault()
			onescape()
		}
	}

	const onFocusin = (event: FocusEvent) => {
		const target = event.target as Node | null
		if (!isTop(dialog) || target === null || dialog.contains(target)) return
		dialog.focus()
	}

	doc.addEventListener("keydown", onKeydown)
	doc.addEventListener("focusin", onFocusin)

	return () => {
		const at = stack.lastIndexOf(dialog)
		if (at !== -1) stack.splice(at, 1)
		doc.removeEventListener("keydown", onKeydown)
		doc.removeEventListener("focusin", onFocusin)
		if (previous?.isConnected && typeof previous.focus === "function") previous.focus()
	}
}
