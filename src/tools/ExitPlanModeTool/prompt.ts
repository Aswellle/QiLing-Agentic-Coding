/**
 * ExitPlanMode tool prompt — adapted from CC's tools/ExitPlanModeTool/prompt.ts
 *
 * Signals readiness for user approval after plan writing.
 */

import { ASK_USER_QUESTION_TOOL_NAME } from '../AskUserQuestionTool/prompt.js'

export const EXIT_PLAN_MODE_V2_TOOL_PROMPT = `Use this tool when you are in plan mode and have finished writing your plan and are ready for user approval.

## How This Tool Works
- You should have already written your plan to the plan file
- This tool signals that you're done planning and ready for the user to review and approve
- The user will see the contents of your plan when they review it

## When to Use This Tool
IMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or understanding the codebase - do NOT use this tool.

## Before Using This Tool
Ensure your plan is complete and unambiguous:
- If you have unresolved questions about requirements or approach, use ${ASK_USER_QUESTION_TOOL_NAME} first
- Once your plan is finalized, use THIS tool to request approval

**Important:** Do NOT use ${ASK_USER_QUESTION_TOOL_NAME} to ask "Is this plan okay?" or "Should I proceed?" — that's exactly what THIS tool does.
`
