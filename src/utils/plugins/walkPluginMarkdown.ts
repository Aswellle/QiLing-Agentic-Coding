/**
 * Plugin markdown walker — adapted from CC's utils/plugins/walkPluginMarkdown.ts
 *
 * Recursively walks a plugin directory, calling onFile for each .md file.
 * When stopAtSkillDir=true, stops recursion at directories containing skill.md.
 * Readdir errors are swallowed with a debug log.
 */

import { readdir } from 'fs/promises'
import { join } from 'path'
import { logForDebugging } from '../log.js'

const SKILL_MD_RE = /^skill\.md$/i

type DirEntry = { name: string; isFile(): boolean; isDirectory(): boolean }

export async function walkPluginMarkdown(
  rootDir: string,
  onFile: (fullPath: string, namespace: string[]) => Promise<void>,
  opts: { stopAtSkillDir?: boolean; logLabel?: string } = {},
): Promise<void> {
  const label = opts.logLabel ?? 'plugin'

  async function scan(dirPath: string, namespace: string[]): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true }) as DirEntry[]

      if (opts.stopAtSkillDir && entries.some(e => e.isFile() && SKILL_MD_RE.test(e.name))) {
        await Promise.all(
          entries.map(entry =>
            entry.isFile() && entry.name.toLowerCase().endsWith('.md')
              ? onFile(join(dirPath, entry.name), namespace)
              : undefined,
          ),
        )
        return
      }

      await Promise.all(
        entries.map(entry => {
          const fullPath = join(dirPath, entry.name)
          if (entry.isDirectory()) return scan(fullPath, [...namespace, entry.name])
          if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) return onFile(fullPath, namespace)
          return undefined
        }),
      )
    } catch (error) {
      logForDebugging(`Failed to scan ${label} directory ${dirPath}: ${error}`)
    }
  }

  await scan(rootDir, [])
}
