<script lang="ts">
interface Props {
	label: string
	/** The id of the element this button shows and hides. */
	controls: string
	expanded: boolean
	ontoggle: () => void
}

let { label, controls, expanded, ontoggle }: Props = $props()
</script>

<button type="button" aria-label={label} aria-expanded={expanded} aria-controls={controls} onclick={ontoggle}>?</button>

<style>
button {
	display: inline-grid;
	place-items: center;
	width: 24px;
	height: 24px;
	padding: 0;
	border: 1px solid var(--line);
	border-radius: 50%;
	background: var(--surface);
	color: var(--muted);
	font: inherit;
	font-size: 0.75rem;
	font-weight: 600;
	cursor: pointer;
}

/* A finger gets the full tap height, while the glyph stays small. */
@media (pointer: coarse) {
	button {
		width: var(--tap);
		height: var(--tap);
	}
}

button[aria-expanded="true"] {
	border-color: var(--accent);
	color: var(--accent);
}
</style>
