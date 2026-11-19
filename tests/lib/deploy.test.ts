import { describe, expect, test } from "vitest"

// Each deploy workflow's environment.url is written by hand, so it drifts from
// the Worker name in wrangler.jsonc unless something compares the two.
const root = `${import.meta.dirname}/../..`
const read = (path: string) => Bun.file(`${root}/${path}`).text()
const workerName = async () => (await read("wrangler.jsonc")).match(/"name":\s*"([^"]+)"/)?.[1]
const environmentUrl = async (workflow: string) =>
	(await read(`.github/workflows/${workflow}`)).match(/^\s+url:\s*(.+?)\s*$/m)?.[1]

describe("deploy URLs", () => {
	test("the Worker is named cr-tools", async () => {
		expect(await workerName()).toBe("cr-tools")
	})

	test("production points at the custom domain", async () => {
		expect(await environmentUrl("deploy-production.yml")).toBe("https://cr-tools.kc.in.th")
	})

	test("preview points at the Worker's own preview alias", async () => {
		expect(await environmentUrl("deploy-preview.yml")).toBe(
			`https://pr-\${{ github.event.number }}-${await workerName()}.kcinth.workers.dev/`,
		)
	})
})
