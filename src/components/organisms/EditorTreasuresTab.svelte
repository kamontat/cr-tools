<script lang="ts">
import type { Messages } from "#lib/i18n/messages"

import Chips from "#components/atoms/Chips.svelte"
import Field from "#components/molecules/Field.svelte"
import TreasureSlot from "#components/organisms/TreasureSlot.svelte"
import { type Draft, setOrdered, setTreasureSlot } from "#lib/combi/draft"
import { carriedTreasures, entryOf, entryOptions } from "#lib/combi/editor"
import { MAX_TREASURE_SLOTS } from "#lib/combi/loadout"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	onchange: (draft: Draft) => void
}

let { uid, draft, m, onchange }: Props = $props()

const ordered = $derived(draft.picks.loadout.ordered)
const options = $derived(entryOptions("treasures", carriedTreasures(draft)))
const orders = $derived([
	{ value: "any", label: m.combi.editor.anyOrder },
	{ value: "exact", label: m.combi.editor.exactOrder },
])
const slots = $derived(
	Array.from({ length: MAX_TREASURE_SLOTS }, (_, at) =>
		(draft.picks.loadout.treasures[at] ?? []).map((pick) => ({
			...entryOf("treasures", pick.id),
			levels: pick.levels,
		})),
	),
)
const labels = $derived({
	add: m.combi.editor.addTreasure,
	remove: m.combi.editor.removeTreasure,
	search: m.combi.editor.search,
	noMatch: m.combi.editor.noMatch,
	allLevels: m.combi.editor.allLevels,
	level: m.combi.editor.level,
})
</script>

<Field id="{uid}-order" label={m.combi.editor.order} help={m.combi.help.treasureOrder} helpLabel={m.combi.editor.help}>
	<Chips
		label={m.combi.editor.order}
		options={orders}
		value={[ordered ? "exact" : "any"]}
		onchange={([order]) => order && onchange(setOrdered(draft, order === "exact"))} />
</Field>

<Field
	id="{uid}-treasures"
	label={m.combi.describe.fields.treasures}
	help={m.combi.help.treasures}
	helpLabel={m.combi.editor.help}>
	{#each slots as picks, at (at)}
		<TreasureSlot
			index={at + 1}
			label={ordered ? m.combi.editor.slot(at + 1) : m.combi.editor.anySlot}
			{picks}
			{options}
			{labels}
			onchange={(next) => onchange(setTreasureSlot(draft, at, next))} />
	{/each}
</Field>
