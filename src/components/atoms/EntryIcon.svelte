<script lang="ts">
import type { EntryKind } from "#lib/combi/catalog"

interface Props {
	src: string | null
	name: string
	round?: boolean
	/** Side length in pixels. */
	size?: number
	/** A treasure's kind: frames the picture in the kind's colour, with its letter on the corner. */
	kind?: EntryKind | null
}

let { src, name, round = false, size = 40, kind = null }: Props = $props()

const LETTERS: Readonly<Record<EntryKind, string>> = { base: "N", evolved: "E", blessed: "B" }
</script>

{#snippet picture()}
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
{/snippet}

{#if kind}
	<!-- An evolved treasure and its blessed form share a picture: the frame and the letter tell them apart. -->
	<span class="kind" data-kind={kind}>
		{@render picture()}
		<span class="badge" aria-hidden="true">{LETTERS[kind]}</span>
	</span>
{:else}
	{@render picture()}
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

.kind {
	--kind: var(--muted);
	position: relative;
	display: inline-flex;
	flex: none;
	padding: 3px;
	border: 2px solid var(--kind);
	border-radius: 6px;
}

.kind[data-kind="evolved"] {
	--kind: var(--evolved);
}

.kind[data-kind="blessed"] {
	--kind: var(--blessed);
}

.badge {
	position: absolute;
	top: -2px;
	right: -2px;
	min-width: 14px;
	padding: 0 2px;
	border-radius: 0 4px 0 3px;
	background: var(--kind);
	color: var(--bg);
	font-family: var(--mono);
	font-size: 0.625rem;
	font-weight: 700;
	line-height: 14px;
	text-align: center;
}
</style>
