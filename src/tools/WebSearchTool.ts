import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'

export const WEB_SEARCH_TOOL_NAME = 'WebSearch'

// ─── Input schema ─────────────────────────────────────────────────────────────

const inputSchema = z.object({
  query: z.string().describe(
    'Search query. Be specific and include the current year when looking for recent information. ' +
    'Example: "TypeScript 5.5 new features 2025"'
  ),
  count: z.number().int().min(1).max(10).default(5)
    .describe('Number of results to return (1-10, default 5)'),
  allowedDomains: z.array(z.string()).optional()
    .describe('Restrict results to these domains, e.g. ["github.com", "docs.python.org"]'),
  blockedDomains: z.array(z.string()).optional()
    .describe('Exclude results from these domains'),
})

type WebSearchInput = z.infer<typeof inputSchema>

interface SearchResult {
  title: string
  url: string
  snippet: string
}

// ─── Brave Search API ─────────────────────────────────────────────────────────

async function searchBrave(
  query: string,
  count: number,
  apiKey: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(count))
  url.searchParams.set('text_decorations', '0')
  url.searchParams.set('result_filter', 'web')

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
    signal,
  })

  if (!res.ok) {
    throw new Error(`Brave Search API error ${res.status}: ${await res.text()}`)
  }

  const data = await res.json() as {
    web?: { results?: Array<{ title: string; url: string; description?: string }> }
  }

  return (data.web?.results ?? []).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.description ?? '',
  }))
}

// ─── DuckDuckGo fallback (no key required) ────────────────────────────────────

async function searchDuckDuckGo(
  query: string,
  count: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  // DDG Instant Answer API — returns abstract + related topics, not full SERP
  const url = new URL('https://api.duckduckgo.com/')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('no_html', '1')
  url.searchParams.set('skip_disambig', '1')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'QiLing/0.2 (AI Programming Agent)' },
    signal,
  })

  if (!res.ok) {
    throw new Error(`DuckDuckGo API error ${res.status}`)
  }

  const data = await res.json() as {
    AbstractTitle?: string
    AbstractURL?: string
    Abstract?: string
    RelatedTopics?: Array<{
      FirstURL?: string
      Text?: string
      Name?: string
    }>
  }

  const results: SearchResult[] = []

  // Main abstract result
  if (data.AbstractURL && data.Abstract) {
    results.push({
      title: data.AbstractTitle ?? query,
      url: data.AbstractURL,
      snippet: data.Abstract,
    })
  }

  // Related topics
  for (const topic of (data.RelatedTopics ?? [])) {
    if (results.length >= count) break
    if (!topic.FirstURL || !topic.Text) continue
    results.push({
      title: topic.Name ?? topic.Text.slice(0, 60),
      url: topic.FirstURL,
      snippet: topic.Text,
    })
  }

  return results.slice(0, count)
}

// ─── Domain filtering ─────────────────────────────────────────────────────────

function filterByDomain(
  results: SearchResult[],
  allowed?: string[],
  blocked?: string[]
): SearchResult[] {
  return results.filter(r => {
    let hostname: string
    try {
      hostname = new URL(r.url).hostname.replace(/^www\./, '')
    } catch {
      return true
    }
    if (allowed && allowed.length > 0 && !allowed.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
      return false
    }
    if (blocked && blocked.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
      return false
    }
    return true
  })
}

// ─── Format output ────────────────────────────────────────────────────────────

function formatResults(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `No results found for: ${query}`
  }

  const lines = [
    `Search results for: "${query}"`,
    `Found ${results.length} result(s):\n`,
  ]

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    lines.push(`[${i + 1}] ${r.title}`)
    lines.push(`    URL: ${r.url}`)
    if (r.snippet) lines.push(`    ${r.snippet}`)
    lines.push('')
  }

  lines.push('IMPORTANT: Always cite sources using markdown links [Title](URL) in your response.')

  return lines.join('\n')
}

// ─── Tool implementation ───────────────────────────────────────────────────────

export const WebSearchTool: Tool<WebSearchInput> = {
  name: WEB_SEARCH_TOOL_NAME,

  description:
    'Searches the web for current information. Use when you need up-to-date facts, ' +
    'documentation, or information beyond your training data. ' +
    'Always include the current year in queries about recent events or releases. ' +
    'After searching, include markdown source links [Title](URL) in your response. ' +
    'Requires BRAVE_SEARCH_API_KEY environment variable for full results; ' +
    'falls back to DuckDuckGo Instant Answers without a key.',

  inputSchema,

  checkPermissions(_input: WebSearchInput): PermissionDecision {
    return { type: 'allow' }
  },

  async call(input: WebSearchInput, _context: ToolContext): Promise<ToolResult> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY ?? process.env.SEARCH_API_KEY

    let results: SearchResult[]
    let source: string

    try {
      if (apiKey) {
        results = await searchBrave(input.query, input.count, apiKey)
        source = 'Brave Search'
      } else {
        results = await searchDuckDuckGo(input.query, input.count)
        source = 'DuckDuckGo (set BRAVE_SEARCH_API_KEY for richer results)'
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        content: [{ type: 'text', text: `Search failed: ${msg}` }],
        isError: true,
      }
    }

    // Apply domain filters
    if (input.allowedDomains || input.blockedDomains) {
      results = filterByDomain(results, input.allowedDomains, input.blockedDomains)
    }

    const output = formatResults(results, input.query)
    const footer = `\n[Source: ${source}]`

    return {
      content: [{ type: 'text', text: output + footer }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query. Include current year for recent info.',
          },
          count: {
            type: 'number',
            description: 'Number of results (1-10, default 5)',
            minimum: 1,
            maximum: 10,
            default: 5,
          },
          allowedDomains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Restrict to these domains (e.g. ["github.com"])',
          },
          blockedDomains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Exclude results from these domains',
          },
        },
        required: ['query'],
      },
    }
  },
}
