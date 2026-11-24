<script lang="ts">
import type { Messages } from "#lib/i18n/messages"

import Field from "#components/molecules/Field.svelte"
import TreasureSlot from "#components/organisms/TreasureSlot.svelte"
import { type Draft, setOrdered, setTreasureSlot } from "#lib/combi/draft"
import { carriedTreasures, entryOf, entryOptions } from "#lib/combi/editor"
import { MAX_TREASURE_SLOTS } from "#lib/combi/loadout"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	onchange: (draft: Draft) => void
}

let { uid, draft, m, onchange }: Props = $props()

const ordered = $derived(draft.picks.loadout.ordered)
const options = $derived(entryOptions("treasures", carriedTreasures(draft)))
const slots = $derived(
	Array.from({ length: MAX_TREASURE_SLOTS }, (_, at) =>
		(draft.picks.loadout.treasures[at] ?? []).map((pick) => ({
			...entryOf("treasures", pick.id),
			levels: pick.levels,
		})),
	),
)
const labels = $derived({
	add: m.combi.editor.addTreasure,
	remove: m.combi.editor.removeTreasure,
	search: m.combi.editor.search,
	noMatch: m.combi.editor.noMatch,
	allLevels: m.combi.editor.allLevels,
	level: m.combi.editor.level,
})
</script>

<Field
	id="{uid}-treasures"
	label={m.combi.describe.fields.treasures}
	help="{m.combi.help.treasures} {m.combi.help.treasureOrder}"
	helpLabel={m.combi.editor.help}>
	{#snippet action()}
		<label class="switch">
			<input
				type="checkbox"
				name="exact-order"
				role="switch"
				aria-checked={ordered}
				checked={ordered}
				onchange={(event) => onchange(setOrdered(draft, event.currentTarget.checked))}>
			<span class="track" aria-hidden="true"></span>
			<span>{m.combi.editor.exactOrder}</span>
		</label>
	{/snippet}
	{#each slots as picks, at (at)}
		<TreasureSlot
			index={at + 1}
			label={ordered ? m.combi.editor.slot(at + 1) : m.combi.editor.anySlot}
			{picks}
			{options}
			{labels}
			onchange={(next) => onchange(setTreasureSlot(draft, at, next))} />
	{/each}
</Field>

<style>
.switch {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 32px;
	color: var(--muted);
	font-size: 0.8125rem;
	font-weight: 600;
	cursor: pointer;
}

/* The box stays in the page for keyboards and readers; the track draws it. */
.switch input {
	position: absolute;
	inset: 0;
	margin: 0;
	opacity: 0;
	cursor: pointer;
}

.track {
	position: relative;
	flex: none;
	width: 34px;
	height: 20px;
	border: 1px solid var(--line);
	border-radius: 999px;
	background: var(--hover);
	transition: background 0.15s;
}

.track::after {
	content: "";
	position: absolute;
	top: 2px;
	left: 2px;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: var(--muted);
	transition: transform 0.15s;
}

.switch input:checked + .track {
	border-color: var(--accent);
	background: var(--accent);
}

.switch input:checked + .track::after {
	background: var(--on-accent);
	transform: translateX(14px);
}

.switch input:checked ~ span:last-child {
	color: var(--text);
}

.switch input:focus-visible + .track {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}
</style>
