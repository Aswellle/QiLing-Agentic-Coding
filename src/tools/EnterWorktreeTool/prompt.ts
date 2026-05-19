/**
 * EnterWorktree tool prompt — adapted from CC's tools/EnterWorktreeTool/prompt.ts
 */

export function getEnterWorktreeToolPrompt(): string {
  return `Use this tool ONLY when the user explicitly asks to work in a worktree.

## When to Use
- The user explicitly says "worktree" (e.g., "start a worktree", "work in a worktree", "create a worktree")

## When NOT to Use
- The user asks to create a branch, switch branches, or work on a different branch — use git commands instead
- The user asks to fix a bug or work on a feature — use normal git workflow unless they specifically mention worktrees
- Never use this tool unless the user explicitly mentions "worktree"

## Behavior
- Creates a new git worktree inside \`.qiling/worktrees/\` with a new branch based on HEAD
- Switches the session's working directory to the new worktree
- Use ExitWorktree to leave the worktree mid-session (keep or remove)

## Parameters
- \`name\` (optional): A name for the worktree. If not provided, a random name is generated.
`
}
