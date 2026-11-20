<script lang="ts">
import type { Action, Goal, Mode } from "#lib/combi/codec"
import type { Messages } from "#lib/i18n/messages"

import Chips from "#components/atoms/Chips.svelte"
import EntryIcon from "#components/atoms/EntryIcon.svelte"
import Field from "#components/molecules/Field.svelte"
import { episodeArt } from "#lib/combi/art"
import { ALL_ACTIONS, ALL_EPISODES } from "#lib/combi/codec"
import {
	type Draft,
	goalOptions,
	limitsFor,
	setAction,
	setEpisode,
	setFloor,
	setGoals,
	setMode,
	verdictOf,
} from "#lib/combi/draft"
import { ASSET_BASE, episodeNote, verdictText } from "#lib/combi/editor"
import { EPISODE_LABELS } from "#lib/combi/labels"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	onchange: (draft: Draft) => void
}

let { uid, draft, m, onchange }: Props = $props()

const limits = $derived(limitsFor(draft))
const manual = $derived(draft.picks.combi.mode === "manual")
const semi = $derived(verdictOf(draft)?.semi === true)

const modes = $derived(
	(["manual", "auto"] as const).map((value) => ({
		value,
		label: value === "auto" && semi ? m.combi.modes.semiauto : m.combi.modes[value],
	})),
)
const goals = $derived(goalOptions(draft).map((value) => ({ value, label: m.combi.goals[value] })))
const actions = $derived(ALL_ACTIONS.map((value) => ({ value, label: m.combi.actions[value] })))
const episodes = $derived(
	ALL_EPISODES.map((value) => ({
		value,
		name: value === "any" ? m.combi.describe.anyEpisode : EPISODE_LABELS[value],
		src: episodeArt(value, ASSET_BASE),
	})),
)

function floorInput(event: Event) {
	const text = (event.currentTarget as HTMLInputElement).value
	onchange(setFloor(draft, text === "" ? null : Number(text)))
}
</script>

<Field id="{uid}-mode" label={m.combi.describe.fields.mode} help={m.combi.help.mode} helpLabel={m.combi.editor.help}>
	<Chips
		label={m.combi.describe.fields.mode}
		options={modes}
		value={[draft.picks.combi.mode]}
		onchange={([mode]) => mode && onchange(setMode(draft, mode as Mode))} />
	<p class="verdict" aria-live="polite">{verdictText(draft, m)}</p>
</Field>

<Field id="{uid}-goal" label={m.combi.describe.fields.goal} help={m.combi.help.goal} helpLabel={m.combi.editor.help}>
	<Chips
		label={m.combi.describe.fields.goal}
		options={goals}
		value={draft.full.combi.goals}
		multiple
		onchange={(picked) => onchange(setGoals(draft, picked as Goal[]))} />
</Field>

<Field
	id="{uid}-episode"
	label={m.combi.describe.fields.episode}
	help={m.combi.help.episode}
	helpLabel={m.combi.editor.help}
	note={episodeNote(draft, m)}>
	<div class="episodes">
		{#each episodes as episode (episode.value)}
			<button
				type="button"
				class="cell"
				aria-label={episode.name}
				aria-pressed={draft.picks.combi.episode === episode.value}
				onclick={() => onchange(setEpisode(draft, episode.value))}>
				{#if episode.src}
					<EntryIcon src={episode.src} name={episode.name} size={40} />
				{/if}
				<span class="name" aria-hidden="true">{episode.name}</span>
			</button>
		{/each}
	</div>
</Field>

{#if limits.floor}
	<Field
		id="{uid}-floor"
		label={m.combi.describe.fields.floor}
		help={m.combi.help.floor}
		helpLabel={m.combi.editor.help}>
		<input
			class="floor"
			type="number"
			inputmode="numeric"
			min="1"
			max="100"
			aria-label={m.combi.editor.floorInput}
			placeholder={m.combi.describe.anyFloor}
			value={draft.picks.combi.floor ?? ""}
			onchange={floorInput}>
	</Field>
{/if}

<Field
	id="{uid}-action"
	label={m.combi.describe.fields.action}
	help={m.combi.help.action}
	helpLabel={m.combi.editor.help}
	note={manual ? m.combi.editor.autoOnlyAction : undefined}>
	<fieldset disabled={manual}>
		<Chips
			label={m.combi.describe.fields.action}
			options={actions}
			value={[draft.picks.combi.action]}
			onchange={([action]) => action && onchange(setAction(draft, action as Action))} />
	</fieldset>
</Field>

<style>
.verdict {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}

.verdict:empty {
	display: none;
}

fieldset {
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}

.episodes {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
	gap: 8px;
}

.cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	min-width: 0;
	min-height: 76px;
	padding: 6px 4px;
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
	color: var(--muted);
	font: inherit;
	font-size: 0.75rem;
	cursor: pointer;
}

.cell:hover {
	background: var(--hover);
}

.cell[aria-pressed="true"] {
	border-color: var(--accent);
	color: var(--text);
	box-shadow: inset 0 0 0 1px var(--accent);
}

.name {
	max-width: 100%;
	text-align: center;
	overflow-wrap: anywhere;
}

.floor {
	width: 10rem;
	min-height: 36px;
	padding: 6px 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
}

@media (pointer: coarse) {
	.floor {
		min-height: var(--tap);
	}
}
</style>
