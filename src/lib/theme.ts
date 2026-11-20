import { localStore, readKey, writeKey } from "#lib/storage"

export type Theme = "system" | "dark" | "light"

export const THEME_KEY = "theme"

export function readTheme(store: Storage | null = localStore()): Theme {
	const value = readKey(THEME_KEY, store)
	return value === "dark" || value === "light" ? value : "system"
}

/** `"system"` removes the key, so the operating system decides again. */
export function writeTheme(theme: Theme, store: Storage | null = localStore()): void {
	writeKey(THEME_KEY, theme === "system" ? null : theme, store)
}

export function applyTheme(theme: Theme, root: HTMLElement): void {
	if (theme === "system") root.removeAttribute("data-theme")
	else root.setAttribute("data-theme", theme)
}
