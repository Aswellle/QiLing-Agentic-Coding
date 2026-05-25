/**
 * Persistent agent memory system — ported from CC's AgentTool/agentMemory.ts
 *
 * Manages per-agent-type memory as individual .md topic files with YAML frontmatter,
 * plus a MEMORY.md index file. Three scopes:
 *   'user'    → ~/.qiling/agent-memory/<agentType>/
 *   'project' → <cwd>/.qiling/agent-memory/<agentType>/
 *   'local'   → <cwd>/.qiling/agent-memory-local/<agentType>/  (not VCS)
 */

import { join, normalize, sep } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { getCwd } from '../../utils/cwd.js'
import { getProjectRoot } from '../../bootstrap/state.js'

const MEMORY_DIR = 'agent-memory'
const MEMORY_LOCAL_DIR = 'agent-memory-local'
const MEMORY_ENTRYPOINT = 'MEMORY.md'
const MAX_ENTRYPOINT_LINES = 200

export type AgentMemoryScope = 'user' | 'project' | 'local'

function sanitizeAgentTypeForPath(agentType: string): string {
  return agentType.replace(/:/g, '-')
}

// FROM CC: sanitizePath — replaces non-alphanumeric chars for safe dir names
function sanitizePath(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '-')
}

function getGlobalQilingDir(): string {
  return join(homedir(), '.qiling')
}

// FROM CC: getLocalAgentMemoryDir — supports QILING_REMOTE_MEMORY_DIR for remote mounts
function getLocalAgentMemoryDir(dirName: string): string {
  // NAME: CLAUDE_CODE_REMOTE_MEMORY_DIR
  if (process.env.QILING_REMOTE_MEMORY_DIR) {
    return (
      join(
        process.env.QILING_REMOTE_MEMORY_DIR,
        'projects',
        sanitizePath(getProjectRoot()),
        MEMORY_LOCAL_DIR,
        dirName,
      ) + sep
    )
  }
  return join(getCwd(), '.qiling', MEMORY_LOCAL_DIR, dirName) + sep
}

/**
 * Returns the agent memory directory for a given agent type and scope.
 */
export function getAgentMemoryDir(agentType: string, scope: AgentMemoryScope): string {
  const dirName = sanitizeAgentTypeForPath(agentType)
  switch (scope) {
    case 'user':
      return join(getGlobalQilingDir(), MEMORY_DIR, dirName) + sep
    case 'project':
      return join(getCwd(), '.qiling', MEMORY_DIR, dirName) + sep
    case 'local':
      return getLocalAgentMemoryDir(dirName)
  }
}

/**
 * Returns the agent memory entrypoint (MEMORY.md) path.
 */
export function getAgentMemoryEntrypoint(agentType: string, scope: AgentMemoryScope): string {
  return join(getAgentMemoryDir(agentType, scope), MEMORY_ENTRYPOINT)
}

/**
 * True if the given absolute path lives inside any agent memory directory.
 */
export function isAgentMemoryPath(absolutePath: string): boolean {
  // SECURITY: Normalize to prevent path traversal bypasses via .. segments
  const normalizedPath = normalize(absolutePath)
  const globalBase = getGlobalQilingDir()

  if (normalizedPath.startsWith(join(globalBase, MEMORY_DIR) + sep)) return true
  if (normalizedPath.startsWith(join(getCwd(), '.qiling', MEMORY_DIR) + sep)) return true

  // FROM CC: check remote memory dir for local scope
  // NAME: QILING_REMOTE_MEMORY_DIR
  if (process.env.QILING_REMOTE_MEMORY_DIR) {
    if (
      normalizedPath.includes(sep + MEMORY_LOCAL_DIR + sep) &&
      normalizedPath.startsWith(
        join(process.env.QILING_REMOTE_MEMORY_DIR, 'projects') + sep,
      )
    ) {
      return true
    }
  } else if (normalizedPath.startsWith(join(getCwd(), '.qiling', MEMORY_LOCAL_DIR) + sep)) {
    return true
  }

  return false
}

export function getMemoryScopeDisplay(scope: AgentMemoryScope | undefined): string {
  switch (scope) {
    case 'user':    return `User (~/.qiling/${MEMORY_DIR}/)`
    case 'project': return 'Project (.qiling/agent-memory/)'
    case 'local':   return `Local (${getLocalAgentMemoryDir('...')})`
    default:        return 'None'
  }
}

/**
 * Load persistent memory for an agent. Creates the directory if needed and
 * returns a system-prompt section explaining the memory system.
 */
export function loadAgentMemoryPrompt(agentType: string, scope: AgentMemoryScope): string {
  let scopeNote: string
  switch (scope) {
    case 'user':
      scopeNote = '- Since this memory is user-scope, keep learnings general since they apply across all projects'
      break
    case 'project':
      scopeNote = '- Since this memory is project-scope and shared with your team via version control, tailor your memories to this project'
      break
    case 'local':
      scopeNote = '- Since this memory is local-scope (not checked into version control), tailor your memories to this project and machine'
      break
  }

  const memoryDir = getAgentMemoryDir(agentType, scope)
  const entrypointPath = getAgentMemoryEntrypoint(agentType, scope)

  // Ensure dir exists (best-effort, fire-and-forget)
  try { mkdirSync(memoryDir, { recursive: true }) } catch { /* ignore */ }

  const entrypointContent = existsSync(entrypointPath)
    ? readMemoryEntrypoint(entrypointPath)
    : ''

  const hasMemory = entrypointContent.trim().length > 0

  const TYPES_SECTION = `There are several types of memory:
- **user**: Information about who the user is, their expertise, preferences
- **feedback**: Guidance the user has given you about how to approach work
- **project**: Information about ongoing work, goals, bugs, decisions
- **reference**: Pointers to where information can be found in external systems

Save memories by writing .md files with this frontmatter:
\`\`\`
---
name: short-kebab-case-slug
description: one-line summary used to decide relevance in future conversations
metadata:
  type: user | feedback | project | reference
---

Memory content here.
\`\`\`

Keep an index in MEMORY.md (one line per entry, under ~150 chars):
\`- [Title](file.md) — one-line hook\`

Do NOT save: code patterns, git history, debugging solutions, ephemeral task details.`

  return [
    `# Persistent Agent Memory`,
    `You have persistent memory at \`${memoryDir}\`. ${scopeNote}`,
    '',
    hasMemory
      ? `## Current Memory Index\n\n${entrypointContent}`
      : `No memories saved yet. Start saving important learnings about this user/project.`,
    '',
    TYPES_SECTION,
  ].join('\n')
}

function readMemoryEntrypoint(path: string): string {
  try {
    const content = readFileSync(path, 'utf-8')
    const lines = content.split('\n')
    if (lines.length > MAX_ENTRYPOINT_LINES) {
      return lines.slice(0, MAX_ENTRYPOINT_LINES).join('\n') +
        `\n\n[... truncated at ${MAX_ENTRYPOINT_LINES} lines ...]`
    }
    return content
  } catch {
    return ''
  }
}
