<script lang="ts">
interface Props {
	code: string
	/** The name a screen reader hears; the code itself by default. */
	label?: string
}

let { code, label }: Props = $props()

const chars = $derived([...code])
</script>

<!-- One image named as the code, so a screen reader reads it once, not letter by letter; the letters stay selectable. -->
<span class="tiles" role="img" aria-label={label ?? code} style:--count={chars.length}>
	{#each chars as char, index (index)}
		<span class="tile">{char}</span>
	{/each}
</span>

<style>
/* A combi name as one tile per character, as it is typed into the game. */
.tiles {
	display: grid;
	grid-template-columns: repeat(var(--count), minmax(0, 1fr));
	gap: 3px;
	max-width: 340px;
}

.tile {
	display: grid;
	place-items: center;
	aspect-ratio: 4 / 5;
	border: var(--border) solid var(--ink);
	border-radius: calc(var(--radius-sm) - 4px);
	background: var(--surface-2);
	color: var(--code);
	font-family: var(--mono);
	font-size: clamp(14px, 3.6vw, 18px);
	font-weight: 700;
}
</style>
