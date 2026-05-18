/**
 * Example command suggestions — adapted from CC's utils/exampleCommands.ts
 *
 * Builds a short list of example prompts for the startup banner and empty
 * state UI. Selects filenames from the user's recent git history so they
 * feel relevant to the current project.
 */

import { execFileNoThrowWithCwd } from './execFileNoThrow.js'
import { logError } from './log.js'

// Patterns that mark a file as non-core (auto-generated, dependency, or config).
// Used to filter filenames deterministically without shelling out.
const NON_CORE_PATTERNS = [
  /(?:^|\/)(?:package-lock\.json|yarn\.lock|bun\.lock|bun\.lockb|pnpm-lock\.yaml|Pipfile\.lock|poetry\.lock|Cargo\.lock|Gemfile\.lock|go\.sum|composer\.lock|uv\.lock)$/,
  /\.generated\./,
  /(?:^|\/)(?:dist|build|out|target|node_modules|\.next|__pycache__)\//,
  /\.(?:min\.js|min\.css|map|pyc|pyo)$/,
  /\.(?:json|ya?ml|toml|xml|ini|cfg|conf|env|lock|txt|md|mdx|rst|csv|log|svg)$/i,
  /(?:^|\/)\.?(?:eslintrc|prettierrc|babelrc|editorconfig|gitignore|gitattributes|dockerignore|npmrc)/,
  /(?:^|\/)(?:tsconfig|jsconfig|biome|vitest\.config|jest\.config|webpack\.config|vite\.config|rollup\.config)\.[a-z]+$/,
  /(?:^|\/)\.(?:github|vscode|idea|qiling)\//,
  /(?:^|\/)(?:CHANGELOG|LICENSE|CONTRIBUTING|CODEOWNERS|README)(?:\.[a-z]+)?$/i,
]

function isCoreFile(path: string): boolean {
  return !NON_CORE_PATTERNS.some(p => p.test(path))
}

/**
 * Count item occurrences and return the top N items sorted by frequency.
 */
export function countAndSortItems(items: string[], topN = 20): string {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([item, count]) => `${count.toString().padStart(6)} ${item}`)
    .join('\n')
}

/**
 * Pick up to `want` basenames from a frequency-sorted path list, spreading
 * across directories. Returns [] if fewer than `want` core files are available.
 */
export function pickDiverseCoreFiles(
  sortedPaths: string[],
  want: number,
): string[] {
  const picked: string[] = []
  const seenBasenames = new Set<string>()
  const dirTally = new Map<string, number>()

  // Greedy: on each pass allow +1 file per directory — keeps the top-N from
  // collapsing into a single hot folder while still allowing dominant folders
  // to contribute multiple files in narrow repos.
  for (let cap = 1; picked.length < want && cap <= want; cap++) {
    for (const p of sortedPaths) {
      if (picked.length >= want) break
      if (!isCoreFile(p)) continue
      const lastSep = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
      const base = lastSep >= 0 ? p.slice(lastSep + 1) : p
      if (!base || seenBasenames.has(base)) continue
      const dir = lastSep >= 0 ? p.slice(0, lastSep) : '.'
      if ((dirTally.get(dir) ?? 0) >= cap) continue
      picked.push(base)
      seenBasenames.add(base)
      dirTally.set(dir, (dirTally.get(dir) ?? 0) + 1)
    }
  }

  return picked.length >= want ? picked : []
}

async function getGitEmail(cwd: string): Promise<string | null> {
  try {
    const { code, stdout } = await execFileNoThrowWithCwd(
      'git',
      ['config', 'user.email'],
      { cwd },
    )
    return code === 0 ? stdout.trim() : null
  } catch {
    return null
  }
}

async function isGitRepo(cwd: string): Promise<boolean> {
  const { code } = await execFileNoThrowWithCwd(
    'git',
    ['rev-parse', '--is-inside-work-tree'],
    { cwd },
  )
  return code === 0
}

/**
 * Collect frequently-modified files from git log (last 1000 commits).
 * Prefers the user's own commits; falls back to all authors for thin history.
 */
async function getFrequentlyModifiedFiles(cwd: string): Promise<string[]> {
  if (process.env.NODE_ENV === 'test') return []
  if (process.platform === 'win32') return []
  if (!(await isGitRepo(cwd))) return []

  try {
    const userEmail = await getGitEmail(cwd)
    const logArgs = [
      'log', '-n', '1000', '--pretty=format:', '--name-only', '--diff-filter=M',
    ]

    const counts = new Map<string, number>()
    const tallyInto = (stdout: string) => {
      for (const line of stdout.split('\n')) {
        const f = line.trim()
        if (f) counts.set(f, (counts.get(f) ?? 0) + 1)
      }
    }

    if (userEmail) {
      const { stdout } = await execFileNoThrowWithCwd(
        'git', [...logArgs, `--author=${userEmail}`], { cwd },
      )
      tallyInto(stdout)
    }

    if (counts.size < 10) {
      const { stdout } = await execFileNoThrowWithCwd('git', logArgs, { cwd })
      tallyInto(stdout)
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p)

    return pickDiverseCoreFiles(sorted, 5)
  } catch (err) {
    logError(err as Error)
    return []
  }
}

// ─── Per-session cache ────────────────────────────────────────────────────────

let _cachedFiles: string[] | null = null

/**
 * Get example commands for the current working directory.
 * Uses cached git history when available; refreshes once per session.
 *
 * @param cwd  Working directory (defaults to process.cwd())
 */
export async function getExampleCommands(cwd = process.cwd()): Promise<string[]> {
  const freq = _cachedFiles ?? await getFrequentlyModifiedFiles(cwd)
  if (!_cachedFiles) _cachedFiles = freq

  const file = freq.length > 0
    ? freq[Math.floor(Math.random() * freq.length)]!
    : '<filepath>'

  return [
    'fix lint errors',
    'fix typecheck errors',
    `how does ${file} work?`,
    `refactor ${file}`,
    'how do I log an error?',
    `edit ${file} to...`,
    `write a test for ${file}`,
    'create a util logging.ts that...',
  ]
}

/**
 * Get one random example command. Synchronous (uses cache, no git calls).
 * Call getExampleCommands() first to warm the cache.
 */
export function getExampleCommandFromCache(cwd = process.cwd()): string {
  const freq = _cachedFiles ?? []
  const file = freq.length > 0
    ? freq[Math.floor(Math.random() * freq.length)]!
    : '<filepath>'

  const commands = [
    'fix lint errors',
    'fix typecheck errors',
    `how does ${file} work?`,
    `refactor ${file}`,
    'how do I log an error?',
    `edit ${file} to...`,
    `write a test for ${file}`,
    'create a util logging.ts that...',
  ]

  return `Try "${commands[Math.floor(Math.random() * commands.length)]!}"`
}

/**
 * Warm the example-command cache in the background without blocking startup.
 */
export function refreshExampleCommands(cwd = process.cwd()): void {
  if (!_cachedFiles) {
    void getFrequentlyModifiedFiles(cwd).then(files => {
      if (files.length) _cachedFiles = files
    })
  }
}
