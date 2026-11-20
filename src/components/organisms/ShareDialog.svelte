<script lang="ts">
import type { RunStats } from "#lib/combi/stats"

import { onDestroy } from "svelte"

import Toast from "#components/atoms/Toast.svelte"
import Panel from "#components/molecules/Panel.svelte"
import { combiSectionOf } from "#lib/combi/full-code"
import { descriptionTitle } from "#lib/combi/saved"
import { shareHashFor } from "#lib/combi/state"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, onLangChange } from "#lib/lang"

interface Props {
	/** What to share; null keeps the dialog closed. */
	entry: { code: string; note: string; stats: RunStats } | null
	onclose: () => void
}

let { entry, onclose }: Props = $props()

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

const link = $derived(
	entry === null ? "" : `${location.origin}${location.pathname}${shareHashFor(entry.code, entry.note, entry.stats)}`,
)
const canShare = typeof navigator.share === "function"

let toast = $state<{ message: string; tone: "info" | "error" } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

const say = (message: string, tone: "info" | "error") => {
	toast = { message, tone }
	clearTimeout(timer)
	timer = setTimeout(() => (toast = null), 4000)
}

onDestroy(() => clearTimeout(timer))

/** Selects a value's text, so it can be copied by hand when the clipboard says no. */
const select = (element: HTMLElement | undefined) => {
	if (element === undefined) return
	try {
		window.getSelection()?.selectAllChildren(element)
	} catch {}
}

const copy = async (text: string, element: HTMLElement | undefined) => {
	try {
		if (typeof navigator.clipboard?.writeText !== "function") throw new Error("no clipboard")
		await navigator.clipboard.writeText(text)
		say(m.combi.share.copied, "info")
	} catch {
		select(element)
		say(m.combi.share.copyFailed, "error")
	}
}

const shareToApp = () => {
	if (entry === null || typeof navigator.share !== "function") return
	const note = descriptionTitle(entry.note)
	navigator
		.share({ title: combiSectionOf(entry.code), ...(note === "" ? {} : { text: note }), url: link })
		// The visitor cancelling is not an error worth a word.
		.catch(() => {})
}

let linkValue = $state<HTMLElement>()
let codeValue = $state<HTMLElement>()
</script>

<Panel
	id="share"
	title={m.combi.share.title}
	open={entry !== null}
	{onclose}
	closeLabel={m.frame.close}
	resizeLabel={m.frame.resize}>
	{#if entry !== null}
		<div class="share">
			<p class="share-code">{combiSectionOf(entry.code)}</p>
			<section class="box" aria-labelledby="share-link">
				<h3 id="share-link">{m.combi.share.link}</h3>
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
			<section class="box" aria-labelledby="share-full">
				<h3 id="share-full">{m.combi.share.fullCode}</h3>
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
		</div>
		<Toast message={toast?.message ?? null} tone={toast?.tone ?? "info"} ondismiss={() => (toast = null)} />
	{/if}
</Panel>

<style>
.share {
	gap: 14px;
	padding: 16px 20px 24px;
}

.share-code {
	margin: 0;
	color: var(--code);
	font-family: var(--mono);
	font-size: 1.375rem;
	font-weight: 600;
	letter-spacing: 0.1em;
}

.box {
	gap: 8px;
	padding: 14px;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
}

h3 {
	margin: 0;
	font-size: 0.875rem;
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
