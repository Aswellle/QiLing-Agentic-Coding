import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'

export const EXIT_PLAN_MODE_TOOL_NAME = 'ExitPlanMode'

const inputSchema = z.object({
  plan: z.string().describe(
    'Your complete implementation plan. Write it in clear markdown: ' +
    'list the files you will change, what you will do in each, and why. ' +
    'Be specific enough that the user can meaningfully approve or reject it. ' +
    'Example:\n' +
    '## Plan\n' +
    '1. **src/auth/login.ts** — add rate limiting (max 5 attempts/min)\n' +
    '2. **src/auth/session.ts** — extend session expiry from 1h to 24h\n' +
    '3. **tests/auth.test.ts** — add tests for rate limiting'
  ),
})

export type ExitPlanModeInput = z.infer<typeof inputSchema>

export const ExitPlanModeTool: Tool<ExitPlanModeInput> = {
  name: EXIT_PLAN_MODE_TOOL_NAME,

  description:
    'Exit Plan Mode by presenting your implementation plan to the user for approval. ' +
    'The user will see your plan and can approve it (you then execute) or reject it ' +
    '(you revise the plan). ' +
    'ONLY call this after you have fully explored the codebase and have a concrete plan. ' +
    'Do NOT use AskUserQuestion to confirm the plan — use this tool instead. ' +
    'Do NOT reference "the plan" in AskUserQuestion questions because users cannot see ' +
    'your plan until you call ExitPlanMode.',

  inputSchema,

  checkPermissions(_input: ExitPlanModeInput): PermissionDecision {
    return { type: 'allow' }
  },

  async call(_input: ExitPlanModeInput, _context: ToolContext): Promise<ToolResult> {
    // The actual plan presentation and approval wait are handled by query.ts
    // intercepting this tool via the onExitPlanMode callback.
    // By the time we reach here, the user has already approved or rejected.
    // query.ts injects `_approved` into input before calling call().
    const approved = (_input as ExitPlanModeInput & { _approved?: boolean })._approved

    if (approved === false) {
      return {
        content: [{
          type: 'text',
          text: 'The user rejected your plan. Revise it and call ExitPlanMode again, or ask the user what they want changed.',
        }],
      }
    }

    return {
      content: [{
        type: 'text',
        text: 'Plan approved. Exiting Plan Mode — you can now use all tools to execute the plan.',
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
          plan: {
            type: 'string',
            description: 'Complete implementation plan in markdown format',
          },
        },
        required: ['plan'],
      },
    }
  },
}
