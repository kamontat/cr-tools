<script lang="ts">
import type { RowLoadout } from "#lib/combi/list"

import EntryIcon from "#components/atoms/EntryIcon.svelte"

interface Props {
	loadout: RowLoadout | null
	/** Side length of each icon in pixels. */
	size?: number
}

let { loadout, size = 24 }: Props = $props()
</script>

{#if loadout}
	<span class="loadout">
		{#if loadout.cookie}
			<EntryIcon src={loadout.cookie.src} name={loadout.cookie.name} {size} />
		{/if}
		{#if loadout.pet}
			<EntryIcon src={loadout.pet.src} name={loadout.pet.name} round {size} />
		{/if}
		{#if loadout.treasures.length > 0}
			<span class="divider" aria-hidden="true"></span>
		{/if}
		{#each loadout.treasures as treasure, index (index)}
			<span class="slot">
				<EntryIcon src={treasure.src} name={treasure.name} round={treasure.round ?? false} {size} />
				{#if treasure.more}
					<span class="more">+{treasure.more}</span>
				{/if}
			</span>
		{/each}
	</span>
{/if}

<style>
.loadout {
	display: inline-flex;
	flex-flow: row wrap;
	align-items: center;
	gap: 4px;
}

.divider {
	width: 1px;
	height: 1.25em;
	margin: 0 2px;
	background: var(--line);
}

.slot {
	position: relative;
	display: inline-flex;
}

.more {
	position: absolute;
	right: -4px;
	bottom: -4px;
	padding: 0 3px;
	border: 1px solid var(--line);
	border-radius: var(--radius-ctl);
	background: var(--surface);
	color: var(--muted);
	font-size: 0.625rem;
	font-weight: 600;
	line-height: 1.3;
}
</style>
