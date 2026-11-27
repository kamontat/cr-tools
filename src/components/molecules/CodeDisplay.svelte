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

<!-- The game's 10 characters as tiles, the CodeTiles look; each field stays a button that jumps to its tab. -->
{#snippet tiles(list: Run[])}
	{#each list as run, at (at)}
		{#if run.group !== null && canJump(run.group)}
			<button
				type="button"
				class="run"
				aria-label={run.hint}
				title={run.hint}
				onclick={() => onjump(run.group as string)}>
				{#each [...run.text] as char, n (n)}
					<span class="tile">{char}</span>
				{/each}
			</button>
		{:else}
			<span class="run" title={run.hint || undefined}>
				{#each [...run.text] as char, n (n)}
					<span class="tile">{char}</span>
				{/each}
			</span>
		{/if}
	{/each}
{/snippet}

<div class="display">
	<div row class="code-big">{@render tiles(big)}</div>
	{#if summary}
		<p class="summary">{summary}</p>
	{/if}
	{#if start > 0}
		<div row class="code-full">{@render runs(loadout)}<span>{game}</span></div>
	{/if}
</div>

<style>
.display {
	gap: 6px;
	min-width: 0;
}

/* The tiles: one per character, a field's tiles together, as CodeTiles draws them. */
.code-big {
	flex-wrap: wrap;
	gap: 3px;
	max-width: 340px;
}

.run {
	display: inline-flex;
	gap: 3px;
	padding: 0;
	border: 0;
	border-radius: calc(var(--radius-sm) - 4px);
	background: none;
	font: inherit;
}

button.run {
	cursor: pointer;
}

.tile {
	display: grid;
	place-items: center;
	width: 1.6em;
	aspect-ratio: 4 / 5;
	border: var(--border) solid var(--ink);
	border-radius: calc(var(--radius-sm) - 4px);
	background: var(--surface-2);
	color: var(--code);
	font-family: var(--mono);
	font-size: clamp(14px, 3.6vw, 18px);
	font-weight: 700;
}

button.run:hover .tile,
button.run:focus-visible .tile {
	border-color: var(--accent);
	background: color-mix(in srgb, var(--accent) 14%, var(--surface-2));
}

button.run:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.code-full {
	flex-wrap: wrap;
	color: var(--muted);
	font-family: var(--mono);
	font-size: 0.75rem;
	overflow-wrap: anywhere;
}

.code-full button {
	padding: 0;
	border: 0;
	border-radius: calc(var(--radius-sm) - 6px);
	background: none;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.code-full button:hover,
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
