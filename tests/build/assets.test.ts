import { beforeAll, expect, test } from "vitest"

const root = `${import.meta.dirname}/../..`

beforeAll(() => {
	const build = Bun.spawnSync(["bun", "run", "build"], { cwd: root })
	if (build.exitCode !== 0) throw new Error(build.stderr.toString())
}, 120_000)

test("icons ship as files and the index does not", async () => {
	expect(await Bun.file(`${root}/dist/assets/cookies/fire_spirit_cookie.webp`).exists()).toBe(true)
	expect(await Bun.file(`${root}/dist/.assetsignore`).text()).toContain("assets/index.json")
})
