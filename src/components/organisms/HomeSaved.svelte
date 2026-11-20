<script lang="ts">
import { onDestroy } from "svelte"

import Toast from "#components/atoms/Toast.svelte"
import LoadoutIcons from "#components/molecules/LoadoutIcons.svelte"
import { copyText } from "#lib/clipboard"
import { combiSectionOf } from "#lib/combi/full-code"
import { rowLoadout } from "#lib/combi/list"
import { descriptionTitle, readSaved } from "#lib/combi/saved"
import { messagesFor } from "#lib/i18n/messages"
import { currentLang, type Lang, onLangChange } from "#lib/lang"
import { localStore } from "#lib/storage"

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

const store = localStore()
const latest = (store === null ? [] : readSaved(store)).slice(0, 3)

let toast = $state<{ message: string; tone: "info" | "error" } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

const say = (message: string, tone: "info" | "error") => {
	toast = { message, tone }
	clearTimeout(timer)
	timer = setTimeout(() => (toast = null), 4000)
}

onDestroy(() => clearTimeout(timer))

const copy = async (code: string) => {
	const text = combiSectionOf(code)
	if (await copyText(text)) say(m.combi.notices.copied(text), "info")
	else say(m.combi.notices.copyBlocked(text), "error")
}
</script>

{#if latest.length > 0}
	<section class="saved" aria-labelledby="home-saved-title">
		<div row class="head">
			<h2 id="home-saved-title">{m.home.saved.title}</h2>
			<a href="/combi-name/">{m.home.saved.seeAll}</a>
		</div>
		<ul>
			{#each latest as entry (entry.code)}
				<li>
					<span class="code">{combiSectionOf(entry.code)}</span>
					<LoadoutIcons loadout={rowLoadout(entry.code)} size={24} />
					{#if descriptionTitle(entry.description) !== ""}
						<span class="note">{descriptionTitle(entry.description)}</span>
					{/if}
					<button
						type="button"
						aria-label={m.combi.share.copyFull(combiSectionOf(entry.code))}
						onclick={() => copy(entry.code)}>
						{m.combi.share.copy}
					</button>
				</li>
			{/each}
		</ul>
	</section>
	<Toast message={toast?.message ?? null} tone={toast?.tone ?? "info"} ondismiss={() => (toast = null)} />
{/if}

<style>
.saved {
	margin: 0 0 20px;
}

.head {
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 8px;
}

h2 {
	margin: 0;
	font-size: 1rem;
}

a {
	color: var(--accent);
	font-size: 0.875rem;
}

ul {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
	gap: 12px;
	margin: 0;
	padding: 0;
	list-style: none;
}

li {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
}

.code {
	color: var(--code);
	font-family: var(--mono);
	font-weight: 600;
	letter-spacing: 0.1em;
}

.note {
	max-width: 100%;
	overflow: hidden;
	color: var(--muted);
	font-size: 0.875rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}

button {
	min-height: 32px;
	padding: 4px 12px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

button:hover {
	background: var(--hover);
}

@media (pointer: coarse) {
	button {
		min-height: var(--tap);
	}
}
</style>
