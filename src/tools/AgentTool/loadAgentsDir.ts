/**
 * Load custom agent definitions from disk.
 *
 * Searches for agent files in (highest priority first):
 *   1. <cwd>/.qiling/agents/  (project-scope)
 *   2. ~/.qiling/agents/       (user-scope)
 *
 * Supports two formats:
 *   - Markdown (.md): YAML frontmatter + system prompt body
 *   - JSON (.json): structured agent definition
 *
 * Ported/adapted from CC's AgentTool/loadAgentsDir.ts
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { BuiltInAgent } from './builtInAgents'

const AGENTS_SUBDIR = 'agents'

export type AgentSource = 'project' | 'user' | 'built-in' | 'plugin'

export interface CustomAgent extends BuiltInAgent {
  source: AgentSource
  filePath: string
}

/**
 * Unified agent definition type — covers both custom (disk) and built-in agents.
 * For built-in agents, source is 'built-in' and filePath is undefined.
 */
export type AgentDefinition = CustomAgent | (BuiltInAgent & { source: 'built-in'; filePath?: undefined })

function parseMarkdownAgent(filePath: string, content: string, source: AgentSource): CustomAgent | null {
  try {
    // Extract YAML frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
    if (!fmMatch) return null

    const [, frontmatter, body] = fmMatch
    const systemPrompt = body?.trim() ?? ''
    if (!systemPrompt) return null

    // Parse key YAML fields (simple parser, no heavy dep)
    const getField = (key: string): string | undefined => {
      const match = frontmatter?.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return match?.[1]?.trim().replace(/^['"]|['"]$/g, '')
    }
    const getListField = (key: string): string[] => {
      // Match: tools:\n  - a\n  - b  OR  tools: [a, b]
      const inlineMatch = frontmatter?.match(new RegExp(`^${key}:\\s*\\[([^\\]]+)\\]`, 'm'))
      if (inlineMatch) {
        return inlineMatch[1]!.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
      }
      const multiMatch = frontmatter?.match(new RegExp(`^${key}:\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'))
      if (multiMatch) {
        return multiMatch[1]!.split('\n')
          .map(l => l.trim().replace(/^-\s*/, '').replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      }
      return []
    }

    const agentType = getField('name') ?? getField('agentType')
    const whenToUse = getField('description') ?? getField('whenToUse')
    if (!agentType || !whenToUse) return null

    const tools = getListField('tools')
    const disallowedTools = getListField('disallowedTools')
    const modelRaw = getField('model')
    const color = getField('color')

    return {
      agentType,
      whenToUse,
      systemPrompt,
      disallowedTools,
      tools: tools.length > 0 ? tools : undefined,
      model: (modelRaw as BuiltInAgent['model']) ?? undefined,
      color,
      source,
      filePath,
    }
  } catch {
    return null
  }
}

function parseJsonAgent(filePath: string, content: string, source: AgentSource): CustomAgent | null {
  try {
    const data = JSON.parse(content) as Record<string, unknown>
    const agentType = (data.name ?? data.agentType) as string | undefined
    const whenToUse = (data.description ?? data.whenToUse) as string | undefined
    const systemPrompt = (data.prompt ?? data.systemPrompt) as string | undefined
    if (!agentType || !whenToUse || !systemPrompt) return null

    return {
      agentType,
      whenToUse,
      systemPrompt,
      disallowedTools: (data.disallowedTools as string[]) ?? [],
      tools: data.tools as string[] | undefined,
      model: data.model as BuiltInAgent['model'] | undefined,
      color: data.color as string | undefined,
      source,
      filePath,
    }
  } catch {
    return null
  }
}

function loadAgentsFromDir(dirPath: string, source: AgentSource): CustomAgent[] {
  if (!existsSync(dirPath)) return []

  const agents: CustomAgent[] = []
  const files = readdirSync(dirPath).filter(f => f.endsWith('.md') || f.endsWith('.json'))

  for (const file of files) {
    const filePath = join(dirPath, file)
    try {
      const content = readFileSync(filePath, 'utf-8')
      const agent = file.endsWith('.md')
        ? parseMarkdownAgent(filePath, content, source)
        : parseJsonAgent(filePath, content, source)
      if (agent) agents.push(agent)
    } catch { /* skip unreadable files */ }
  }

  return agents
}

let _cachedCustomAgents: CustomAgent[] | null = null

/**
 * Load all custom agent definitions from project and user directories.
 * Project agents take precedence over user agents with the same agentType.
 */
export function loadCustomAgents(cwd: string): CustomAgent[] {
  if (_cachedCustomAgents) return _cachedCustomAgents

  const projectAgents = loadAgentsFromDir(join(cwd, '.qiling', AGENTS_SUBDIR), 'project')
  const userAgents = loadAgentsFromDir(join(homedir(), '.qiling', AGENTS_SUBDIR), 'user')

  // Project agents override user agents with same agentType
  const seen = new Set<string>()
  const combined: CustomAgent[] = []

  for (const agent of [...projectAgents, ...userAgents]) {
    if (!seen.has(agent.agentType.toLowerCase())) {
      seen.add(agent.agentType.toLowerCase())
      combined.push(agent)
    }
  }

  _cachedCustomAgents = combined
  return combined
}

export function clearCustomAgentCache(): void {
  _cachedCustomAgents = null
}

/**
 * Get all agent definitions merged: custom (disk) + built-in.
 * Custom agents override built-in agents with the same agentType.
 */
export function getAllAgents(cwd: string, builtIns: BuiltInAgent[]): Array<BuiltInAgent | CustomAgent> {
  const custom = loadCustomAgents(cwd)
  const customTypes = new Set(custom.map(a => a.agentType.toLowerCase()))
  const filteredBuiltIns = builtIns.filter(b => !customTypes.has(b.agentType.toLowerCase()))
  return [...custom, ...filteredBuiltIns]
}
