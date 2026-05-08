---
name: batch
description: Orchestrate a large, parallelizable change across the codebase using parallel agents in worktrees
---

# Batch: Parallel Work Orchestration

Port of CC's bundled/batch.ts skill.

You are orchestrating a large, parallelizable change across this codebase.

## Phase 1: Research and Plan (Plan Mode)

Enter plan mode immediately, then:

1. **Understand the scope.** Launch one or more subagents with subagent_type:"Explore" to deeply research what this instruction touches. Find all files, patterns, and call sites that need to change. Understand the existing conventions.

2. **Decompose into independent units.** Break the work into 5–20 self-contained units. Each unit must:
   - Be independently implementable in an isolated git worktree (no shared state with sibling units)
   - Be mergeable on its own without depending on another unit's PR landing first
   - Be roughly uniform in size (split large units, merge trivial ones)

   Scale the count to the actual work: few files → closer to 5; hundreds of files → closer to 20. Prefer per-directory or per-module slicing.

3. **Write an E2E test recipe.** Describe how a worker should verify their unit works — commands to run, what output to check. Keep it short (2–5 steps). Workers will append it to their commit message.

4. **Exit plan mode** with a table showing units + their scope. Ask the user to confirm before proceeding.

## Phase 2: Parallel Implementation

After confirmation, launch all worker agents **simultaneously** (one Agent tool call per unit in a single message). Each worker should:
- Work in isolation: `isolation: "worktree"`
- Implement their specific unit
- Run the test suite
- Commit their changes
- Create a PR with `gh pr create` if gh is available

Monitor progress and fix any blockers by continuing workers with SendMessage.

## Phase 3: Review and Merge

Once all workers complete, review the PRs and merge them in dependency order (or all at once if independent).

---

**Usage:** `/batch <describe the large change you want to make>`

**Example:** `/batch Update all API handlers to use the new auth middleware`
