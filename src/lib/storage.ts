/**
 * Safe `localStorage`: reaching it can throw (Safari private mode, blocked
 * site data), so every access goes through here and falls back quietly.
 */
export function localStore(): Storage | null {
	try {
		return window.localStorage
	} catch {
		return null
	}
}

export function readKey(key: string, store: Storage | null = localStore()): string | null {
	if (store === null) return null
	try {
		return store.getItem(key)
	} catch {
		return null
	}
}

/** `null` removes the key. Returns false when there is no store or the write throws. */
export function writeKey(key: string, value: string | null, store: Storage | null = localStore()): boolean {
	if (store === null) return false
	try {
		if (value === null) store.removeItem(key)
		else store.setItem(key, value)
		return true
	} catch {
		return false
	}
}

/** Stands in for a browser that keeps nothing, so a page still works for this visit. */
export function memoryStore(): Storage {
	const items = new Map<string, string>()
	return {
		get length() {
			return items.size
		},
		clear: () => items.clear(),
		getItem: (key) => items.get(key) ?? null,
		key: (index) => [...items.keys()][index] ?? null,
		removeItem: (key) => void items.delete(key),
		setItem: (key, value) => void items.set(key, String(value)),
	}
}
