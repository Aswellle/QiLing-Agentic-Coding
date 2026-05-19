/**
 * ToolSearch tool prompt — adapted from CC's tools/ToolSearchTool/prompt.ts
 *
 * ToolSearch fetches full schemas for deferred tools so they can be invoked.
 * Deferred tools appear by name in <system-reminder> messages until fetched.
 */

export { TOOL_SEARCH_TOOL_NAME } from './constants.js'

const PROMPT_HEAD = `Fetches full schema definitions for deferred tools so they can be called.

`

const TOOL_LOCATION_HINT = 'Deferred tools appear by name in <system-reminder> messages.'

const PROMPT_TAIL = ` Until fetched, only the name is known — there is no parameter schema, so the tool cannot be invoked. This tool takes a query, matches it against the deferred tool list, and returns the matched tools' complete JSONSchema definitions inside a <functions> block. Once a tool's schema appears in that result, it is callable exactly like any tool defined at the top of the prompt.

Result format: each matched tool appears as one <function>{"description": "...", "name": "...", "parameters": {...}}</function> line inside the <functions> block — the same encoding as the tool list at the top of this prompt.

Query forms:
- "select:Read,Edit,Grep" — fetch these exact tools by name
- "notebook jupyter" — keyword search, up to max_results best matches
- "+slack send" — require "slack" in the name, rank by remaining terms`

export function getPrompt(): string {
  return PROMPT_HEAD + TOOL_LOCATION_HINT + PROMPT_TAIL
}

/**
 * Format a single deferred tool line for the <available-deferred-tools> message.
 */
export function formatDeferredToolLine(tool: { name: string }): string {
  return tool.name
}
