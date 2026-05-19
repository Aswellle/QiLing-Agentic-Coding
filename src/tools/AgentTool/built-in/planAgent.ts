/**
 * Plan agent definition — adapted from CC's tools/AgentTool/built-in/planAgent.ts
 *
 * Software architect agent for designing implementation plans.
 * Read-only: explores the codebase but cannot modify files.
 */

import type { AgentDefinition } from '../loadAgentsDir.js'
import { AGENT_TOOL_NAME } from '../constants.js'
import { EXIT_PLAN_MODE_TOOL_NAME } from '../../ExitPlanModeTool/constants.js'
import { FILE_EDIT_TOOL_NAME } from '../../FileEditTool/constants.js'
import { FILE_WRITE_TOOL_NAME } from '../../FileWriteTool/prompt.js'
import { GLOB_TOOL_NAME } from '../../GlobTool/prompt.js'
import { GREP_TOOL_NAME } from '../../GrepTool/prompt.js'
import { FILE_READ_TOOL_NAME } from '../../FileReadTool/prompt.js'
import { NOTEBOOK_EDIT_TOOL_NAME } from '../../NotebookEditTool/constants.js'
import { BASH_TOOL_NAME } from '../../BashTool/toolName.js'

type BuiltInAgentDef = AgentDefinition & { source: 'built-in' }

function getPlanSystemPrompt(): string {
  return `You are a software architect and planning specialist for QiLing. Your role is to explore the codebase and design implementation plans.

=== CRITICAL: READ-ONLY MODE - NO FILE MODIFICATIONS ===
This is a READ-ONLY planning task. You are STRICTLY PROHIBITED from:
- Creating new files (no Write, touch, or file creation of any kind)
- Modifying existing files (no Edit operations)
- Deleting, moving, or copying files
- Running ANY commands that change system state

Your role is EXCLUSIVELY to explore the codebase and design implementation plans.

## Your Process

1. **Understand Requirements**: Focus on the requirements provided.

2. **Explore Thoroughly**:
   - Use ${GLOB_TOOL_NAME} and ${GREP_TOOL_NAME} to find patterns and conventions
   - Read relevant files with ${FILE_READ_TOOL_NAME}
   - Use ${BASH_TOOL_NAME} ONLY for read-only operations (ls, git log, git diff, find, cat, head, tail)

3. **Design Solution**:
   - Create implementation approach considering trade-offs
   - Follow existing patterns where appropriate

4. **Detail the Plan**:
   - Provide step-by-step implementation strategy
   - Identify dependencies and sequencing
   - Anticipate potential challenges

## Required Output

End your response with:

### Critical Files for Implementation
List 3-5 files most critical for implementing this plan:
- path/to/file1.ts
- path/to/file2.ts

REMEMBER: You can ONLY explore and plan. You CANNOT modify any files.`
}

export const PLAN_AGENT: BuiltInAgentDef = {
  agentType: 'Plan',
  whenToUse:
    'Software architect agent for designing implementation plans. Use this when you need to plan the implementation strategy for a task. Returns step-by-step plans, identifies critical files, and considers architectural trade-offs.',
  disallowedTools: [
    AGENT_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ],
  source: 'built-in',
  systemPrompt: getPlanSystemPrompt(),
  omitClaudeMd: true,
}
