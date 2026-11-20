import type { Lang } from "#lib/lang"

import { en } from "#lib/i18n/en"
import { th } from "#lib/i18n/th"

export type Messages = typeof en

export type Pick = (m: Messages) => string

export function messagesFor(lang: Lang): Messages {
	return lang === "en" ? en : th
}

/** One string in each language, for a value rendered once and swapped on `langchange`. */
export function both(pick: Pick): Record<Lang, string> {
	return { th: pick(th), en: pick(en) }
}

/**
 * Attributes for an element whose `name` attribute changes with the language.
 * Thai is the attribute's own value, matching the HTML's default language;
 * `localizeAttrs` copies the `data-<name>-<lang>` pair over it on a switch.
 */
export function l10nAttr(name: string, pick: Pick): Record<string, string> {
	const { th: thai, en: english } = both(pick)
	return { [name]: thai, [`data-${name}-th`]: thai, [`data-${name}-en`]: english, "data-l10n": "" }
}
