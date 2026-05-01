import { existsSync, readFileSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'
import type { Settings } from '../settings/schema'

const MEMORY_FILENAMES = [
  'QILING.md',
  'CLAUDE.md', // Compatible with Claude Code memory files
]

function findMemoryFiles(workingDir: string, settings: Settings): string[] {
  const files: string[] = []

  // Global memory
  const globalDir = join(homedir(), '.qiling')
  for (const name of MEMORY_FILENAMES) {
    const p = join(globalDir, name)
    if (existsSync(p)) files.push(p)
  }

  // Walk up from workingDir to find project memory
  let dir = workingDir
  const visited = new Set<string>()
  while (!visited.has(dir)) {
    visited.add(dir)
    for (const name of MEMORY_FILENAMES) {
      const p = join(dir, name)
      if (existsSync(p) && !files.includes(p)) {
        files.push(p)
      }
      const qilingDir = join(dir, '.qiling', name)
      if (existsSync(qilingDir) && !files.includes(qilingDir)) {
        files.push(qilingDir)
      }
    }
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }

  return files
}

export function buildSystemPrompt(workingDir: string, settings: Settings): string {
  const memoryFiles = findMemoryFiles(workingDir, settings)
  const memoryContent = memoryFiles
    .map(p => {
      try {
        const content = readFileSync(p, 'utf-8').trim()
        return content ? `<memory file="${p}">\n${content}\n</memory>` : null
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .join('\n\n')

  const lang = settings.ui.language === 'zh-CN' ? 'zh' : 'en'

  return `You are QiLing (启灵), an expert AI programming agent running in the terminal.
You help developers understand codebases, edit files, run commands, and complete complex programming tasks.

Current working directory: ${workingDir}
Platform: ${process.platform}
Language preference: ${lang}

You have access to tools for reading/writing files, executing shell commands, and searching code.
Always think step by step. For complex tasks, plan before acting.
When editing files, prefer FileEdit (precise string replacement) over FileWrite (full overwrite).
When you finish a task, summarize what you changed.

${memoryContent ? `## Memory Context\n\n${memoryContent}` : ''}`.trim()
}
