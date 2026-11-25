<script lang="ts">
import type { Messages } from "#lib/i18n/messages"

import { clearSaved } from "#lib/combi/saved"

interface Props {
	store: Storage
	/** How many codes are saved now. */
	count: number
	m: Messages
	ondeleted: () => void
}

let { store, count, m, ondeleted }: Props = $props()

const uid = $props.id()
const t = $derived(m.settings.data)

let typed = $state("")
let notice = $state<{ text: string; tone: "info" | "error" } | null>(null)

// The result belongs to the list it was about: codes saved again drop it.
let before = count
$effect(() => {
	if (count > before && notice?.tone === "info") notice = null
	before = count
})

const ready = $derived(typed.trim().toLowerCase() === t.deleteWord.toLowerCase())

const remove = () => {
	if (!ready) return
	const was = count
	const result = clearSaved(store)
	if (!result.stored) {
		notice = { text: t.notStored, tone: "error" }
		return
	}
	typed = ""
	notice = { text: t.deleted(was), tone: "info" }
	ondeleted()
}
</script>

<section class="delete">
	{#if count === 0}
		<p class="line" role={notice === null ? undefined : "status"}>{notice?.text ?? t.nothingSaved}</p>
	{:else}
		<p class="line">{t.deleteWarning(count)}</p>
		<label class="field" for="{uid}-word">{t.deletePrompt(t.deleteWord)}</label>
		<input
			id="{uid}-word"
			name="delete-word"
			type="text"
			class="input"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			bind:value={typed}>
		<div row class="acts">
			<button type="button" class="btn danger" disabled={!ready} onclick={remove}>{t.deleteButton}</button>
		</div>
		{#if notice !== null}
			<p class="line" class:error={notice.tone === "error"} role={notice.tone === "error" ? "alert" : "status"}>
				{notice.text}
			</p>
		{/if}
	{/if}
</section>

<style>
/* A section, not a div: the reset lays out only divs as columns, so this says it itself. */
.delete {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.line {
	margin: 0;
	overflow-wrap: anywhere;
}

.line.error {
	color: var(--danger);
}

.field {
	font-weight: 600;
}

.input {
	width: 100%;
	padding: 8px 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
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

.btn.danger {
	border-color: var(--danger);
	background: var(--danger);
	color: #fff;
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
