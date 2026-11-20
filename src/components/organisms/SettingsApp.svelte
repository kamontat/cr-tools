<script lang="ts">
import Segmented from "#components/atoms/Segmented.svelte"
import Panel from "#components/molecules/Panel.svelte"
import { type AboutRow, aboutRows, type BuildEnv, formatBuilt, readBuildInfo } from "#lib/build-info"
import { messagesFor } from "#lib/i18n/messages"
import { applyLang, currentLang, LANG_NAMES, LANGS, type Lang, LOCALES, onLangChange, writeLang } from "#lib/lang"
import { applyTheme, readTheme, type Theme, writeTheme } from "#lib/theme"

interface Props {
	env?: BuildEnv
}

let { env }: Props = $props()

let lang = $state<Lang>(currentLang(document))
const m = $derived(messagesFor(lang))

$effect(() => onLangChange(document, (next) => (lang = next)))

let theme = $state<Theme>(readTheme())
let aboutOpen = $state(false)

const info = $derived(readBuildInfo(env))
const rows = $derived(aboutRows(info))
const summary = $derived(
	[
		m.settings.environments[info.environment],
		info.environment === "preview" || info.environment === "production" ? info.shortCommit : null,
	]
		.filter((part) => part)
		.join(" · "),
)
const themes = $derived(
	(["system", "dark", "light"] as const).map((value) => ({ value, label: m.settings.themes[value] })),
)
const langs = LANGS.map((l) => ({ value: l, label: LANG_NAMES[l], lang: l }))

const pickLang = (value: string) => {
	const next = value as Lang
	writeLang(next)
	applyLang(next, document)
}

const pick = (value: string) => {
	theme = value as Theme
	writeTheme(theme)
	applyTheme(theme, document.documentElement)
}

const shown = (row: AboutRow) => {
	if (row.key === "environment") return m.settings.environments[info.environment]
	if (row.key === "built") return info.builtAt === null ? m.settings.unknown : formatBuilt(info.builtAt, LOCALES[lang])
	return row.text
}
</script>

<div class="settings">
	<h1>{m.settings.title}</h1>

	<section aria-labelledby="set-appearance">
		<h2 id="set-appearance">{m.settings.appearance}</h2>
		<div class="rows">
			<div class="row">
				<span>{m.settings.language}</span>
				<Segmented label={m.settings.language} options={langs} value={lang} onchange={pickLang} />
			</div>
			<div class="row">
				<span>{m.settings.theme}</span>
				<Segmented label={m.settings.theme} options={themes} value={theme} onchange={pick} />
			</div>
		</div>
	</section>

	<section aria-labelledby="set-about">
		<h2 id="set-about">{m.settings.about}</h2>
		<div class="rows">
			<button type="button" class="row nav" onclick={() => (aboutOpen = true)}>
				<span>{summary}</span>
				<span class="chev" aria-hidden="true">›</span>
			</button>
		</div>
	</section>
</div>

<Panel
	id="about"
	title={m.settings.about}
	closeLabel={m.frame.close}
	resizeLabel={m.frame.resize}
	open={aboutOpen}
	onclose={() => (aboutOpen = false)}>
	<dl class="about">
		{#each rows as row (row.key)}
			<div class="item">
				<dt>{m.settings.rows[row.key]}</dt>
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
