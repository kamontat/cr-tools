<script lang="ts">
import type { SavedCode } from "#lib/combi/saved"
import type { Messages } from "#lib/i18n/messages"

import { LOCAL_LIMIT, localUse, savedCounts, usageText } from "#lib/combi/backup"
import { currentLang, type Lang, LOCALES, onLangChange } from "#lib/lang"

interface Props {
	entries: readonly SavedCode[]
	m: Messages
	/** Where the saved codes live; null when the browser refuses it. */
	store: Storage | null
	/** Changes when something was added or deleted, so the numbers are read again. */
	refresh: number
}

let { entries, m, store, refresh }: Props = $props()

let lang = $state<Lang>(currentLang(document))
$effect(() => onLangChange(document, (next) => (lang = next)))

const locale = $derived(LOCALES[lang])
const t = $derived(m.settings.data)
const counts = $derived(savedCounts(entries))
const local = $derived.by(() => {
	void refresh
	void entries
	return usageText(localUse(store), LOCAL_LIMIT, locale)
})

let estimate = $state<{ usage: number; quota: number } | null>(null)

$effect(() => {
	void refresh
	void entries
	let current = true
	const storage = typeof navigator === "undefined" ? undefined : navigator.storage
	if (typeof storage?.estimate !== "function") {
		estimate = null
		return
	}
	storage
		.estimate()
		.then((found) => {
			if (current) {
				estimate =
					typeof found.usage === "number" && typeof found.quota === "number"
						? { usage: found.usage, quota: found.quota }
						: null
			}
		})
		.catch(() => {
			if (current) estimate = null
		})
	return () => {
		current = false
	}
})

const site = $derived(estimate === null ? null : usageText(estimate.usage, estimate.quota, locale))
const line = (use: { used: string; limit: string; percent: string }) => `${use.used} / ${use.limit} (${use.percent})`
const day = (time: number | null) =>
	time === null ? "-" : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(time)
</script>

<dl class="storage">
	<div class="item">
		<dt>{t.counts.codes}</dt>
		<dd>{counts.codes}</dd>
	</div>
	<div class="item">
		<dt>{t.counts.rounds}</dt>
		<dd>{counts.rounds}</dd>
	</div>
	<div class="item">
		<dt>{t.counts.withRounds}</dt>
		<dd>{counts.withRounds}</dd>
	</div>
	<div class="item">
		<dt>{t.counts.withNote}</dt>
		<dd>{counts.withNote}</dd>
	</div>
	<div class="item">
		<dt>{t.counts.first}</dt>
		<dd>{day(counts.first)}</dd>
	</div>
	<div class="item">
		<dt>{t.counts.last}</dt>
		<dd>{day(counts.last)}</dd>
	</div>
	<div class="item">
		<dt>{t.localStorage}</dt>
		<dd>{line(local)}</dd>
	</div>
	<div class="item">
		<dt>{t.siteStorage}</dt>
		<dd>{site === null ? t.notReported : line(site)}</dd>
	</div>
</dl>
<p class="note">{t.approximate}</p>

<style>
.storage {
	margin: 0;
}

.item {
	display: flex;
	flex-flow: row wrap;
	justify-content: space-between;
	gap: 12px;
	padding: 6px 0;
	border-bottom: 1px solid var(--line);
}

dt {
	color: var(--muted);
}

dd {
	margin: 0;
	text-align: right;
	overflow-wrap: anywhere;
}

.note {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}
</style>
