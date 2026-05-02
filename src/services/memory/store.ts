import { join } from 'path'
import { homedir } from 'os'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

const MEMORY_FILENAME = 'QILING.md'
const GLOBAL_CONFIG_DIR = join(homedir(), '.qiling')

function globalMemoryPath(): string {
  return join(GLOBAL_CONFIG_DIR, MEMORY_FILENAME)
}

function projectMemoryPath(workingDir: string): string {
  return join(workingDir, '.qiling', MEMORY_FILENAME)
}

export function readMemories(workingDir: string): string {
  const paths = [
    join(homedir(), '.qiling', MEMORY_FILENAME),
    join(workingDir, '.qiling', MEMORY_FILENAME),
    join(workingDir, 'QILING.md'),
    join(workingDir, 'CLAUDE.md'),
  ]
  return paths
    .filter(p => existsSync(p))
    .map(p => readFileSync(p, 'utf-8').trim())
    .filter(Boolean)
    .join('\n\n---\n\n')
}

export function appendMemory(entry: string, workingDir: string, scope: 'project' | 'global' = 'project'): void {
  const path = scope === 'global' ? globalMemoryPath() : projectMemoryPath(workingDir)
  mkdirSync(join(path, '..'), { recursive: true })

  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : ''
  const timestamp = new Date().toISOString().slice(0, 10)
  const newEntry = `- ${entry.trim()}  <!-- ${timestamp} -->`

  // Find or create ## Memories section
  if (existing.includes('## Memories')) {
    const updated = existing.replace('## Memories', `## Memories\n${newEntry}`)
    writeFileSync(path, updated, 'utf-8')
  } else {
    const section = existing ? `${existing}\n\n## Memories\n${newEntry}\n` : `## Memories\n${newEntry}\n`
    writeFileSync(path, section, 'utf-8')
  }
}

export function appendMemoryBulk(entries: string[], workingDir: string): void {
  if (entries.length === 0) return
  const path = projectMemoryPath(workingDir)
  mkdirSync(join(path, '..'), { recursive: true })

  const timestamp = new Date().toISOString().slice(0, 10)
  const bullets = entries.map(e => `- ${e.trim()}  <!-- ${timestamp} -->`).join('\n')

  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : ''
  if (existing.includes('## Memories')) {
    writeFileSync(path, existing.replace('## Memories', `## Memories\n${bullets}`), 'utf-8')
  } else {
    const section = existing ? `${existing}\n\n## Memories\n${bullets}\n` : `## Memories\n${bullets}\n`
    writeFileSync(path, section, 'utf-8')
  }
}

export function clearMemories(workingDir: string, scope: 'project' | 'global' = 'project'): void {
  const path = scope === 'global' ? globalMemoryPath() : projectMemoryPath(workingDir)
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf-8')
  // Remove ## Memories section
  const cleaned = content.replace(/^## Memories\n(- .+\n)*/m, '').trimEnd()
  writeFileSync(path, cleaned ? cleaned + '\n' : '', 'utf-8')
}

export function listMemories(workingDir: string): string[] {
  const paths = [
    globalMemoryPath(),
    projectMemoryPath(workingDir),
    join(workingDir, 'QILING.md'),
  ]
  const memories: string[] = []
  for (const p of paths) {
    if (!existsSync(p)) continue
    const content = readFileSync(p, 'utf-8')
    const match = content.match(/## Memories\n([\s\S]*?)(?=\n##|$)/)
    if (match) {
      const bullets = match[1].split('\n')
        .filter(l => l.startsWith('- '))
        .map(l => l.replace(/^- /, '').replace(/\s*<!--.*-->$/, '').trim())
      memories.push(...bullets)
    }
  }
  return memories
}
