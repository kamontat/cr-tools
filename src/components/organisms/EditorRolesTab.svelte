<script lang="ts">
import type { Messages } from "#lib/i18n/messages"

import EntryPicker from "#components/molecules/EntryPicker.svelte"
import Field from "#components/molecules/Field.svelte"
import { type Draft, limitsFor, setRole } from "#lib/combi/draft"
import { entryOptions } from "#lib/combi/editor"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	onchange: (draft: Draft) => void
}

let { uid, draft, m, onchange }: Props = $props()

const loadout = $derived(draft.picks.loadout)
const noRelay = $derived(!limitsFor(draft).relay)

/**
 * The cookie, relay and pet rows. The cookie's field id is `lead`: a content
 * blocker hides elements named after cookies (see the project-components skill).
 */
const roles = $derived([
	{
		role: "cookie" as const,
		field: "lead",
		label: m.combi.describe.fields.cookie,
		help: m.combi.help.cookie,
		options: entryOptions("cookies", [loadout.cookie], m.combi.editor.anyCookie),
		value: loadout.cookie,
		off: false,
	},
	{
		role: "relay" as const,
		field: "relay",
		label: m.combi.describe.fields.relay,
		help: m.combi.help.relay,
		options: entryOptions("cookies", [loadout.relay], m.combi.editor.anyCookie),
		value: loadout.relay,
		off: noRelay,
	},
	{
		role: "pet" as const,
		field: "pet",
		label: m.combi.describe.fields.pet,
		help: m.combi.help.pet,
		options: entryOptions("pets", [loadout.pet], m.combi.editor.anyPet),
		value: loadout.pet,
		off: false,
	},
])
</script>

{#each roles as row (row.role)}
	<Field
		id="{uid}-{row.field}"
		label={row.label}
		help={row.help}
		helpLabel={m.combi.editor.help}
		note={row.off ? m.combi.editor.noRelay : undefined}>
		<fieldset disabled={row.off}>
			<EntryPicker
				label={row.label}
				searchLabel={m.combi.editor.search}
				noMatchLabel={m.combi.editor.noMatch}
				options={row.options}
				value={row.value}
				noneLabel={m.combi.describe.none}
				onclear={() => onchange(setRole(draft, row.role, null))}
				onpick={(id) => onchange(setRole(draft, row.role, id))} />
		</fieldset>
	</Field>
{/each}

<style>
fieldset {
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}
</style>
