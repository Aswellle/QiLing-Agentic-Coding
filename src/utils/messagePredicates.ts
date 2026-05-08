/**
 * Message type predicates — ported from CC's utils/messagePredicates.ts (adapted for QiLing types)
 *
 * Distinguishes human turns from tool_result/meta messages. In QiLing, user
 * messages can be either real human turns or synthetic tool-result messages;
 * checking role === 'user' alone is not sufficient.
 */
import type { Message } from '../types/message'

export function isHumanTurn(m: Message): boolean {
  if (m.role !== 'user') return false
  if (m.isMeta) return false
  const content = m.content
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0]
    if (first && typeof first === 'object' && 'type' in first) {
      if ((first as { type: string }).type === 'tool_result') return false
    }
  }
  return true
}
