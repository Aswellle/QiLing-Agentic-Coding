/**
 * WebFetch tool — CC-aligned with prompt post-processing + URL caching
 *
 * New vs old:
 *  - prompt param: apply a Haiku query to the fetched content (CC's applyPromptToMarkdown)
 *  - In-memory URL cache (15-minute TTL, saves duplicate fetches)
 *  - MAX_MARKDOWN_LENGTH 100k chars (CC's limit)
 *  - Redirect detection and reporting
 *  - Better HTML stripping
 */

import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'

const MAX_MARKDOWN_LENGTH = 100_000
const CACHE_TTL_MS = 15 * 60 * 1000  // 15 minutes (mirrors CC's URL_CACHE TTL)

// Simple in-memory URL cache — avoids refetching the same URL repeatedly in one session
const urlCache = new Map<string, { content: string; fetchedAt: number }>()

function getCachedContent(url: string): string | null {
  const entry = urlCache.get(url)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    urlCache.delete(url)
    return null
  }
  return entry.content
}
function setCachedContent(url: string, content: string): void {
  urlCache.set(url, { content, fetchedAt: Date.now() })
  // Evict entries over 50 to bound memory
  if (urlCache.size > 50) {
    const oldest = [...urlCache.entries()].sort(([, a], [, b]) => a.fetchedAt - b.fetchedAt)[0]
    if (oldest) urlCache.delete(oldest[0])
  }
}

const inputSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from'),
  prompt: z.string().optional().describe(
    'Optional prompt to apply to the fetched content. When provided, the content is ' +
    'processed through a fast model with this prompt and only the processed result is returned. ' +
    'Useful for: extracting specific information, summarizing, or filtering web content.'
  ),
  method: z.enum(['GET', 'POST']).default('GET').describe('HTTP method'),
  headers: z.record(z.string()).optional().describe('Additional HTTP headers'),
  body: z.string().optional().describe('Request body for POST requests'),
  max_length: z.number().int().optional().describe(
    `Maximum characters to return (default: ${MAX_MARKDOWN_LENGTH}). ` +
    'Use prompt parameter for targeted extraction from long pages.'
  ),
})

type Input = z.infer<typeof inputSchema>

export const WebFetchTool: Tool<Input> = {
  name: 'WebFetch',
  description:
    'Fetches content from a URL and returns it as text. ' +
    'Automatically strips HTML tags to return readable text. ' +
    'Use the prompt parameter to extract specific information from long pages — ' +
    'the fetched content is processed through a fast model with your prompt. ' +
    'Results are cached for 15 minutes to avoid repeated fetches.',
  inputSchema,
  isConcurrencySafe: () => true,

  checkPermissions(input: Input): PermissionDecision {
    try {
      const hostname = new URL(input.url).hostname
      return { type: 'ask', description: `从 ${hostname} 获取内容: ${input.url}` }
    } catch {
      return { type: 'ask', description: `Fetch URL: ${input.url}` }
    }
  },

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const maxLength = input.max_length ?? MAX_MARKDOWN_LENGTH
    const cacheKey = `${input.method ?? 'GET'}:${input.url}`

    // Check cache (only for GET requests without body)
    if ((!input.method || input.method === 'GET') && !input.body) {
      const cached = getCachedContent(cacheKey)
      if (cached) {
        const result = input.prompt
          ? await applyPrompt(input.prompt, cached, maxLength, context)
          : truncate(cached, maxLength)
        return { content: [{ type: 'text', text: `[cached] ${result}` }] }
      }
    }

    try {
      const response = await fetch(input.url, {
        method: input.method ?? 'GET',
        headers: {
          'User-Agent': 'QiLing/0.3.0 (AI Programming Agent)',
          Accept: 'text/markdown, text/html, application/json, text/plain, */*',
          ...input.headers,
        },
        body: input.body,
        signal: AbortSignal.timeout(30_000),
        redirect: 'follow',
      })

      if (!response.ok) {
        return {
          content: [{ type: 'text', text: `HTTP ${response.status} ${response.statusText}: ${input.url}` }],
          isError: true,
        }
      }

      const contentType = response.headers.get('content-type') ?? ''
      const raw = await response.text()
      const finalUrl = response.url !== input.url ? ` (redirected to: ${response.url})` : ''

      let processed = raw
      if (contentType.includes('text/html')) {
        processed = stripHtml(raw)
      }

      // Cache the processed content
      if ((!input.method || input.method === 'GET') && !input.body) {
        setCachedContent(cacheKey, processed)
      }

      const result = input.prompt
        ? await applyPrompt(input.prompt, processed, maxLength, context)
        : truncate(processed, maxLength)

      return { content: [{ type: 'text', text: finalUrl ? `${result}\n${finalUrl}` : result }] }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      }
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch content from' },
          prompt: { type: 'string', description: 'Optional prompt to apply to the fetched content' },
          method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' },
          headers: { type: 'object', additionalProperties: { type: 'string' }, description: 'HTTP headers' },
          body: { type: 'string', description: 'Request body for POST' },
          max_length: { type: 'integer', description: `Max chars to return (default: ${MAX_MARKDOWN_LENGTH})` },
        },
        required: ['url'],
      },
    }
  },
}

// ─── Prompt post-processing (CC's applyPromptToMarkdown pattern) ─────────────

async function applyPrompt(
  prompt: string,
  content: string,
  maxLength: number,
  context: ToolContext,
): Promise<string> {
  // Truncate content before sending to model
  const truncated = content.length > maxLength
    ? content.slice(0, maxLength) + '\n\n[Content truncated due to length...]'
    : content

  // Use Anthropic Haiku for fast processing (mirrors CC's queryHaiku pattern)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // No API key for Haiku — fall back to returning truncated content with prompt hint
    return `[Prompt: "${prompt}"]\n\n${truncate(truncated, maxLength)}`
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Here is content fetched from a web page:\n\n<content>\n${truncated}\n</content>\n\n${prompt}`,
        }],
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!resp.ok) return truncate(truncated, maxLength)
    const data = await resp.json() as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find(b => b.type === 'text')?.text
    return text ?? truncate(truncated, maxLength)
  } catch {
    return truncate(truncated, maxLength)
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + `\n\n[Truncated. Total: ${text.length.toLocaleString()} chars]`
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<(?:br|p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
}
