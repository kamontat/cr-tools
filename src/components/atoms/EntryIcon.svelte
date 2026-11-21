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
	<!-- The reset gives every image height: auto, so the style says the size too, or a lazy load has none to reserve. -->
	<img
		width={size}
		height={size}
		{src}
		alt={name}
		title={name}
		loading="lazy"
		class:round
		style:width="{size}px"
		style:height="{size}px">
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
