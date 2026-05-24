/**
 * Aggregated tool name constants — adapted from CC's constants/tools.ts
 *
 * Aggregates all tool names and defines reusable tool sets for:
 * - Agent tool allowlists/denylists
 * - Plan mode tool filtering
 * - Coordinator mode tool filtering
 * - Shell tool name detection
 */

import { AGENT_TOOL_NAME } from '../tools/AgentTool/constants.js'
import { ENTER_PLAN_MODE_TOOL_NAME } from '../tools/EnterPlanModeTool/constants.js'
import { EXIT_PLAN_MODE_TOOL_NAME, EXIT_PLAN_MODE_V2_TOOL_NAME } from '../tools/ExitPlanModeTool/constants.js'
import { ENTER_WORKTREE_TOOL_NAME } from '../tools/EnterWorktreeTool/constants.js'
import { EXIT_WORKTREE_TOOL_NAME } from '../tools/ExitWorktreeTool/constants.js'
import { FILE_EDIT_TOOL_NAME } from '../tools/FileEditTool/constants.js'
import { FILE_READ_TOOL_NAME } from '../tools/FileReadTool/prompt.js'
import { FILE_WRITE_TOOL_NAME } from '../tools/FileWriteTool/prompt.js'
import { GLOB_TOOL_NAME } from '../tools/GlobTool/prompt.js'
import { GREP_TOOL_NAME } from '../tools/GrepTool/prompt.js'
import { NOTEBOOK_EDIT_TOOL_NAME } from '../tools/NotebookEditTool/constants.js'
import { SEND_MESSAGE_TOOL_NAME } from '../tools/SendMessageTool/constants.js'
import { SKILL_TOOL_NAME } from '../tools/SkillTool/constants.js'
import { TOOL_SEARCH_TOOL_NAME } from '../tools/ToolSearchTool/prompt.js'
import { TASK_CREATE_TOOL_NAME } from '../tools/TaskCreateTool/constants.js'
import { TASK_GET_TOOL_NAME } from '../tools/TaskGetTool/constants.js'
import { TASK_LIST_TOOL_NAME } from '../tools/TaskListTool/constants.js'
import { TASK_OUTPUT_TOOL_NAME } from '../tools/TaskOutputTool/constants.js'
import { TASK_UPDATE_TOOL_NAME } from '../tools/TaskUpdateTool/constants.js'
import { TODO_WRITE_TOOL_NAME } from '../tools/TodoWriteTool/constants.js'
import { TEAM_CREATE_TOOL_NAME } from '../tools/TeamCreateTool/constants.js'
import { TEAM_DELETE_TOOL_NAME } from '../tools/TeamDeleteTool/constants.js'

// ─── Shell tool names ─────────────────────────────────────────────────────────

export const BASH_TOOL_NAME = 'Bash'
export const POWERSHELL_TOOL_NAME = 'PowerShell'

/** All shell tool names — used by shell-detection logic in query engine */
export const SHELL_TOOL_NAMES = new Set([BASH_TOOL_NAME, POWERSHELL_TOOL_NAME])

// ─── Cron tool names ──────────────────────────────────────────────────────────

export const CRON_CREATE_TOOL_NAME = 'CronCreate'
export const CRON_DELETE_TOOL_NAME = 'CronDelete'
export const CRON_LIST_TOOL_NAME = 'CronList'

// ─── Web tool names ───────────────────────────────────────────────────────────

export const WEB_SEARCH_TOOL_NAME = 'WebSearch'
export const WEB_FETCH_TOOL_NAME = 'WebFetch'

// ─── Ask user question ────────────────────────────────────────────────────────

export const ASK_USER_QUESTION_TOOL_NAME = 'AskUserQuestion'

// ─── Task stop ────────────────────────────────────────────────────────────────

export const TASK_STOP_TOOL_NAME = 'TaskStop'

// ─── Synthetic output ─────────────────────────────────────────────────────────

export const SYNTHETIC_OUTPUT_TOOL_NAME = 'SyntheticOutput'

// ─── Re-exports for convenience ───────────────────────────────────────────────

export {
  AGENT_TOOL_NAME,
  ENTER_PLAN_MODE_TOOL_NAME,
  EXIT_PLAN_MODE_TOOL_NAME,
  EXIT_PLAN_MODE_V2_TOOL_NAME,
  ENTER_WORKTREE_TOOL_NAME,
  EXIT_WORKTREE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  SKILL_TOOL_NAME,
  TASK_CREATE_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
  TASK_OUTPUT_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  TODO_WRITE_TOOL_NAME,
  TEAM_CREATE_TOOL_NAME,
  TEAM_DELETE_TOOL_NAME,
  TOOL_SEARCH_TOOL_NAME,
}

// ─── Write tools (tools that modify files) ────────────────────────────────────

export const WRITE_TOOLS = new Set([
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
])

// ─── Read-only tools (safe for plan mode) ────────────────────────────────────

export const READ_ONLY_TOOLS = new Set([
  FILE_READ_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  TODO_WRITE_TOOL_NAME,  // todo is read-only in plan mode
  ASK_USER_QUESTION_TOOL_NAME,
])

// ─── Tools disallowed for sub-agents ─────────────────────────────────────────

// FROM CC: AGENT_TOOL_NAME conditionally allowed for Anthropic-internal users
export const ALL_AGENT_DISALLOWED_TOOLS = new Set([
  TASK_OUTPUT_TOOL_NAME,
  EXIT_PLAN_MODE_V2_TOOL_NAME,
  ENTER_PLAN_MODE_TOOL_NAME,
  ...(process.env.USER_TYPE === 'ant' ? [] : [AGENT_TOOL_NAME]),
  ASK_USER_QUESTION_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
])

// FROM CC: CUSTOM_AGENT_DISALLOWED_TOOLS — same as ALL but may diverge for custom agents
export const CUSTOM_AGENT_DISALLOWED_TOOLS = new Set([
  ...ALL_AGENT_DISALLOWED_TOOLS,
])

// FROM CC: ASYNC_AGENT_ALLOWED_TOOLS — tools available to async (out-of-process) agents
export const ASYNC_AGENT_ALLOWED_TOOLS = new Set([
  FILE_READ_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  TODO_WRITE_TOOL_NAME,
  GREP_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  GLOB_TOOL_NAME,
  ...SHELL_TOOL_NAMES,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  SKILL_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,
  TOOL_SEARCH_TOOL_NAME,
  ENTER_WORKTREE_TOOL_NAME,
  EXIT_WORKTREE_TOOL_NAME,
])

// FROM CC: IN_PROCESS_TEAMMATE_ALLOWED_TOOLS — extra tools for in-process teammates
export const IN_PROCESS_TEAMMATE_ALLOWED_TOOLS = new Set([
  TASK_CREATE_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  CRON_LIST_TOOL_NAME,
])

// ─── Tools allowed in coordinator mode ───────────────────────────────────────

export const COORDINATOR_MODE_ALLOWED_TOOLS = new Set([
  AGENT_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  TASK_CREATE_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
  TEAM_CREATE_TOOL_NAME,
  TEAM_DELETE_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
])
