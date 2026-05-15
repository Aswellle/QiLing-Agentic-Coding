import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface OutputStyleConfig {
  name: string
  description: string
  prompt: string
  source: 'project' | 'user'
  keepCodingInstructions?: boolean
}

/**
 * Parse frontmatter from markdown: lines between first --- and second ---
 */
function parseFrontmatter(content: string): { name?: string; description?: string; 'keep-coding-instructions'?: boolean } {
  const lines = content.split('\n')
  if (lines[0]?.trim() !== '---') return {}
  const end = lines.indexOf('---', 1)
  if (end === -1) return {}
  const fmLines = lines.slice(1, end)
  const result: Record<string, unknown> = {}
  for (const line of fmLines) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (m) {
      const val = m[2]!.trim()
      result[m[1]!] = val === 'true' ? true : val === 'false' ? false : val
    }
  }
  return result as { name?: string; description?: string; 'keep-coding-instructions'?: boolean }
}

function stripFrontmatter(content: string): string {
  const lines = content.split('\n')
  if (lines[0]?.trim() !== '---') return content
  const end = lines.indexOf('---', 1)
  if (end === -1) return content
  return lines.slice(end + 1).join('\n').trim()
}

function loadStylesFromDir(dir: string, source: 'project' | 'user'): OutputStyleConfig[] {
  if (!existsSync(dir)) return []
  const styles: OutputStyleConfig[] = []
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      try {
        const content = readFileSync(join(dir, file), 'utf-8')
        const fm = parseFrontmatter(content)
        const name = fm.name ?? file.replace(/\.md$/, '')
        const prompt = stripFrontmatter(content)
        if (!prompt.trim()) continue
        styles.push({
          name,
          description: fm.description ?? '',
          prompt,
          source,
          keepCodingInstructions: fm['keep-coding-instructions'],
        })
      } catch { /* skip bad files */ }
    }
  } catch { /* skip unreadable dirs */ }
  return styles
}

let _cache: OutputStyleConfig[] | null = null

export function loadOutputStyles(workingDir?: string): OutputStyleConfig[] {
  if (_cache) return _cache
  const userDir = join(homedir(), '.qiling', 'output-styles')
  const projectDir = workingDir ? join(workingDir, '.qiling', 'output-styles') : null
  const claudeProjectDir = workingDir ? join(workingDir, '.claude', 'output-styles') : null

  const user = loadStylesFromDir(userDir, 'user')
  const project = projectDir ? loadStylesFromDir(projectDir, 'project') : []
  const claudeProject = claudeProjectDir ? loadStylesFromDir(claudeProjectDir, 'project') : []

  // Project overrides user (later entries win on same name)
  _cache = [...user, ...claudeProject, ...project]
  return _cache
}

export function clearOutputStylesCache(): void {
  _cache = null
}

export function getOutputStyle(name: string, workingDir?: string): OutputStyleConfig | undefined {
  return loadOutputStyles(workingDir).find(s => s.name.toLowerCase() === name.toLowerCase())
}
