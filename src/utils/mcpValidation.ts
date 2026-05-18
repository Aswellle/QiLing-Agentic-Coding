/**
 * MCP output validation — adapted from CC's utils/mcpValidation.ts
 *
 * Validates and truncates MCP tool outputs to stay within token limits.
 * Used by McpTool when processing tool responses.
 */

export const MCP_TOKEN_COUNT_THRESHOLD_FACTOR = 0.5
export const IMAGE_TOKEN_ESTIMATE = 1600
const DEFAULT_MAX_MCP_OUTPUT_TOKENS = 25_000

/**
 * Get the max allowed tokens for MCP tool output.
 * Reads MAX_MCP_OUTPUT_TOKENS env var, falls back to default.
 */
export function getMaxMcpOutputTokens(): number {
  const envValue = process.env.MAX_MCP_OUTPUT_TOKENS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_MAX_MCP_OUTPUT_TOKENS
}

export type MCPToolResult = string | Array<{ type: string; text?: string; data?: string }> | undefined

/**
 * Estimate the token count for MCP content.
 * Text: ~4 chars/token. Images: fixed estimate.
 */
export function getContentSizeEstimate(content: MCPToolResult): number {
  if (!content) return 0
  if (typeof content === 'string') return Math.ceil(content.length / 4)

  return content.reduce((acc, block) => {
    if (block.type === 'text' && block.text) return acc + Math.ceil(block.text.length / 4)
    if (block.type === 'image') return acc + IMAGE_TOKEN_ESTIMATE
    return acc
  }, 0)
}

/**
 * Check if MCP content exceeds the token threshold.
 */
export function mcpContentNeedsTruncation(
  content: MCPToolResult,
  maxTokens = DEFAULT_MAX_MCP_OUTPUT_TOKENS,
): boolean {
  return getContentSizeEstimate(content) > maxTokens
}

/**
 * Truncate MCP content to fit within the token limit.
 * Returns the truncated content and a flag indicating truncation occurred.
 */
export function truncateMcpContentIfNeeded(
  content: MCPToolResult,
  maxTokens = DEFAULT_MAX_MCP_OUTPUT_TOKENS,
): { content: MCPToolResult; wasTruncated: boolean } {
  if (!mcpContentNeedsTruncation(content, maxTokens)) {
    return { content, wasTruncated: false }
  }

  if (typeof content === 'string') {
    const maxChars = maxTokens * 4
    return {
      content: content.slice(0, maxChars) + '\n[... output truncated ...]',
      wasTruncated: true,
    }
  }

  if (!Array.isArray(content)) return { content, wasTruncated: false }

  const maxChars = maxTokens * 4
  let remaining = maxChars
  const truncated: typeof content = []

  for (const block of content) {
    if (block.type === 'text' && block.text) {
      if (remaining <= 0) { truncated.push({ type: 'text', text: '[... output truncated ...]' }); break }
      const take = Math.min(block.text.length, remaining)
      truncated.push({ ...block, text: block.text.slice(0, take) + (take < block.text.length ? '...' : '') })
      remaining -= take
    } else if (block.type === 'image') {
      truncated.push(block)
      remaining -= IMAGE_TOKEN_ESTIMATE
    } else {
      truncated.push(block)
    }
  }

  return { content: truncated, wasTruncated: true }
}
