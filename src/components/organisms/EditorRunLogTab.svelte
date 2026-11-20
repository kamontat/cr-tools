<script lang="ts">
import type { Issue } from "#lib/combi/issues"
import type { Messages } from "#lib/i18n/messages"

import { untrack } from "svelte"

import Field from "#components/molecules/Field.svelte"
import { type Draft, setNote, setStat } from "#lib/combi/draft"
import { issueText } from "#lib/combi/issues"
import { DESCRIPTION_MAX } from "#lib/combi/saved"
import { formatStat, parseStat, STAT_FIELDS, type StatField, type StatsDraft } from "#lib/combi/stats"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	onchange: (draft: Draft) => void
}

let { uid, draft, m, onchange }: Props = $props()

const shown = (stats: StatsDraft, field: StatField): string => {
	const value = stats[field]
	return value === undefined ? "" : formatStat(value)
}

/**
 * What each box holds. A box keeps what was typed — an unfinished range, or
 * "12,000" — and takes the draft's value only when the draft's stat changes
 * from elsewhere (another code typed, a reset), which `synced` tells apart.
 */
const initial = Object.fromEntries(STAT_FIELDS.map((field) => [field, shown(draft.stats, field)])) as Record<
	StatField,
	string
>
let texts = $state<Record<StatField, string>>({ ...initial })
let errors = $state<Partial<Record<StatField, Issue>>>({})
const synced: Record<StatField, string> = { ...initial }

$effect(() => {
	const stats = draft.stats
	untrack(() => {
		for (const field of STAT_FIELDS) {
			const now = shown(stats, field)
			if (now === synced[field]) continue
			synced[field] = now
			texts[field] = now
			delete errors[field]
		}
	})
})

function statInput(field: StatField, text: string) {
	texts[field] = text
	const read = parseStat(field, text)
	if (!read.ok) {
		errors[field] = read.issue
		return
	}
	delete errors[field]
	synced[field] = read.value === null ? "" : formatStat(read.value)
	onchange(setStat(draft, field, read.value))
}
</script>

<Field id="{uid}-note" label={m.combi.editor.note} help={m.combi.help.note} helpLabel={m.combi.editor.help}>
	<textarea
		aria-label={m.combi.editor.note}
		maxlength={DESCRIPTION_MAX}
		rows="3"
		placeholder={m.combi.editor.notePlaceholder}
		value={draft.note}
		oninput={(event) => onchange(setNote(draft, event.currentTarget.value))}></textarea>
</Field>

<Field id="{uid}-stats" label={m.combi.editor.stats} help={m.combi.help.stats} helpLabel={m.combi.editor.help}>
	<div class="stats">
		{#each STAT_FIELDS as field (field)}
			<div class="stat">
				<label for="{uid}-stat-{field}">{m.combi.editor.statLabels[field]}</label>
				<input
					id="{uid}-stat-{field}"
					type="text"
					inputmode="numeric"
					autocomplete="off"
					placeholder={m.combi.editor.statPlaceholders[field]}
					value={texts[field]}
					aria-invalid={errors[field] ? "true" : undefined}
					aria-describedby={errors[field] ? `${uid}-stat-${field}-error` : undefined}
					oninput={(event) => statInput(field, event.currentTarget.value)}>
				{#if errors[field]}
					<span class="error" id="{uid}-stat-{field}-error">{issueText(errors[field], m)}</span>
				{/if}
			</div>
		{/each}
	</div>
</Field>

<style>
textarea,
input {
	min-height: 36px;
	padding: 6px 10px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
}

textarea {
	resize: vertical;
}

@media (pointer: coarse) {
	input {
		min-height: var(--tap);
	}
}

input[aria-invalid="true"] {
	border-color: var(--danger);
}

.stats {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 10px;
}

.stat {
	gap: 4px;
	min-width: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}

.stat input {
	min-width: 0;
	font-size: 0.875rem;
}

.error {
	color: var(--danger);
}
</style>
