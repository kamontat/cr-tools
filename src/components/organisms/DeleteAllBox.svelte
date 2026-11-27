<script lang="ts">
import type { Messages } from "#lib/i18n/messages"

import Button from "#components/atoms/Button.svelte"
import Overlay from "#components/molecules/Overlay.svelte"
import { clearSaved } from "#lib/combi/saved"

interface Props {
	store: Storage
	/** How many codes are saved now. */
	count: number
	m: Messages
	ondeleted: () => void
}

let { store, count, m, ondeleted }: Props = $props()

const t = $derived(m.settings.data)

/** The confirm dialog is open. */
let asking = $state(false)
let notice = $state<{ text: string; tone: "info" | "error" } | null>(null)

// The result belongs to the list it was about: codes saved again drop it.
let before = count
$effect(() => {
	if (count > before && notice?.tone === "info") notice = null
	before = count
})

const remove = () => {
	asking = false
	const was = count
	const result = clearSaved(store)
	if (!result.stored) {
		notice = { text: t.notStored, tone: "error" }
		return
	}
	notice = { text: t.deleted(was), tone: "info" }
	ondeleted()
}
</script>

<section class="delete">
	{#if count === 0}
		<p class="line" role={notice === null ? undefined : "status"}>{notice?.text ?? t.nothingSaved}</p>
	{:else}
		<p class="line">{t.deleteWarning(count)}</p>
		<div row class="acts">
			<Button variant="danger" onclick={() => (asking = true)}>{t.deleteButton}</Button>
		</div>
		{#if notice !== null}
			<p class="line" class:error={notice.tone === "error"} role={notice.tone === "error" ? "alert" : "status"}>
				{notice.text}
			</p>
		{/if}
	{/if}
</section>

<!-- Cannot be undone, so it asks in the danger dialog, which starts on Cancel. -->
{#if asking}
	<Overlay
		kind="dialog"
		danger
		id="delete-all"
		title={t.deleteTitle(count)}
		open={true}
		onclose={() => (asking = false)}
		closeLabel={m.frame.close}
		focus=".overlay-foot .btn.ghost">
		<p class="line">{t.deleteWarning(count)}</p>
		{#snippet footer()}
			<Button variant="ghost" onclick={() => (asking = false)}>{m.frame.cancel}</Button>
			<Button variant="danger" onclick={remove}>{t.deleteButton}</Button>
		{/snippet}
	</Overlay>
{/if}

<style>
/* A section, not a div: the reset lays out only divs as columns, so this says it itself. */
.delete {
	display: flex;
	flex-direction: column;
	gap: var(--gap);
}

.line {
	margin: 0;
	overflow-wrap: anywhere;
}

.line.error {
	color: var(--danger);
}

.acts {
	flex-wrap: wrap;
	gap: var(--stack);
}
</style>
