---
name: pr
description: Create a pull request for the current branch with a well-structured description
---

# PR: Create Pull Request

Create a well-structured pull request for the current branch.

## Steps

1. **Check git status**
   - Verify you're on a feature branch (not main/master)
   - Run `git status` to see staged/unstaged changes
   - Run `git diff main...HEAD` to see all changes

2. **Review the changes**
   - Understand what was changed and why
   - Note any breaking changes
   - Check if tests were added/updated

3. **Create the PR with gh CLI**

```bash
gh pr create --title "feat: <concise description>" --body "$(cat <<'EOF'
## Summary

<1-3 bullet points describing what changed>

## Motivation

<Why this change was needed>

## Changes

- <Specific change 1>
- <Specific change 2>

## Test plan

- [ ] <How to verify this works>
- [ ] Tests pass: `bun test` / `npm test`
- [ ] Type check passes: `tsc --noEmit`
EOF
)"
```

## Rules
- Title format: `type(scope): description` (feat/fix/refactor/docs/test/chore)
- Keep title under 72 characters
- Use imperative mood: "Add feature" not "Added feature"
- List breaking changes explicitly
- Never force-push to main/master
