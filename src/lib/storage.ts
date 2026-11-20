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
