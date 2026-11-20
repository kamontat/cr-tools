<script lang="ts">
import type { Messages } from "#lib/i18n/messages"

import Chips from "#components/atoms/Chips.svelte"
import EntryPicker from "#components/molecules/EntryPicker.svelte"
import Field from "#components/molecules/Field.svelte"
import { type Draft, limitsFor, setRole } from "#lib/combi/draft"
import { entryOptions, episodeName, ROLES, type Role, roleName, sectionOf } from "#lib/combi/editor"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	/** Which role's picker shows; the shell holds it so a jump from the code can choose it. */
	role: Role
	onrole: (role: Role) => void
	onchange: (draft: Draft) => void
}

let { uid, draft, m, role, onrole, onchange }: Props = $props()

const loadout = $derived(draft.picks.loadout)
const noRelay = $derived(!limitsFor(draft).relay)
/** Relay on an episode with none falls back to the cookie, as a switched-off tab falls back to Main. */
const shown = $derived<Role>(role === "relay" && noRelay ? "cookie" : role)

const chips = $derived(
	ROLES.map((value) => ({
		value,
		label: `${m.combi.describe.fields[value]}: ${roleName(value, loadout[value], m)}`,
		disabled: value === "relay" && noRelay,
	})),
)

const anyName = $derived(shown === "pet" ? m.combi.editor.anyPet : m.combi.editor.anyCookie)
const options = $derived(entryOptions(sectionOf(shown), [loadout[shown]], anyName))
const value = $derived(loadout[shown])
</script>

<div class="roles">
	<Chips
		label={m.combi.editor.roles}
		options={chips}
		value={[shown]}
		onchange={([next]) => next && onrole(next as Role)} />
	{#if noRelay}
		<p class="note">{m.combi.editor.noRelay(episodeName(draft))}</p>
	{/if}
</div>

<!-- The field id is `roles`, not one named after cookies: a content blocker hides those (project-components). -->
<Field
	id="{uid}-roles"
	label={m.combi.describe.fields[shown]}
	help={m.combi.help[shown]}
	helpLabel={m.combi.editor.help}>
	{#if value !== null}
		<button type="button" class="clear" onclick={() => onchange(setRole(draft, shown, null))}>
			{m.combi.editor.clear}
		</button>
	{/if}
	{#key shown}
		<EntryPicker
			label={m.combi.describe.fields[shown]}
			searchLabel={m.combi.editor.search}
			noMatchLabel={m.combi.editor.noMatch}
			{options}
			{value}
			onpick={(id) => onchange(setRole(draft, shown, id))} />
	{/key}
</Field>

<style>
.roles {
	gap: 6px;
}

.note {
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
}

.clear {
	align-self: flex-start;
	min-height: 32px;
	padding: 4px 12px;
	border: 1px solid var(--line);
	border-radius: var(--radius);
	background: var(--surface);
	color: var(--text);
	font: inherit;
	cursor: pointer;
}

@media (pointer: coarse) {
	.clear {
		min-height: var(--tap);
	}
}

.clear:hover {
	background: var(--hover);
}
</style>
