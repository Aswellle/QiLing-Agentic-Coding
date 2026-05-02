import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { getActiveRegistry } from './index'

const inputSchema = z.object({
  query: z.string().describe(
    'Search query for finding tools. Supported forms:\n' +
    '  "select:Read,Edit,Grep"   — exact match by name (comma-separated)\n' +
    '  "web search"              — keyword search across name and description\n' +
    '  "+task create"            — "+" prefix = must appear in tool name'
  ),
  max_results: z.number().int().min(1).max(20).default(5)
    .describe('Maximum number of results to return (default 5)'),
})

type Input = z.infer<typeof inputSchema>

// Split CamelCase/underscore tool names into tokens for scoring
function tokenise(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

function scoreMatch(name: string, description: string, terms: string[], required: string[]): number {
  const nameLower = name.toLowerCase()
  const descLower = description.toLowerCase()
  const nameParts = tokenise(name)

  // Required terms must appear in name or description
  for (const req of required) {
    if (!nameLower.includes(req) && !descLower.includes(req)) return -1
  }

  let score = 0
  for (const term of terms) {
    if (nameParts.includes(term)) score += 10          // exact token in name
    else if (nameLower.includes(term)) score += 5      // substring in name
    else if (descLower.includes(term)) score += 2      // in description
  }
  return score
}

export const ToolSearchTool: Tool<Input> = {
  name: 'ToolSearch',

  description:
    'Search for available tools by name or description. ' +
    'Use when you need to find a tool but are not sure of its exact name. ' +
    'Supports exact selection ("select:ToolA,ToolB"), keyword search, ' +
    'and required-term prefix ("+mcp" forces "mcp" in the tool name). ' +
    'Returns tool names and short descriptions.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const registry = getActiveRegistry()
    if (!registry) {
      return {
        content: [{ type: 'text', text: 'Tool registry not yet initialised.' }],
        isError: true,
      }
    }

    const allTools = Array.from(registry.values())
    const maxResults = input.max_results ?? 5
    const query = input.query.trim()

    // ── select: mode ──────────────────────────────────────────────────────────
    if (query.startsWith('select:')) {
      const names = query.slice(7).split(',').map(s => s.trim()).filter(Boolean)
      const found: Array<{ name: string; description: string }> = []
      const missing: string[] = []
      for (const n of names) {
        const tool = registry.get(n)
        if (tool) found.push({ name: tool.name, description: tool.description.slice(0, 100) })
        else missing.push(n)
      }
      const lines = found.map(t => `${t.name}: ${t.description}`)
      if (missing.length) lines.push(`Not found: ${missing.join(', ')}`)
      return {
        content: [{ type: 'text', text: lines.join('\n') + '\n\n' + JSON.stringify({ matches: found.map(t => t.name) }) }],
      }
    }

    // ── Exact name match ──────────────────────────────────────────────────────
    const exactMatch = registry.get(query)
    if (exactMatch) {
      return {
        content: [{
          type: 'text',
          text: `${exactMatch.name}: ${exactMatch.description}\n\n${JSON.stringify({ matches: [exactMatch.name] })}`,
        }],
      }
    }

    // ── Keyword search ────────────────────────────────────────────────────────
    const parts = query.toLowerCase().split(/\s+/)
    const required = parts.filter(p => p.startsWith('+')).map(p => p.slice(1))
    const terms = parts.filter(p => !p.startsWith('+')).filter(Boolean)

    const scored = allTools
      .map(t => ({ tool: t, score: scoreMatch(t.name, t.description, terms, required) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)

    if (scored.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No tools match "${query}". Available tools: ${allTools.map(t => t.name).join(', ')}\n\n${JSON.stringify({ matches: [] })}`,
        }],
      }
    }

    const lines = scored.map(({ tool }) =>
      `${tool.name}: ${tool.description.split('\n')[0].slice(0, 120)}`
    )
    return {
      content: [{
        type: 'text',
        text: `Found ${scored.length} tool(s) for "${query}":\n${lines.join('\n')}\n\n${JSON.stringify({ matches: scored.map(({ tool }) => tool.name) })}`,
      }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query (select:, keyword, or +required)' },
          max_results: { type: 'number', description: 'Max results (default 5)', default: 5 },
        },
        required: ['query'],
      },
    }
  },
}
