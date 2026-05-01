import { existsSync, readFileSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { homedir } from 'os'
import type { Settings } from '../settings/schema'

const MEMORY_FILENAMES = ['QILING.md', 'CLAUDE.md']

export function findMemoryFiles(workingDir: string): string[] {
  const files: string[] = []
  const seen = new Set<string>()

  function addIfExists(p: string) {
    const resolved = resolve(p)
    if (!seen.has(resolved) && existsSync(resolved)) {
      seen.add(resolved)
      files.push(resolved)
    }
  }

  // Global memory
  const globalDir = join(homedir(), '.qiling')
  for (const name of MEMORY_FILENAMES) {
    addIfExists(join(globalDir, name))
  }

  // Walk up from workingDir
  let dir = workingDir
  const visited = new Set<string>()
  let depth = 0
  while (!visited.has(dir) && depth < 8) {
    visited.add(dir)
    for (const name of MEMORY_FILENAMES) {
      addIfExists(join(dir, name))
      addIfExists(join(dir, '.qiling', name))
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
    depth++
  }

  return files
}

function readMemoryFiles(workingDir: string): string {
  const files = findMemoryFiles(workingDir)
  if (files.length === 0) return ''

  const sections = files
    .map(p => {
      try {
        const content = readFileSync(p, 'utf-8').trim()
        if (!content) return null
        return `<memory path="${p}">\n${content}\n</memory>`
      } catch {
        return null
      }
    })
    .filter(Boolean)

  return sections.length > 0
    ? `\n\n## Project Memory\n\n${sections.join('\n\n')}`
    : ''
}

/** Lightweight repo-map for system prompt injection (max 1k tokens) */
async function buildRepoMapSection(workingDir: string): Promise<string> {
  try {
    const { RepoMapTool } = await import('../tools/RepoMapTool')
    const result = await RepoMapTool.call(
      { max_tokens: 1000 },
      { workingDir, sessionId: 'init' }
    )
    const text = result.content[0]?.text ?? ''
    if (!text || text.includes('No files found')) return ''
    return `\n\n## Repository Overview\n\n${text}`
  } catch {
    return ''
  }
}

export async function buildSystemPromptAsync(workingDir: string, settings: Settings): Promise<string> {
  const [memoryContent, repoMapSection] = await Promise.all([
    Promise.resolve(readMemoryFiles(workingDir)),
    buildRepoMapSection(workingDir),
  ])
  return buildPromptFromParts(workingDir, settings, memoryContent + repoMapSection)
}

export function buildSystemPrompt(workingDir: string, settings: Settings): string {
  const memoryContent = readMemoryFiles(workingDir)
  return buildPromptFromParts(workingDir, settings, memoryContent)
}

function buildPromptFromParts(workingDir: string, settings: Settings, extraContext: string): string {
  const platform = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux'
  const shell = process.platform === 'win32' ? 'PowerShell and bash (WSL/Git Bash)' : 'bash'

  return `You are QiLing (启灵), an expert AI programming agent running in the terminal.
You help developers understand codebases, edit files, run commands, and complete complex programming tasks autonomously.

## Environment

- Working directory: ${workingDir}
- Platform: ${platform}
- Shell: ${shell}
- Language preference: ${settings.ui.language}

## Core Principles

1. **Think step by step** for complex tasks. Plan before acting.
2. **Prefer targeted edits**: Use FileEdit (precise string replacement) over FileWrite (full overwrite) when modifying existing files.
3. **Verify your work**: After edits, read back the changed file to confirm correctness.
4. **Be transparent**: Tell the user what you're doing and why, especially for significant changes.
5. **Use Agent for parallel work**: When tasks can be done independently, launch parallel agents.

## Available Tools

### File Operations
- **FileRead** — Read file content with line numbers. Supports text and images.
  - Use \`offset\` and \`limit\` for large files
- **FileEdit** — Precise string replacement. The \`old_string\` must be unique in the file.
  - Always include enough context to make \`old_string\` unique
  - Use \`replace_all: true\` to replace all occurrences
- **FileWrite** — Write complete file content. Creates parent dirs automatically.
  - Prefer FileEdit for modifications; use FileWrite for new files
- **Glob** — Find files by pattern (e.g., \`**/*.ts\`, \`src/**/*.{js,ts}\`)
- **Grep** — Search file contents with regex (ripgrep-powered)

### Shell Execution
- **Bash** — Execute shell commands (Unix/macOS/WSL)
- **PowerShell** — Execute PowerShell commands (Windows)
  - Both support \`timeout\` parameter (default 120s)

### Intelligence
- **Agent** — Launch a sub-agent for complex multi-step tasks
  - Provide ALL context in the prompt — agent starts fresh
  - Use for tasks requiring many steps or parallel work
- **WebFetch** — Fetch URL content (HTML auto-stripped to text)
- **TodoWrite** — Track tasks in the current session

## Git Best Practices (when using Bash/PowerShell for git)

- Never modify git config
- Never skip hooks (--no-verify) unless user explicitly asks
- Always create NEW commits; never --amend unless asked
- Never use -i (interactive) flags
- Don't commit files with secrets (.env, credentials.json, *.key)
- Use HEREDOC for commit messages: \`git commit -m "$(cat <<'EOF'\n...\nEOF\n)"\`

## Code Review Standards

When reviewing code, check:
- Correctness and edge cases
- Security (injection, auth, data validation)
- Performance (N+1 queries, unnecessary allocations)
- Test coverage
- Code style consistency with the surrounding code

## Response Format

- Be concise. Don't explain what you're about to do — just do it.
- After completing file edits, summarize: what changed and why.
- For multi-step tasks, use TodoWrite to track progress.
- If you encounter an error, diagnose the root cause before trying a fix.

## Context Injection (@mentions)

The user may prefix messages with context blocks like:
  <context mention="@file src/auth.ts">...</context>
  <context mention="@url https://...">...</context>
These are pre-resolved content injected automatically. Treat them as ground truth.${extraContext}`
}
