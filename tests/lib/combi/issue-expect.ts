import { expect } from "vitest"

import { CodeError, type Issue, type IssueId, issueText } from "#lib/combi/issues"
import { en } from "#lib/i18n/en"

/** The issue `run` throws, failing the test when it throws anything else or nothing. */
export function thrownIssue(run: () => unknown): Issue {
	try {
		run()
	} catch (error) {
		expect(error).toBeInstanceOf(CodeError)
		return (error as CodeError).issue
	}
	throw new Error("expected a CodeError, and nothing was thrown")
}

/** `run` throws `id`, and its English text is `text` word for word. */
export function expectThrows(run: () => unknown, id: IssueId, text: string): void {
	const issue = thrownIssue(run)
	expect(issue.id).toBe(id)
	expect(issueText(issue, en)).toBe(text)
}

export const idsOf = (issues: readonly Issue[]): IssueId[] => issues.map((issue) => issue.id)

export const englishOf = (issues: readonly Issue[]): string[] => issues.map((issue) => issueText(issue, en))
