import { describe, expect, test } from "vitest"

import { type AboutRow, aboutRows, CHANGELOG_URL, REPO_URL, readBuildInfo } from "#lib/build-info"

const SHA = "e2c43291f4b0a7c6d5e8f9a0b1c2d3e4f5a6b7c8"
const AT = "2026-09-24T14:02:11Z"

const keys = (rows: AboutRow[]) => rows.map((row) => row.key)
const row = (rows: AboutRow[], key: AboutRow["key"]) => rows.find((r) => r.key === key)

describe("environment", () => {
	test("astro dev is development", () => {
		expect(readBuildInfo({ dev: true }).environment).toBe("development")
	})

	test("the deploy workflows name preview and production", () => {
		expect(readBuildInfo({ dev: false, deploy: "preview" }).environment).toBe("preview")
		expect(readBuildInfo({ dev: false, deploy: "production" }).environment).toBe("production")
	})

	test("a build with no CI values is local", () => {
		expect(readBuildInfo({ dev: false }).environment).toBe("local")
	})

	test("an unknown deploy value is local", () => {
		expect(readBuildInfo({ dev: false, deploy: "staging" }).environment).toBe("local")
	})
})

describe("values", () => {
	test("a commit becomes a short name and a link to the commit", () => {
		const info = readBuildInfo({ dev: false, commit: SHA })

		expect(info.commit).toBe(SHA)
		expect(info.shortCommit).toBe("e2c4329")
		expect(info.commitUrl).toBe(`${REPO_URL}/commit/${SHA}`)
	})

	test("no commit leaves nothing to link to", () => {
		for (const commit of ["", undefined]) {
			const info = readBuildInfo({ dev: false, commit })
			expect(info.commit).toBeNull()
			expect(info.shortCommit).toBeNull()
			expect(info.commitUrl).toBeNull()
		}
	})

	test("a timestamp becomes the instant the build ran", () => {
		expect(readBuildInfo({ dev: false, builtAt: AT }).builtAt?.toISOString()).toBe("2026-09-24T14:02:11.000Z")
	})

	test("a timestamp that does not parse reads as no timestamp", () => {
		expect(readBuildInfo({ dev: false, builtAt: "not a date" }).builtAt).toBeNull()
		expect(readBuildInfo({ dev: false, builtAt: "" }).builtAt).toBeNull()
	})

	test("a pull request number is a positive integer or nothing", () => {
		expect(readBuildInfo({ dev: false, pr: "31" }).pr).toBe(31)
		expect(readBuildInfo({ dev: false, pr: "" }).pr).toBeNull()
		expect(readBuildInfo({ dev: false, pr: "abc" }).pr).toBeNull()
	})

	test("a branch is kept, and empty is nothing", () => {
		expect(readBuildInfo({ dev: false, branch: "feat/x" }).branch).toBe("feat/x")
		expect(readBuildInfo({ dev: false, branch: "" }).branch).toBeNull()
	})

	test("the default environment is read without throwing", () => {
		expect(() => readBuildInfo()).not.toThrow()
	})

	test("links point at the cr-tools repository", () => {
		expect(REPO_URL).toBe("https://github.com/kamontat/cr-tools")
		expect(CHANGELOG_URL).toBe(`${REPO_URL}/blob/main/CHANGELOG.md`)
	})
})

describe("aboutRows", () => {
	const all = { commit: SHA, builtAt: AT, pr: "31", branch: "feat/x" }

	test("each environment shows exactly its rows", () => {
		expect(keys(aboutRows(readBuildInfo({ dev: true, ...all })))).toEqual(["environment", "source"])
		expect(keys(aboutRows(readBuildInfo({ dev: false })))).toEqual(["environment", "built", "source"])
		expect(keys(aboutRows(readBuildInfo({ dev: false, deploy: "preview", ...all })))).toEqual([
			"environment",
			"built",
			"source",
			"commit",
		])
		expect(keys(aboutRows(readBuildInfo({ dev: false, deploy: "production", ...all })))).toEqual([
			"environment",
			"built",
			"source",
			"commit",
			"changelog",
		])
	})

	test("a preview names its pull request and branch", () => {
		const rows = aboutRows(readBuildInfo({ dev: false, deploy: "preview", ...all }))

		expect(row(rows, "environment")?.text).toBe("Preview pr-31")
		expect(row(rows, "source")).toMatchObject({ text: "feat/x · #31", href: REPO_URL })
	})

	test("production links the changelog and the commit", () => {
		const rows = aboutRows(readBuildInfo({ dev: false, deploy: "production", ...all }))

		expect(row(rows, "changelog")?.href).toBe(CHANGELOG_URL)
		expect(row(rows, "commit")).toMatchObject({
			text: "e2c4329",
			href: `${REPO_URL}/commit/${SHA}`,
		})
	})

	test("the built row carries the raw instant for the page to format", () => {
		const rows = aboutRows(readBuildInfo({ dev: false, builtAt: AT }))

		expect(row(rows, "built")?.text).toBe("2026-09-24T14:02:11.000Z")
	})

	test("a local build with no values never prints a placeholder", () => {
		for (const r of aboutRows(readBuildInfo({ dev: false }))) {
			expect(r.text).not.toMatch(/undefined|null|Invalid/)
		}
	})

	test("a preview missing its values never prints a placeholder", () => {
		for (const r of aboutRows(readBuildInfo({ dev: false, deploy: "preview" }))) {
			expect(r.text).not.toMatch(/undefined|null|Invalid/)
		}
	})
})
