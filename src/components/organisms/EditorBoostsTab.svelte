<script lang="ts">
import type { Boost, CookiePower, RandomBoost } from "#lib/combi/codec"
import type { Messages } from "#lib/i18n/messages"

import Chips from "#components/atoms/Chips.svelte"
import Field from "#components/molecules/Field.svelte"
import { boostArt, cookiePowerArt } from "#lib/combi/art"
import { ALL_BOOSTS, ALL_COOKIE_POWERS, ALL_RANDOM_BOOSTS } from "#lib/combi/codec"
import { type Draft, limitsFor, setRandomBoost, toggleBoost, toggleCookiePower } from "#lib/combi/draft"
import { ASSET_BASE, episodeName } from "#lib/combi/editor"
import { BOOST_LABELS, COOKIE_POWER_LABELS, RANDOM_BOOST_LABELS } from "#lib/combi/labels"

interface Props {
	/** Prefix of every field id, unique to this editor. */
	uid: string
	draft: Draft
	m: Messages
	onchange: (draft: Draft) => void
}

let { uid, draft, m, onchange }: Props = $props()

const off = $derived(!limitsFor(draft).boosts)
const note = $derived(off ? m.combi.editor.takesNone(episodeName(draft)) : undefined)
const combi = $derived(draft.picks.combi)

const boosts = ALL_BOOSTS.map((value) => ({
	value,
	label: BOOST_LABELS[value],
	icon: boostArt(value, ASSET_BASE)[0] ?? null,
}))
const powers = ALL_COOKIE_POWERS.map((value) => ({
	value,
	label: COOKIE_POWER_LABELS[value],
	icon: cookiePowerArt(value, ASSET_BASE)[0] ?? null,
}))
const randoms = $derived([
	{ value: "", label: m.combi.describe.none },
	...ALL_RANDOM_BOOSTS.map((value) => ({ value, label: RANDOM_BOOST_LABELS[value] })),
])

/** The one value a click added or removed: Chips reports the whole set. */
function changed<T extends string>(before: readonly T[], after: readonly string[]): T | undefined {
	return (after.find((value) => !before.includes(value as T)) ?? before.find((value) => !after.includes(value))) as
		| T
		| undefined
}
</script>

<Field
	id="{uid}-boosts"
	label={m.combi.describe.fields.boosts}
	help={m.combi.help.boosts}
	helpLabel={m.combi.editor.help}
	{note}>
	<fieldset disabled={off}>
		<Chips
			label={m.combi.describe.fields.boosts}
			options={boosts}
			value={combi.boosts}
			multiple
			onchange={(next) => {
				const boost = changed<Boost>(combi.boosts, next)
				if (boost) onchange(toggleBoost(draft, boost))
			}} />
	</fieldset>
</Field>

<Field
	id="{uid}-randomBoost"
	label={m.combi.describe.fields.randomBoost}
	help={m.combi.help.randomBoost}
	helpLabel={m.combi.editor.help}
	{note}>
	<fieldset disabled={off}>
		<Chips
			label={m.combi.describe.fields.randomBoost}
			options={randoms}
			value={[combi.randomBoost ?? ""]}
			onchange={([value]) => onchange(setRandomBoost(draft, value ? (value as RandomBoost) : null))} />
	</fieldset>
</Field>

<Field
	id="{uid}-powers"
	label={m.combi.describe.fields.cookiePower}
	help={m.combi.help.cookiePower}
	helpLabel={m.combi.editor.help}
	{note}>
	<fieldset disabled={off}>
		<Chips
			label={m.combi.describe.fields.cookiePower}
			options={powers}
			value={combi.cookiePowers}
			multiple
			onchange={(next) => {
				const power = changed<CookiePower>(combi.cookiePowers, next)
				if (power) onchange(toggleCookiePower(draft, power))
			}} />
	</fieldset>
</Field>

<style>
fieldset {
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}
</style>
