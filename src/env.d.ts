interface ImportMetaEnv {
	/** Google Tag Manager container id, inlined by `astro build`; see `#lib/gtm`. */
	readonly PUBLIC_GTM_ID?: string
	/** `preview` or `production`, set by the deploy workflows; absent for a local build. */
	readonly PUBLIC_DEPLOY_ENV?: string
	/** The commit the build came from, set by the deploy workflows. */
	readonly PUBLIC_COMMIT_SHA?: string
	/** ISO instant the build ran, from the workflows' `stamp` step. */
	readonly PUBLIC_BUILT_AT?: string
	/** Pull request number, previews only. */
	readonly PUBLIC_PR_NUMBER?: string
	/** The pull request's head branch, previews only. */
	readonly PUBLIC_BRANCH?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

declare namespace astroHTML.JSX {
	interface HTMLAttributes {
		/** `@kcstyles/reset.css` lays out `<div row>` as a flex row instead of a column. */
		row?: boolean | "" | undefined | null
		/** `@kcstyles/reset.css` lays out `<div block>` as a block instead of a flex column. */
		block?: boolean | "" | undefined | null
	}
}
