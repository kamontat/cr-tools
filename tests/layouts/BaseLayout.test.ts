import { readFile } from "node:fs/promises"
import { expect, test } from "vitest"

test("BaseLayout loads Google Tag Manager from PUBLIC_GTM_ID", async () => {
	const source = await readFile("src/layouts/BaseLayout.astro", "utf8")
	expect(source).toMatch(/import \{ loadGtm \} from "#lib\/gtm";?$/m)
	expect(source).toMatch(/loadGtm\(import\.meta\.env\.PUBLIC_GTM_ID, document\);?$/m)
})

test("BaseLayout uses the Fairy Cookie icon as the one favicon", async () => {
	const source = await readFile("src/layouts/BaseLayout.astro", "utf8")
	expect(source).toContain('<link rel="icon" href="/assets/cookies/fairy_cookie.png">')
	expect(source).not.toMatch(/favicon\.(svg|ico)/)
})
