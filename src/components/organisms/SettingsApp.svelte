<script lang="ts">
import Segmented from "#components/atoms/Segmented.svelte"
import Panel from "#components/molecules/Panel.svelte"
import { type AboutRow, aboutRows, type BuildEnv, formatBuilt, readBuildInfo } from "#lib/build-info"
import { applyTheme, readTheme, type Theme, writeTheme } from "#lib/theme"

interface Props {
	env?: BuildEnv
}

let { env }: Props = $props()

// All visible text lives here, for the language piece to replace.
const text = {
	appearance: "Appearance",
	theme: "Theme",
	themes: [
		{ value: "system", label: "System" },
		{ value: "dark", label: "Dark" },
		{ value: "light", label: "Light" },
	],
	about: "About",
	rows: {
		environment: "Environment",
		built: "Built",
		source: "Source",
		commit: "Commit",
		changelog: "Changelog",
	} satisfies Record<AboutRow["key"], string>,
}

let theme = $state<Theme>(readTheme())
let aboutOpen = $state(false)

const info = $derived(readBuildInfo(env))
const rows = $derived(aboutRows(info))
const summary = $derived(
	[rows[0]?.text, info.environment === "preview" || info.environment === "production" ? info.shortCommit : null]
		.filter((part) => part)
		.join(" · "),
)

const pick = (value: string) => {
	theme = value as Theme
	writeTheme(theme)
	applyTheme(theme, document.documentElement)
}

const shown = (row: AboutRow) => (row.key === "built" && info.builtAt !== null ? formatBuilt(info.builtAt) : row.text)
</script>

<div class="settings">
	<h1>Settings</h1>

	<section aria-labelledby="set-appearance">
		<h2 id="set-appearance">{text.appearance}</h2>
		<div class="rows">
			<div class="row">
				<span>{text.theme}</span>
				<Segmented label={text.theme} options={text.themes} value={theme} onchange={pick} />
			</div>
		</div>
	</section>

	<section aria-labelledby="set-about">
		<h2 id="set-about">{text.about}</h2>
		<div class="rows">
			<button type="button" class="row nav" onclick={() => (aboutOpen = true)}>
				<span>{summary}</span>
				<span class="chev" aria-hidden="true">›</span>
			</button>
		</div>
	</section>
</div>

<Panel id="about" title={text.about} open={aboutOpen} onclose={() => (aboutOpen = false)}>
	<dl class="about">
		{#each rows as row (row.key)}
			<div class="item">
				<dt>{text.rows[row.key]}</dt>
				<dd>
					{#if row.href}
						<a href={row.href} target="_blank" rel="noopener">{shown(row)}</a>
					{:else}
						{shown(row)}
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
</Panel>

<style>
.settings {
	gap: 20px;
	max-width: 640px;
}

h1 {
	margin: 0;
	font-size: 22px;
}

h2 {
	margin: 0 0 8px;
	color: var(--muted);
	font-size: 13px;
	font-weight: 600;
}

.rows {
	border: 1px solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
}

.row {
	display: flex;
	flex-flow: row wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 14px;
	border-bottom: 1px solid var(--line);
}

.row:last-child {
	border-bottom: 0;
}

.nav {
	width: 100%;
	border-width: 0;
	border-radius: var(--radius-lg);
	background: none;
	color: var(--text);
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.nav:hover {
	background: var(--hover);
}

.chev {
	color: var(--muted);
}

.about {
	margin: 0;
}

.item {
	display: flex;
	flex-flow: row wrap;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 0;
	border-bottom: 1px solid var(--line);
}

dt {
	color: var(--muted);
}

dd {
	margin: 0;
	text-align: right;
	overflow-wrap: anywhere;
}

a {
	color: var(--accent);
}
</style>
