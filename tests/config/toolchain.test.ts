import { spawnSync } from "node:child_process"
import { existsSync, globSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")
const read = (file: string) => readFileSync(join(root, file), "utf8")
const pkg = JSON.parse(read("package.json"))
const exact = /^\d+\.\d+\.\d+$/

describe("toolchain", () => {
	it("pins Node.js and pnpm in package.json devEngines", () => {
		const { runtime, packageManager } = pkg.devEngines
		expect(runtime).toEqual({ name: "node", version: expect.stringMatching(exact), onFail: "download" })
		expect(packageManager).toEqual({ name: "pnpm", version: expect.stringMatching(exact), onFail: "download" })
	})

	it("keeps volta and engines in line with the pinned Node.js", () => {
		expect(pkg.volta).toEqual({ node: pkg.devEngines.runtime.version })
		expect(pkg.engines.node).toMatch(new RegExp(`\\^${pkg.devEngines.runtime.version.split(".")[0]}\\.`))
		expect(pkg).not.toHaveProperty("packageManager")
	})

	it("lets mise read the versions from package.json instead of pinning them", () => {
		const mise = read("mise.toml")
		expect(mise).not.toMatch(/^(node|pnpm|bun) = /m)
		expect(mise).toMatch(/^idiomatic_version_file_enable_tools\s*=\s*\["node", "pnpm"\]$/m)
	})

	it.each(["main.yml", "deploy-preview.yml", "deploy-production.yml", "assets.yml"])(
		"%s sets up Node.js and pnpm from package.json with pnpm/setup",
		(workflow) => {
			const source = read(`.github/workflows/${workflow}`)
			expect(source).toMatch(/uses: pnpm\/setup@[0-9a-f]{40} # v\d+\.\d+\.\d+$/m)
			expect(source).not.toMatch(/runtime:|\bbunx?\b|mise-action/)
		},
	)

	it("has no Bun files, types or commands left", () => {
		for (const file of ["bun.lock", "bunfig.toml"]) expect(existsSync(join(root, file))).toBe(false)
		expect(existsSync(join(root, "pnpm-lock.yaml"))).toBe(true)
		expect(pkg.devDependencies).not.toHaveProperty("@types/bun")
		expect(JSON.stringify(pkg.scripts)).not.toMatch(/\bbunx?\b/)
		expect(read("wrangler.jsonc")).toMatch(/"command": "pnpm run build"/)
	})

	it("uses no Bun API in source, scripts or tests", () => {
		const files = globSync(["src/**/*.{ts,astro,svelte}", "scripts/**/*.ts", "tests/**/*.ts", "*.config.ts"], {
			cwd: root,
		}).filter((file) => file !== "tests/config/toolchain.test.ts")
		expect(files.length).toBeGreaterThan(0)
		const offenders = files.filter((file) => /\bBun\.|from "bun"/.test(read(file)))
		expect(offenders).toEqual([])
	})

	it("runs the asset scripts' modules on plain Node.js", () => {
		const modules = globSync("scripts/utils/*.ts", { cwd: root })
		expect(modules.length).toBeGreaterThan(0)
		const imports = modules.map((file) => `await import(${JSON.stringify(`./${file}`)})`).join(";")
		const result = spawnSync("node", ["--input-type=module", "-e", imports], { cwd: root, encoding: "utf8" })
		expect(result.stderr).toBe("")
		expect(result.status).toBe(0)
	})
})
