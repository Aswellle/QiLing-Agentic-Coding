import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'

const inputSchema = z.object({
  url: z.string().url().describe('The URL to fetch'),
  method: z.enum(['GET', 'POST']).default('GET').describe('HTTP method'),
  headers: z.record(z.string()).optional().describe('Additional HTTP headers'),
  body: z.string().optional().describe('Request body for POST requests'),
  max_length: z.number().int().default(20000).describe('Maximum characters to return'),
})

type Input = z.infer<typeof inputSchema>

export const WebFetchTool: Tool<Input> = {
  name: 'WebFetch',
  description:
    'Fetch the content of a URL. Returns the response body as text. ' +
    'Automatically strips HTML tags and extracts readable text. ' +
    'Useful for reading documentation, API responses, and web pages.',
  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    return { type: 'ask', description: `Fetch URL: ${input.url}` }
  },

  async call(input: Input, _context: ToolContext): Promise<ToolResult> {
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: {
          'User-Agent': 'QiLing/0.1.0 (AI Programming Agent)',
          Accept: 'text/html,application/json,text/plain,*/*',
          ...input.headers,
        },
        body: input.body,
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        return {
          content: [{ type: 'text', text: `HTTP ${response.status} ${response.statusText}: ${input.url}` }],
          isError: true,
        }
      }

      const contentType = response.headers.get('content-type') ?? ''
      const text = await response.text()

      let processed = text
      if (contentType.includes('text/html')) {
        processed = stripHtml(text)
      }

      if (processed.length > input.max_length) {
        processed = processed.slice(0, input.max_length) + `\n\n[Truncated. Total length: ${processed.length} chars]`
      }

      return {
        content: [{ type: 'text', text: processed }],
      }
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

  isConcurrencySafe: () => true,

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' },
          headers: { type: 'object', description: 'HTTP headers' },
          body: { type: 'string', description: 'Request body for POST' },
          max_length: { type: 'integer', description: 'Max chars to return', default: 20000 },
        },
        required: ['url'],
      },
    }
  },
}

function stripHtml(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Replace block elements with newlines
    .replace(/<(?:br|p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
