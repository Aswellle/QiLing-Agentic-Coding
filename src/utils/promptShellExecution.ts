/**
 * Prompt shell command execution — adapted from CC's utils/promptShellExecution.ts
 *
 * Parses skill/command prompt text and executes embedded shell commands.
 * Two syntaxes:
 *   - Code blocks: ```!\ncommand\n```
 *   - Inline:      !`command`
 *
 * The shell parameter comes from .md frontmatter (author's choice); it is
 * NEVER read from defaultShell settings (see CC's design: ps-shell-selection.md §5.3).
 */

import { spawn } from 'node:child_process'

export type FrontmatterShell = 'bash' | 'powershell'

export class MalformedCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MalformedCommandError'
  }
}

// Pattern for code blocks: ```! command ```
const BLOCK_PATTERN = /```!\s*\n?([\s\S]*?)\n?```/g

// Pattern for inline: !`command` — requires whitespace/start-of-line before !
// Prevents false matches on shell variables like $! or adjacent spans.
// eslint-disable-next-line custom-rules/no-lookbehind-regex
const INLINE_PATTERN = /(?<=^|\s)!`([^`]+)`/gm

type RunOptions = {
  timeout?: number
  shell?: FrontmatterShell
  cwd?: string
}

/**
 * Run a single shell command and return stdout+stderr combined.
 * Throws MalformedCommandError on failure.
 */
async function runShellCommand(
  command: string,
  options: RunOptions = {},
): Promise<string> {
  const { timeout = 30_000, shell, cwd = process.cwd() } = options

  const isWin = process.platform === 'win32'
  const usePS = shell === 'powershell' || (isWin && shell !== 'bash')

  const [prog, ...args] = usePS
    ? ['powershell.exe', '-NonInteractive', '-Command', command]
    : isWin
      ? ['cmd.exe', '/c', command]
      : ['bash', '-c', command]

  return new Promise((resolve, reject) => {
    const child = spawn(prog, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    child.stdout.on('data', (c: Buffer) => stdoutChunks.push(c))
    child.stderr.on('data', (c: Buffer) => stderrChunks.push(c))

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(
        new MalformedCommandError(
          `Shell command timed out after ${timeout}ms: ${command.slice(0, 100)}`,
        ),
      )
    }, timeout)

    child.on('close', code => {
      clearTimeout(timer)
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8').trim()
      const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim()
      if (code !== 0 && !stdout) {
        reject(
          new MalformedCommandError(
            `Shell command failed (exit ${code}): ${stderr || command.slice(0, 80)}`,
          ),
        )
      } else {
        const parts = [stdout, stderr ? `[stderr]\n${stderr}` : ''].filter(Boolean)
        resolve(parts.join('\n'))
      }
    })

    child.on('error', err => {
      clearTimeout(timer)
      reject(new MalformedCommandError(`Shell command error: ${err.message}`))
    })
  })
}

/**
 * Parses prompt text and executes any embedded shell commands in place.
 * Returns the text with all shell patterns replaced by their output.
 *
 * @param text   - The skill/command prompt text to process
 * @param shell  - Shell to use (from frontmatter, NOT from settings). Undefined → bash.
 * @param cwd    - Working directory for commands
 */
export async function executeShellCommandsInPrompt(
  text: string,
  shell?: FrontmatterShell,
  cwd = process.cwd(),
): Promise<string> {
  let result = text

  const blockMatches = [...text.matchAll(BLOCK_PATTERN)]
  const inlineMatches = text.includes('!`') ? [...text.matchAll(INLINE_PATTERN)] : []

  await Promise.all(
    [...blockMatches, ...inlineMatches].map(async match => {
      const command = match[1]?.trim()
      if (!command) return

      try {
        const output = await runShellCommand(command, { shell, cwd })
        // Use a function replacer to prevent $& $` $' $1 interpretation
        result = result.replace(match[0], () => output)
      } catch (e) {
        if (e instanceof MalformedCommandError) throw e
        throw new MalformedCommandError(
          `Shell command failed for pattern "${match[0]}": ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }),
  )

  return result
}
