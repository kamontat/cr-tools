/**
 * The frame's left sidebar: which shape it takes at a width, and the ☰ toggle
 * that opens and closes it. The state lives on `<body data-sidebar>`, which
 * the frame's CSS reads; `AppLayout` calls `initFrame` once per page.
 */

import type { ToolSlug } from "#lib/tools"

import { readKey, writeKey } from "#lib/storage"

/** Which sidebar link is the current page. */
export type FramePage = "home" | "settings" | ToolSlug

export const SIDEBAR_KEY = "frame:sidebar"

/** `AppLayout`'s pre-paint boot script takes this breakpoint and the key above through `define:vars`. */
export const FULL_MIN_WIDTH = 1100
export const RAIL_MIN_WIDTH = 700

/**
 * - `drawer` (phones): hidden; open slides it in over the page with a scrim.
 * - `rail`: a 60px icon rail; open lays the full sidebar over the page.
 * - `full`: open is the full sidebar, closed the rail; the only mode remembered.
 */
export type SidebarMode = "drawer" | "rail" | "full"

export function sidebarMode(width: number): SidebarMode {
	if (width < RAIL_MIN_WIDTH) return "drawer"
	if (width < FULL_MIN_WIDTH) return "rail"
	return "full"
}

/**
 * Wires ☰ (`#menu-toggle`), the sidebar (`#sidebar`) and its scrim
 * (`#sidebar-scrim`). Open by default in `full` mode unless the visitor
 * closed it there before; closed in the others. Crossing a breakpoint resets
 * to the new mode's default. The overlay modes close on the scrim, on Escape
 * (focus returns to ☰) and when a sidebar link is followed.
 */
export function initFrame(doc: Document, store: Storage | null): void {
	const win = doc.defaultView
	const toggle = doc.getElementById("menu-toggle")
	if (win === null || toggle === null) return

	let mode = sidebarMode(win.innerWidth)

	const isOpen = () => doc.body.getAttribute("data-sidebar") === "open"
	const defaultOpen = () => mode === "full" && readKey(SIDEBAR_KEY, store) !== "closed"

	const set = (open: boolean, remember: boolean) => {
		doc.body.setAttribute("data-sidebar", open ? "open" : "closed")
		toggle.setAttribute("aria-expanded", String(open))
		if (remember && mode === "full") writeKey(SIDEBAR_KEY, open ? "open" : "closed", store)
	}

	set(defaultOpen(), false)

	toggle.addEventListener("click", () => set(!isOpen(), true))

	const sidebar = doc.getElementById("sidebar")
	const scrim = doc.getElementById("sidebar-scrim")
	// A press on the (unfocusable) scrim would otherwise blur to <body> before
	// the click, losing where focus was.
	scrim?.addEventListener("mousedown", (event) => event.preventDefault())
	scrim?.addEventListener("click", () => {
		const focusInside = sidebar?.contains(doc.activeElement) === true
		set(false, false)
		if (focusInside) toggle.focus()
	})

	sidebar?.addEventListener("click", (event) => {
		if (mode === "full" || !isOpen()) return
		const target = event.target as Element | null
		if (target?.closest("a[href]")) set(false, false)
	})

	doc.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || mode === "full" || !isOpen()) return
		set(false, false)
		toggle.focus()
	})

	win.addEventListener("resize", () => {
		const next = sidebarMode(win.innerWidth)
		if (next === mode) return
		mode = next
		set(defaultOpen(), false)
	})
}
