/**
 * Query helper utilities — adapted from CC's utils/queryHelpers.ts
 *
 * Utilities for analyzing conversation messages to extract file reads,
 * bash commands, and other tool usage patterns. Used by the compact engine,
 * permission system, and session memory.
 *
 * QiLing adaptation: uses QiLing's Message type and tool names.
 */

import type { Message } from '../types/message'
import { createFileStateCacheWithSizeLimit, type FileStateCache } from './fileStateCache'

// ─── Tool name constants ──────────────────────────────────────────────────────

const FILE_READ_TOOL_NAME = 'FileRead'
const FILE_WRITE_TOOL_NAME = 'FileWrite'
const FILE_EDIT_TOOL_NAME = 'FileEdit'
const BASH_TOOL_NAME = 'Bash'
const POWERSHELL_TOOL_NAME = 'PowerShell'

// ─── Type helpers ─────────────────────────────────────────────────────────────

type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: unknown }
type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content?: unknown }

function isToolUseBlock(b: unknown): b is ToolUseBlock {
  return typeof b === 'object' && b !== null && (b as { type?: string }).type === 'tool_use'
}

function isToolResultBlock(b: unknown): b is ToolResultBlock {
  return typeof b === 'object' && b !== null && (b as { type?: string }).type === 'tool_result'
}

// ─── File extraction from messages ───────────────────────────────────────────

/**
 * Extract files that were read in the current conversation.
 * Returns a FileStateCache populated with the latest content for each file.
 *
 * Used by compact engine and permission system to know which files have been seen.
 */
export function extractReadFilesFromMessages(
  messages: Message[],
  _cwd: string,
  maxSize = 10,
): FileStateCache {
  const cache = createFileStateCacheWithSizeLimit(maxSize)

  // Map tool_use_id → file path for read operations
  const fileReadIds = new Map<string, string>()  // id → filePath
  const fileWriteIds = new Map<string, { filePath: string; content: string }>()

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    if (!Array.isArray(message.content)) continue

    for (const block of message.content) {
      if (!isToolUseBlock(block)) continue
      const input = block.input as Record<string, unknown>
      const filePath = typeof input.file_path === 'string' ? input.file_path : null

      if (block.name === FILE_READ_TOOL_NAME && filePath) {
        fileReadIds.set(block.id, filePath)
      } else if (block.name === FILE_WRITE_TOOL_NAME && filePath) {
        const content = typeof input.content === 'string' ? input.content : ''
        fileWriteIds.set(block.id, { filePath, content })
      } else if (block.name === FILE_EDIT_TOOL_NAME && filePath) {
        fileReadIds.set(block.id, filePath)
      }
    }
  }

  // Process tool results to populate cache
  for (const message of messages) {
    if (message.role !== 'user') continue
    if (!Array.isArray(message.content)) continue

    for (const block of message.content) {
      if (!isToolResultBlock(block)) continue

      // File read result
      const filePath = fileReadIds.get(block.tool_use_id)
      if (filePath) {
        const text = typeof block.content === 'string' ? block.content
          : Array.isArray(block.content)
            ? (block.content as Array<{ type: string; text?: string }>)
                .filter(b => b.type === 'text').map(b => b.text ?? '').join('')
            : ''
        cache.set(filePath, { content: text, timestamp: Date.now(), offset: undefined, limit: undefined })
      }

      // File write result — cache the written content
      const writeInfo = fileWriteIds.get(block.tool_use_id)
      if (writeInfo) {
        cache.set(writeInfo.filePath, {
          content: writeInfo.content,
          timestamp: Date.now(),
          offset: undefined,
          limit: undefined,
        })
      }
    }
  }

  return cache
}

// ─── Bash command extraction ──────────────────────────────────────────────────

/**
 * Extract all bash commands that were run in the conversation.
 * Returns a Set of command strings.
 */
export function extractBashCommandsFromMessages(messages: Message[]): Set<string> {
  const commands = new Set<string>()

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    if (!Array.isArray(message.content)) continue

    for (const block of message.content) {
      if (!isToolUseBlock(block)) continue
      if (block.name !== BASH_TOOL_NAME && block.name !== POWERSHELL_TOOL_NAME) continue

      const input = block.input as Record<string, unknown>
      if (typeof input.command === 'string') {
        commands.add(input.command)
      }
    }
  }

  return commands
}

/**
 * Extract all tool names used in the conversation.
 */
export function extractToolNamesFromMessages(messages: Message[]): Set<string> {
  const tools = new Set<string>()

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    if (!Array.isArray(message.content)) continue

    for (const block of message.content) {
      if (isToolUseBlock(block)) tools.add(block.name)
    }
  }

  return tools
}

/**
 * Count total tool calls in the conversation.
 */
export function countToolCallsInMessages(messages: Message[]): number {
  let count = 0
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    if (!Array.isArray(message.content)) continue
    for (const block of message.content) {
      if (isToolUseBlock(block)) count++
    }
  }
  return count
}

/**
 * Check if the last assistant turn contained tool calls.
 */
export function lastTurnHadToolCalls(messages: Message[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (msg.role !== 'assistant') continue
    if (!Array.isArray(msg.content)) return false
    return msg.content.some(isToolUseBlock)
  }
  return false
}
