import { z } from 'zod'
import path from 'path'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import {
  getActiveWorktreeSession, setActiveWorktreeSession,
  getGitRoot, getCurrentCommit, createWorktree,
} from '../services/worktree/store'

export const ENTER_WORKTREE_TOOL_NAME = 'EnterWorktree'

const inputSchema = z.object({
  name: z.string()
    .regex(/^[a-zA-Z0-9._-]{1,64}$/)
    .optional()
    .describe(
      'Optional slug for the worktree branch name (letters, numbers, dots, hyphens, underscores, max 64). ' +
      'If omitted, a name is auto-generated from the current timestamp.'
    ),
})

type Input = z.infer<typeof inputSchema>

export const EnterWorktreeTool: Tool<Input> = {
  name: ENTER_WORKTREE_TOOL_NAME,

  description:
    'Create a new isolated git worktree and switch into it for experimental or parallel work. ' +
    'The worktree gets its own branch so changes are isolated from the main branch. ' +
    'Use when you want to try a risky refactor, work on a parallel feature, or make changes ' +
    'that the user may want to discard. ' +
    'After entering, all file edits happen in the worktree. ' +
    'Call ExitWorktree when done — choose "keep" to retain the branch or "remove" to discard.',

  inputSchema,

  checkPermissions(_input: Input): PermissionDecision {
    return {
      type: 'ask',
      description: 'Create a git worktree (new branch + isolated working directory)',
    }
  },

  async call(input: Input, ctx: ToolContext): Promise<ToolResult> {
    if (getActiveWorktreeSession()) {
      return {
        content: [{ type: 'text', text: 'Error: Already in a worktree session. Call ExitWorktree first.' }],
        isError: true,
      }
    }

    const repoRoot = await getGitRoot(ctx.workingDir)
    if (!repoRoot) {
      return {
        content: [{ type: 'text', text: 'Error: Not inside a git repository.' }],
        isError: true,
      }
    }

    const originalCommit = await getCurrentCommit(repoRoot)
    const slug = input.name ?? `wt-${Date.now().toString(36)}`
    const branchName = `worktree/${slug}`
    const worktreePath = path.join(path.dirname(repoRoot), `${path.basename(repoRoot)}-${slug}`)

    const result = await createWorktree(repoRoot, worktreePath, branchName)
    if (!result.ok) {
      return {
        content: [{ type: 'text', text: `Error creating worktree: ${result.error}` }],
        isError: true,
      }
    }

    setActiveWorktreeSession({
      worktreePath,
      worktreeBranch: branchName,
      originalCwd: repoRoot,
      originalHeadCommit: originalCommit ?? '',
      createdAt: Date.now(),
    })

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          worktreePath,
          worktreeBranch: branchName,
          message:
            `Created worktree at ${worktreePath} on branch ${branchName}. ` +
            'All subsequent file edits will target this worktree. ' +
            'Call ExitWorktree(action="keep") to keep the branch or ExitWorktree(action="remove") to discard.',
        }),
      }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string',
            description: 'Optional slug for the branch name (alphanumeric/dots/hyphens, max 64)',
            pattern: '^[a-zA-Z0-9._-]{1,64}$',
          },
        },
        required: [],
      },
    }
  },
}
