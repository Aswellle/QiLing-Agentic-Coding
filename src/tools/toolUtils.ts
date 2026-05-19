/**
 * Tool message tagging utilities — adapted from CC's tools/utils.ts
 *
 * Helpers for linking tool results to their initiating tool use blocks.
 */

import type { Message, ToolUseContent } from '../types/message.js'

/**
 * Tag messages with a sourceToolUseID so they stay transient in the UI
 * until the tool resolves. Prevents "is running" messages from duplicating.
 */
export function tagMessagesWithToolUseID(
  messages: Message[],
  toolUseID: string | undefined,
): Message[] {
  if (!toolUseID) return messages
  return messages.map(m => {
    if (m.role === 'user') {
      return { ...m, sourceToolUseID: toolUseID } as Message & { sourceToolUseID: string }
    }
    return m
  })
}

/**
 * Extract the tool use ID from a parent assistant message for a given tool name.
 * Returns undefined if no matching tool use block is found.
 */
export function getToolUseIDFromParentMessage(
  parentMessage: Message,
  toolName: string,
): string | undefined {
  if (parentMessage.role !== 'assistant' || !Array.isArray(parentMessage.content)) {
    return undefined
  }
  const block = parentMessage.content.find(
    (b): b is ToolUseContent => b.type === 'tool_use' && b.name === toolName,
  )
  return block?.id
}
