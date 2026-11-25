/**
 * The docked panel's width on larger screens. Its left edge is a handle: drag
 * it, or focus it and press the arrow keys, and the panel takes that width;
 * double-click it to go back to the default. Each panel remembers its own
 * width in `localStorage` under `frame:panel-width:<id>`, every access
 * wrapped, so a browser that refuses storage still resizes and only forgets.
 */

/** No panel is narrower than this. */
export const MIN_WIDTH = 360

/** The width a panel opens at before it has been resized. */
export const DEFAULT_WIDTH = 460

/** The editor holds more, so it opens wider. */
export const EDITOR_DEFAULT_WIDTH = 640

/** How far one arrow key press moves the edge. */
export const STEP = 16

type WidthStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

const keyFor = (id: string) => `frame:panel-width:${id}`

/** The share of the page a panel may take: 70% for the editor, 60% for the others. */
export function maxRatio(id: string): number {
	return id === "editor" ? 0.7 : 0.6
}

export function defaultWidth(id: string): number {
	return id === "editor" ? EDITOR_DEFAULT_WIDTH : DEFAULT_WIDTH
}

/** A whole pixel width no narrower than the floor and no wider than the panel's share of the page. */
export function clampWidth(width: number, viewport: number, id: string): number {
	return Math.round(Math.max(MIN_WIDTH, Math.min(width, viewport * maxRatio(id))))
}

export function readWidth(storage: WidthStorage | null, id: string): number | null {
	if (storage === null) return null
	try {
		const stored = Number(storage.getItem(keyFor(id)) ?? Number.NaN)
		return Number.isFinite(stored) && stored > 0 ? stored : null
	} catch {
		return null
	}
}

/** `null` forgets the width, handing the panel back to the default. */
export function writeWidth(storage: WidthStorage | null, id: string, width: number | null): void {
	if (storage === null) return
	try {
		if (width === null) storage.removeItem(keyFor(id))
		else storage.setItem(keyFor(id), String(width))
	} catch {
		// A browser that refuses storage keeps the width for this visit.
	}
}

/** The width a panel opens at: its remembered width, or the default, fitted to the page. */
export function initialWidth(storage: WidthStorage | null, id: string, viewport: number): number {
	return clampWidth(readWidth(storage, id) ?? defaultWidth(id), viewport, id)
}
