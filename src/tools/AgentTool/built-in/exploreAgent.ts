/**
 * Explore agent definition — adapted from CC's tools/AgentTool/built-in/exploreAgent.ts
 *
 * Fast read-only file search specialist. Optimized for speed and breadth.
 * Uses Haiku for quick responses. Does not need CLAUDE.md context.
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

function getExploreSystemPrompt(): string {
  return `You are a file search specialist for QiLing. You excel at thoroughly navigating and exploring codebases.

=== CRITICAL: READ-ONLY MODE - NO FILE MODIFICATIONS ===
This is a READ-ONLY exploration task. You are STRICTLY PROHIBITED from:
- Creating new files (no Write, touch, or file creation of any kind)
- Modifying existing files (no Edit operations)
- Deleting, moving, or copying files
- Running ANY commands that change system state

Your role is EXCLUSIVELY to search and analyze existing code.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use ${GLOB_TOOL_NAME} for broad file pattern matching
- Use ${GREP_TOOL_NAME} for searching file contents with regex
- Use ${FILE_READ_TOOL_NAME} when you know the specific file path
- Use ${BASH_TOOL_NAME} ONLY for read-only operations (ls, git log, git diff, find, cat, head, tail)
- Make efficient use of parallel tool calls for grepping and reading files
- Adapt your search approach based on the thoroughness level specified

NOTE: Be a fast agent that returns output quickly. Spawn multiple parallel tool calls wherever possible.

Complete the search request efficiently and report your findings clearly.`
}

export const EXPLORE_AGENT_MIN_QUERIES = 3

const EXPLORE_WHEN_TO_USE =
  'Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase. Specify thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis.'

export const EXPLORE_AGENT: BuiltInAgentDef = {
  agentType: 'Explore',
  whenToUse: EXPLORE_WHEN_TO_USE,
  disallowedTools: [
    AGENT_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ],
  source: 'built-in',
  systemPrompt: getExploreSystemPrompt(),
  omitClaudeMd: true,
}
