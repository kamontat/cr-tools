<script lang="ts">
import { onDestroy } from "svelte"

import Button from "#components/atoms/Button.svelte"
import CodeTiles from "#components/atoms/CodeTiles.svelte"
import Surface from "#components/atoms/Surface.svelte"
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
				<Surface element="li" class="entry">
					<CodeTiles code={combiSectionOf(entry.code)} />
					<LoadoutIcons loadout={rowLoadout(entry.code)} size={24} />
					{#if descriptionTitle(entry.description) !== ""}
						<span class="note">{descriptionTitle(entry.description)}</span>
					{/if}
					<Button aria-label={m.combi.share.copyFull(combiSectionOf(entry.code))} onclick={() => copy(entry.code)}>
						{m.combi.share.copy}
					</Button>
				</Surface>
			{/each}
		</ul>
	</section>
	<Toast message={toast?.message ?? null} tone={toast?.tone ?? "info"} ondismiss={() => (toast = null)} />
{/if}

<style>
.saved {
	margin: 0 0 calc(var(--pad) * 1.5);
}

.head {
	align-items: baseline;
	justify-content: space-between;
	gap: var(--gap);
	margin-bottom: var(--stack);
}

h2 {
	margin: 0;
	font-family: var(--font-head);
	font-size: 1rem;
	font-weight: 500;
}

a {
	color: var(--accent);
	font-size: 0.875rem;
}

ul {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
	gap: var(--gap);
	margin: 0;
	padding: 0;
	list-style: none;
}

ul > :global(.entry) {
	align-items: flex-start;
	min-width: 0;
}

ul > :global(.entry > .tiles) {
	width: 100%;
}

.note {
	max-width: 100%;
	overflow: hidden;
	color: var(--muted);
	font-size: 0.875rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
