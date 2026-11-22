<script lang="ts">
import type { RunStats } from "#lib/combi/stats"

import { onDestroy } from "svelte"

import Toast from "#components/atoms/Toast.svelte"
import { copyText } from "#lib/clipboard"
import { combiSectionOf } from "#lib/combi/full-code"
import { descriptionTitle } from "#lib/combi/saved"
import { shareHashFor } from "#lib/combi/state"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, onLangChange } from "#lib/lang"

interface Props {
	/** What to share. */
	entry: { code: string; note: string; stats: RunStats }
}

let { entry }: Props = $props()

/** Unique per mount: a row's box and the editor's can be on the page together. */
const uid = $props.id()

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

const link = $derived(`${location.origin}${location.pathname}${shareHashFor(entry.code, entry.note, entry.stats)}`)
const canShare = typeof navigator.share === "function"

let toast = $state<{ message: string; tone: "info" | "error" } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

const say = (message: string, tone: "info" | "error") => {
	toast = { message, tone }
	clearTimeout(timer)
	timer = setTimeout(() => (toast = null), 4000)
}

onDestroy(() => clearTimeout(timer))

// A notice belongs to the entry it was about: another entry drops it.
$effect.pre(() => {
	void entry
	clearTimeout(timer)
	toast = null
})

/** Selects a value's text, so it can be copied by hand when the clipboard says no. */
const select = (element: HTMLElement | undefined) => {
	if (element === undefined) return
	try {
		window.getSelection()?.selectAllChildren(element)
	} catch {}
}

const copy = async (text: string, element: HTMLElement | undefined) => {
	if (await copyText(text)) say(m.combi.share.copied, "info")
	else {
		select(element)
		say(m.combi.share.copyFailed, "error")
	}
}

const shareToApp = () => {
	if (typeof navigator.share !== "function") return
	const note = descriptionTitle(entry.note)
	navigator
		.share({ title: combiSectionOf(entry.code), ...(note === "" ? {} : { text: note }), url: link })
		// The visitor cancelling is not an error worth a word.
		.catch(() => {})
}

let linkValue = $state<HTMLElement>()
let codeValue = $state<HTMLElement>()
</script>

<!-- In place, where Share was pressed: the editor's header, or a saved row. Never a pop-up. -->
<section class="share" aria-labelledby="{uid}-title">
	<h3 id="{uid}-title" class="title">{m.combi.share.title}</h3>
	<section class="box" aria-labelledby="{uid}-link">
		<h4 id="{uid}-link">{m.combi.share.link}</h4>
		<p class="value" bind:this={linkValue}>{link}</p>
		<div row class="acts">
			<button
				type="button"
				class="btn primary"
				aria-label={m.combi.share.copyLink}
				onclick={() => copy(link, linkValue)}>
				{m.combi.share.copy}
			</button>
			{#if canShare}
				<button type="button" class="btn" onclick={shareToApp}>{m.combi.share.shareToApp}</button>
			{/if}
		</div>
	</section>
	<section class="box" aria-labelledby="{uid}-full">
		<h4 id="{uid}-full">{m.combi.share.fullCode}</h4>
		<p class="value code" bind:this={codeValue}>{entry.code}</p>
		<div row class="acts">
			<button
				type="button"
				class="btn primary"
				aria-label={m.combi.share.copyFull(entry.code)}
				onclick={() => copy(entry.code, codeValue)}>
				{m.combi.share.copy}
			</button>
		</div>
	</section>
	<Toast message={toast?.message ?? null} tone={toast?.tone ?? "info"} ondismiss={() => (toast = null)} />
</section>

<style>
.share {
	gap: 16px;
	padding: 14px;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
}

.title {
	margin: 0;
	font-size: 0.9375rem;
}

.box {
	gap: 8px;
}

h4 {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
	font-weight: 600;
}

.value {
	margin: 0;
	padding: 10px;
	border-radius: var(--radius);
	background: var(--hover);
	color: var(--text);
	font-size: 0.8125rem;
	overflow-wrap: anywhere;
	user-select: all;
}

.value.code {
	font-family: var(--mono);
}

.acts {
	flex-wrap: wrap;
	gap: 8px;
}

.btn {
	min-height: 36px;
	padding: 6px 14px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

@media (pointer: coarse) {
	.btn {
		min-height: var(--tap);
	}
}

.btn:hover {
	background: var(--hover);
}

.btn.primary {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--on-accent);
}
</style>
