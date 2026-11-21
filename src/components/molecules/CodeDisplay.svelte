<script lang="ts">
import type { CharHint } from "#lib/combi/hints"

import { combiSectionOf } from "#lib/combi/full-code"

interface Props {
	/** The full code, `LOADOUT-COMBI`, or a bare 10-character combi. */
	code: string
	summary: string
	/** One per character of `code`, from `hintsFor`; empty when the code cannot be read. */
	hints: CharHint[]
	onjump: (group: string) => void
	canJump: (group: string) => boolean
}

let { code, summary, hints, onjump, canJump }: Props = $props()

/** Characters of one field, drawn as one element. */
type Run = { text: string; group: string | null; hint: string }

function runsOf(list: CharHint[]): Run[] {
	const runs: Run[] = []
	for (const { char, group, hint } of list) {
		const previous = runs.at(-1)
		if (previous !== undefined && previous.group === group) previous.text += char
		else runs.push({ text: char, group, hint })
	}
	return runs
}

const game = $derived(combiSectionOf(code))
/** Where the 10 game characters start in the full code. */
const start = $derived(code.length - game.length)
const read = $derived(hints.length === code.length)

const big = $derived<Run[]>(read ? runsOf(hints.slice(start)) : [{ text: game, group: null, hint: "" }])
const loadout = $derived<Run[]>(
	read ? runsOf(hints.slice(0, start)) : [{ text: code.slice(0, start), group: null, hint: "" }],
)
</script>

{#snippet runs(list: Run[])}
	{#each list as run, at (at)}
		{#if run.group !== null && canJump(run.group)}
			<button type="button" aria-label={run.hint} title={run.hint} onclick={() => onjump(run.group as string)}>
				{run.text}
			</button>
		{:else if run.group !== null}
			<span title={run.hint}>{run.text}</span>
		{:else}
			<span>{run.text}</span>
		{/if}
	{/each}
{/snippet}

<div class="display">
	<div row class="code-big">{@render runs(big)}</div>
	{#if summary}
		<p class="summary">{summary}</p>
	{/if}
	{#if start > 0}
		<div row class="code-full">{@render runs(loadout)}<span>{game}</span></div>
	{/if}
</div>

<style>
.display {
	gap: 4px;
	min-width: 0;
}

.code-big,
.code-full {
	flex-wrap: wrap;
	font-family: var(--mono);
	overflow-wrap: anywhere;
}

.code-big {
	color: var(--code);
	font-size: 1.625rem;
	font-weight: 600;
	letter-spacing: 0.1em;
}

.code-full {
	color: var(--muted);
	font-size: 0.75rem;
}

.code-big button,
.code-full button {
	padding: 0;
	border: 0;
	border-radius: 4px;
	background: none;
	color: inherit;
	font: inherit;
	letter-spacing: inherit;
	cursor: pointer;
}

.code-big button:hover,
.code-full button:hover,
.code-big button:focus-visible,
.code-full button:focus-visible {
	background: var(--hover);
	text-decoration: underline dotted;
}

.summary {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}
</style>
