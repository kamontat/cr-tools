import { localStore, readKey, writeKey } from "#lib/storage"

export type Lang = "th" | "en"

export const LANGS: readonly Lang[] = ["th", "en"]

export const DEFAULT_LANG: Lang = "th"

export const LANG_KEY = "lang"

/** Each language named in itself, so a visitor can find theirs whatever the page says. */
export const LANG_NAMES: Record<Lang, string> = { th: "ไทย", en: "English" }

/** Thai months with the Gregorian year (2026, not 2569). */
export const LOCALES: Record<Lang, string> = { th: "th-TH-u-ca-gregory", en: "en-US" }

export function isLang(value: unknown): value is Lang {
	return value === "th" || value === "en"
}

export function readLang(store: Storage | null = localStore()): Lang {
	const value = readKey(LANG_KEY, store)
	return isLang(value) ? value : DEFAULT_LANG
}

/** Writes Thai too: the default is not "absent", so a later default change cannot flip a visitor who chose Thai. */
export function writeLang(lang: Lang, store: Storage | null = localStore()): void {
	writeKey(LANG_KEY, lang, store)
}

export function currentLang(doc: Document): Lang {
	const value = doc.documentElement.lang
	return isLang(value) ? value : DEFAULT_LANG
}

/** For each `[data-l10n]` element, copies every `data-<name>-<lang>` attribute to `<name>`. */
export function localizeAttrs(doc: Document, lang: Lang): void {
	const suffix = `-${lang}`
	for (const element of doc.querySelectorAll("[data-l10n]")) {
		for (const attr of Array.from(element.attributes)) {
			if (!attr.name.startsWith("data-") || !attr.name.endsWith(suffix)) continue
			const name = attr.name.slice("data-".length, -suffix.length)
			if (name !== "") element.setAttribute(name, attr.value)
		}
	}
}

export function applyLang(lang: Lang, doc: Document): void {
	const root = doc.documentElement
	root.lang = lang
	const title = root.getAttribute(`data-title-${lang}`)
	if (title !== null) doc.title = title
	localizeAttrs(doc, lang)
	doc.dispatchEvent(new CustomEvent("langchange", { detail: lang }))
}

/** Returns the unsubscribe. */
export function onLangChange(doc: Document, listener: (lang: Lang) => void): () => void {
	const handler = (event: Event) => {
		const detail = (event as CustomEvent<unknown>).detail
		if (isLang(detail)) listener(detail)
	}
	doc.addEventListener("langchange", handler)
	return () => doc.removeEventListener("langchange", handler)
}
