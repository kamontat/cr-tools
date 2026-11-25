<script lang="ts">
import type { Draft } from "#lib/combi/draft"
import type { Issue } from "#lib/combi/issues"
import type { Round } from "#lib/combi/rounds"
import type { Messages } from "#lib/i18n/messages"

import { untrack } from "svelte"

import Field from "#components/molecules/Field.svelte"
import { addRound, removeRound, setNote, setRoundValue } from "#lib/combi/draft"
import { issueText } from "#lib/combi/issues"
import { averageOf, parseRoundValue } from "#lib/combi/rounds"
import { DESCRIPTION_MAX } from "#lib/combi/saved"
import { STAT_FIELDS, type StatField } from "#lib/combi/stats"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	onchange: (draft: Draft) => void
}

let { uid, draft, m, onchange }: Props = $props()

type Texts = Record<StatField, string>

const textsOf = (round: Round): Texts =>
	Object.fromEntries(
		STAT_FIELDS.map((field) => [field, round[field] === undefined ? "" : String(round[field])]),
	) as Texts

/**
 * What each cell holds. A cell keeps what was typed — an unfinished number, or
 * "12,000" — and takes the draft's value only when the draft's round changes
 * from elsewhere (another code typed, a reset), which `synced` tells apart.
 * A round taken out shifts the ones after it, so then every cell starts again
 * from the draft.
 */
let texts = $state<Texts[]>(untrack(() => draft.rounds.map(textsOf)))
let errors = $state<Partial<Record<StatField, Issue>>[]>(untrack(() => draft.rounds.map(() => ({}))))
let synced: Texts[] = untrack(() => draft.rounds.map(textsOf))

$effect(() => {
	const rounds = draft.rounds
	untrack(() => {
		if (rounds.length < synced.length) {
			synced = rounds.map(textsOf)
			texts = rounds.map(textsOf)
			errors = rounds.map(() => ({}))
			return
		}
		rounds.forEach((round, at) => {
			const now = textsOf(round)
			const was = synced[at]
			if (was === undefined) {
				synced[at] = now
				texts[at] = { ...now }
				errors[at] = {}
				return
			}
			for (const field of STAT_FIELDS) {
				if (now[field] === was[field]) continue
				was[field] = now[field]
				const row = texts[at]
				if (row !== undefined) row[field] = now[field]
				delete errors[at]?.[field]
			}
		})
	})
})

function cellInput(at: number, field: StatField, text: string) {
	const row = texts[at]
	const rowErrors = errors[at]
	if (row === undefined || rowErrors === undefined) return
	row[field] = text
	const read = parseRoundValue(field, text)
	if (!read.ok) {
		rowErrors[field] = read.issue
		return
	}
	delete rowErrors[field]
	const was = synced[at]
	if (was !== undefined) was[field] = read.value === null ? "" : String(read.value)
	onchange(setRoundValue(draft, at, field, read.value))
}

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const average = $derived(averageOf(draft.rounds))
</script>

<Field id="{uid}-note" label={m.combi.editor.note} help={m.combi.help.note} helpLabel={m.combi.editor.help}>
	<textarea
		name="note"
		aria-label={m.combi.editor.note}
		maxlength={DESCRIPTION_MAX}
		rows="3"
		placeholder={m.combi.editor.notePlaceholder}
		value={draft.note}
		oninput={(event) => onchange(setNote(draft, event.currentTarget.value))}></textarea>
</Field>

<Field id="{uid}-rounds" label={m.combi.editor.rounds} help={m.combi.help.rounds} helpLabel={m.combi.editor.help}>
	<!-- The table may be wider than a phone; it scrolls inside this box, never the page. -->
	<div class="scroll">
		<table>
			<thead>
				<tr>
					<th scope="col" class="number">#</th>
					{#each STAT_FIELDS as field (field)}
						<th scope="col">{m.combi.editor.statLabels[field]}</th>
					{/each}
					<td></td>
				</tr>
			</thead>
			<tbody>
				{#each texts as row, at (at)}
					<tr>
						<th scope="row" class="number">{at + 1}</th>
						{#each STAT_FIELDS as field (field)}
							{@const error = errors[at]?.[field]}
							{@const id = `${uid}-round-${at}-${field}`}
							<td>
								<input
									{id}
									name="round-{at}-{field}"
									type="text"
									inputmode="numeric"
									autocomplete="off"
									aria-label={m.combi.editor.roundCell(at + 1, m.combi.editor.statLabels[field])}
									value={row[field]}
									aria-invalid={error ? "true" : undefined}
									aria-describedby={error ? `${id}-error` : undefined}
									oninput={(event) => cellInput(at, field, event.currentTarget.value)}>
								{#if error}
									<span class="error" id="{id}-error">{issueText(error, m)}</span>
								{/if}
							</td>
						{/each}
						<td>
							<button
								type="button"
								class="remove"
								aria-label={m.combi.editor.removeRound(at + 1)}
								onclick={() => onchange(removeRound(draft, at))}>
								✕
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
			{#if texts.length > 0}
				<tfoot>
					<tr>
						<th scope="row" class="number">{m.combi.list.average}</th>
						{#each STAT_FIELDS as field (field)}
							<td>{average[field] === undefined ? "" : whole.format(average[field])}</td>
						{/each}
						<td></td>
					</tr>
				</tfoot>
			{/if}
		</table>
	</div>
	<button type="button" class="add" onclick={() => onchange(addRound(draft))}>
		<span aria-hidden="true">+</span> {m.combi.editor.addRound}
	</button>
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
	input,
	button {
		min-height: var(--tap);
	}
}

input[aria-invalid="true"] {
	border-color: var(--danger);
}

.scroll {
	max-width: 100%;
	overflow-x: auto;
}

table {
	border-collapse: collapse;
	font-size: 0.875rem;
}

th {
	padding: 4px 6px;
	color: var(--muted);
	font-size: 0.8125rem;
	font-weight: 500;
	text-align: start;
	white-space: nowrap;
}

td {
	padding: 3px;
	vertical-align: top;
}

.number {
	text-align: end;
}

td input {
	width: 7.5em;
	min-width: 0;
	font-size: 0.875rem;
}

tfoot td,
tfoot th {
	padding: 8px 6px 4px;
	border-top: 1px solid var(--line);
	font-weight: 600;
}

tfoot th {
	color: var(--text);
}

.remove,
.add {
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
	cursor: pointer;
}

.remove {
	width: 36px;
	min-height: 36px;
	color: var(--muted);
}

.add {
	align-self: flex-start;
	min-height: 36px;
	padding: 6px 12px;
}

.error {
	display: block;
	max-width: 7.5em;
	color: var(--danger);
	font-size: 0.75rem;
}
</style>
