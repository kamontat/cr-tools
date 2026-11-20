<script lang="ts">
interface Props {
	src: string | null
	name: string
	round?: boolean
	/** Side length in pixels. */
	size?: number
}

let { src, name, round = false, size = 40 }: Props = $props()
</script>

{#if src}
	<img {src} alt={name} title={name} width={size} height={size} loading="lazy" class:round>
{:else}
	<span
		class="tile"
		class:round
		role="img"
		aria-label={name}
		title={name}
		style:width="{size}px"
		style:height="{size}px"></span>
{/if}

<style>
img,
.tile {
	display: inline-block;
	flex: none;
	border-radius: var(--radius);
	object-fit: contain;
}

.tile {
	background: var(--hover);
	border: 1px dashed var(--line);
	box-sizing: border-box;
}

.round {
	border-radius: 50%;
}
</style>
