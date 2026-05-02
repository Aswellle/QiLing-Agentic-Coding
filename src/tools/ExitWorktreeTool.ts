import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import {
  getActiveWorktreeSession, setActiveWorktreeSession,
  removeWorktree, deleteWorktreeBranch, getWorktreeChangeSummary,
} from '../services/worktree/store'

export const EXIT_WORKTREE_TOOL_NAME = 'ExitWorktree'

const inputSchema = z.object({
  action: z.enum(['keep', 'remove']).describe(
    '"keep" — exit the worktree but leave the branch intact (user can merge it later).\n' +
    '"remove" — delete the worktree directory and its branch, discarding all changes.'
  ),
  discard_changes: z.boolean().default(false).describe(
    'When action="remove": if true, force-remove even if there are uncommitted changes or new commits. ' +
    'Default false — safety check refuses if changes exist.'
  ),
})

type Input = z.infer<typeof inputSchema>

export const ExitWorktreeTool: Tool<Input> = {
  name: EXIT_WORKTREE_TOOL_NAME,

  description:
    'Exit the current git worktree session. ' +
    'Use action="keep" to preserve the worktree branch for later merging or review. ' +
    'Use action="remove" to discard all changes in the worktree (irreversible). ' +
    'After exiting, file edits return to the original working directory.',

  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    if (input.action === 'remove') {
      return {
        type: 'ask',
        description: `Remove worktree and discard all changes${input.discard_changes ? ' (force)' : ''}`,
      }
    }
    return { type: 'allow' }
  },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const session = getActiveWorktreeSession()
    if (!session) {
      return {
        content: [{ type: 'text', text: 'No active worktree session. Call EnterWorktree first.' }],
        isError: true,
      }
    }

    const { worktreePath, worktreeBranch, originalCwd, originalHeadCommit } = session

    if (input.action === 'keep') {
      setActiveWorktreeSession(null)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'keep',
            worktreePath,
            worktreeBranch,
            originalCwd,
            message: `Exited worktree. Branch '${worktreeBranch}' preserved at ${worktreePath}. ` +
              `Returned to ${originalCwd}. You can merge the branch when ready.`,
          }),
        }],
      }
    }

    // action === 'remove'
    if (!input.discard_changes) {
      const summary = await getWorktreeChangeSummary(worktreePath, originalHeadCommit)
      if (summary.changedFiles > 0 || summary.newCommits > 0) {
        return {
          content: [{
            type: 'text',
            text: [
              `Cannot remove: worktree has ${summary.changedFiles} uncommitted file(s) and ${summary.newCommits} new commit(s).`,
              'Options:',
              '  1. Commit or stash your changes, then call ExitWorktree(action="remove") again.',
              '  2. Call ExitWorktree(action="remove", discard_changes=true) to force-delete (IRREVERSIBLE).',
              '  3. Call ExitWorktree(action="keep") to preserve the worktree branch.',
            ].join('\n'),
          }],
          isError: true,
        }
      }
    }

    const removeResult = await removeWorktree(originalCwd, worktreePath, input.discard_changes)
    if (!removeResult.ok) {
      // Fallback: try force
      const forceResult = await removeWorktree(originalCwd, worktreePath, true)
      if (!forceResult.ok) {
        return {
          content: [{ type: 'text', text: `Error removing worktree: ${removeResult.error}` }],
          isError: true,
        }
      }
    }

    // Delete the branch
    await deleteWorktreeBranch(originalCwd, worktreeBranch)
    setActiveWorktreeSession(null)

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'remove',
          worktreePath,
          worktreeBranch,
          originalCwd,
          message: `Worktree removed and branch '${worktreeBranch}' deleted. Returned to ${originalCwd}.`,
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
          action: {
            type: 'string',
            enum: ['keep', 'remove'],
            description: '"keep" = preserve branch, "remove" = discard all changes',
          },
          discard_changes: {
            type: 'boolean',
            description: 'Force remove even with uncommitted changes (default false)',
            default: false,
          },
        },
        required: ['action'],
      },
    }
  },
}
