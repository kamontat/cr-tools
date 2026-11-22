---
name: project-landing
description: Use when the user approves a change in this repo that has an open pull request and preview URL — "ok", "looks good", "ship it", "merge it", "LGTM" — or asks to merge, finish or clean up a worktree branch.
---

# Landing a change

## Overview

Landing turns an approved pull request (opened by `project-shipping`) into a commit on its
base branch: changelog entry first, then merge, then cleanup, ending back on an up-to-date
base. Only start after the user has approved this specific change.

`<base>` is the PR's base branch, `main` (see `project-shipping`). Read it from the PR
rather than guessing:
`gh pr view <number> --json baseRefName --jq .baseRefName`.

Every `gh` command here runs as the owner's personal account, since `gh` may have a work
account active: prefix it with `GH_TOKEN=$(gh auth token --user kamontat)`.

## Steps

1. **Catch up with the base, in the worktree.** `git fetch origin` then
   `git merge origin/<base>`, so the changelog edit sees entries other PRs landed. Resolve
   conflicts, rerun `pnpm run check` and `pnpm run test`.
2. **Changelog entry, on the PR branch.** Edit `CHANGELOG.md` following the
   `project-changelog` skill, which owns the entry format (`## YYYY-MM-DD: <title>` with
   BREAKING CHANGES, Features, Improvements, Bug fixes and Decisions). The date is today's.
3. **Commit and push.** `docs(changelog): <title>`, then `git push`. Wait for checks:
   `gh pr checks <number> --watch`. A failing check stops the landing — fix it on the
   branch first.
4. **Merge.** Merge commit, matching the history:
   ```sh
   GH_TOKEN=$(gh auth token --user kamontat) gh pr merge <number> --merge
   ```
   Don't pass `--delete-branch`: it tries to delete the local branch, which the worktree
   still has checked out. If the repo has **Automatically delete head branches** on
   (`gh api repos/{owner}/{repo} --jq .delete_branch_on_merge`), GitHub deletes the remote
   branch; otherwise delete it after cleanup with `git push origin --delete worktree-<name>`.
   If the merge is refused (conflict, review required), stop and tell the user.
5. **Leave the worktree, keeping it for now.** Call `ExitWorktree` with `action: "keep"`.
   The session goes back to the repo root. (Git commands aimed at the root with `-C` or
   `cd` are refused from inside a worktree session, and `remove` refuses while the base has
   not pulled the merge yet — so leave first, clean up from the root.)
6. **Update the base and delete the worktree, from the root:**
   ```sh
   git checkout <base>
   git pull --ff-only
   git worktree remove .claude/worktrees/<name>
   git branch -d worktree-<name>
   git fetch --prune
   ```
   `branch -d` (not `-D`) succeeds only when the branch is merged — if it refuses, the
   merge didn't reach the base; find out why before forcing anything. Confirm with
   `git status` (on `<base>`, clean, up to date with `origin/<base>`) and
   `git worktree list`.
7. **Report.** The merge commit and the production URL, `https://cr-tools.kc.in.th` (the
   `environment.url` in `.github/workflows/deploy-production.yml`). It deploys from `main`
   via the Deploy Production workflow; check it with
   `gh run list --workflow "Deploy Production" --limit 1` and say whether it passed or is
   still running.

## Common mistakes

- Writing the changelog on the base after merging — it belongs in the PR so it ships with
  the change.
- Using a version number or `Unreleased` instead of the date.
- `ExitWorktree` with `remove` or `discard_changes: true` to skip the root steps — you lose
  the check that the merge really reached the base.
