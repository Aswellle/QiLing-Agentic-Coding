/**
 * Shell completion setup — adapted from CC's utils/completionCache.ts
 *
 * Generates and installs shell completion scripts for bash/zsh/fish.
 * Completion scripts are cached at ~/.qiling/completion.<ext>.
 * After `qiling update`, regenerateCompletionCache() re-runs the binary
 * to keep completions in sync.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFileNoThrow } from './execFileNoThrow.js'

type ShellInfo = {
  name: string
  rcFile: string
  cacheFile: string
  completionLine: string
  shellFlag: string
}

function detectShell(): ShellInfo | null {
  const shell = process.env.SHELL ?? ''
  const home = homedir()
  const qilingDir = join(home, '.qiling')

  if (shell.endsWith('/zsh') || shell.endsWith('/zsh.exe')) {
    const cacheFile = join(qilingDir, 'completion.zsh')
    return {
      name: 'zsh',
      rcFile: join(home, '.zshrc'),
      cacheFile,
      completionLine: `[[ -f "${cacheFile}" ]] && source "${cacheFile}"`,
      shellFlag: 'zsh',
    }
  }
  if (shell.endsWith('/bash') || shell.endsWith('/bash.exe')) {
    const cacheFile = join(qilingDir, 'completion.bash')
    return {
      name: 'bash',
      rcFile: join(home, '.bashrc'),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: 'bash',
    }
  }
  if (shell.endsWith('/fish') || shell.endsWith('/fish.exe')) {
    const xdg = process.env.XDG_CONFIG_HOME ?? join(home, '.config')
    const cacheFile = join(qilingDir, 'completion.fish')
    return {
      name: 'fish',
      rcFile: join(xdg, 'fish', 'config.fish'),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: 'fish',
    }
  }
  return null
}

function formatPathLink(filePath: string): string {
  // OSC 8 hyperlink — only in terminals that support it
  const supportsLinks =
    process.env.TERM_PROGRAM === 'iTerm.app' ||
    process.env.TERM_PROGRAM === 'vscode' ||
    !!process.env.WT_SESSION

  if (!supportsLinks) return filePath
  const url = pathToFileURL(filePath).href
  return `\x1b]8;;${url}\x07${filePath}\x1b]8;;\x07`
}

/**
 * Generate and cache the completion script, then add a source line to the
 * shell's rc file. Returns a user-facing status message.
 */
export async function setupShellCompletion(): Promise<string> {
  const EOL = '\n'
  const shell = detectShell()
  if (!shell) return ''

  try {
    await mkdir(dirname(shell.cacheFile), { recursive: true })
  } catch {
    return `${EOL}Could not write ${shell.name} completion cache${EOL}` +
      `Run manually: qiling completion ${shell.shellFlag} > ${shell.cacheFile}${EOL}`
  }

  const qilingBin = process.argv[1] ?? 'qiling'
  const result = await execFileNoThrow(qilingBin, [
    'completion',
    shell.shellFlag,
    '--output',
    shell.cacheFile,
  ])
  if (result.code !== 0) {
    return `${EOL}Could not generate ${shell.name} shell completions${EOL}` +
      `Run manually: qiling completion ${shell.shellFlag} > ${shell.cacheFile}${EOL}`
  }

  let existing = ''
  try {
    existing = await readFile(shell.rcFile, { encoding: 'utf-8' })
    if (existing.includes('qiling completion') || existing.includes(shell.cacheFile)) {
      return `${EOL}Shell completions updated for ${shell.name}${EOL}` +
        `See ${formatPathLink(shell.rcFile)}${EOL}`
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code !== 'ENOENT') {
      return `${EOL}Could not install ${shell.name} shell completions${EOL}` +
        `Add this to ${formatPathLink(shell.rcFile)}:${EOL}${shell.completionLine}${EOL}`
    }
  }

  try {
    await mkdir(dirname(shell.rcFile), { recursive: true })
    const separator = existing && !existing.endsWith('\n') ? '\n' : ''
    const content = `${existing}${separator}\n# QiLing shell completions\n${shell.completionLine}\n`
    await writeFile(shell.rcFile, content, { encoding: 'utf-8' })
    return `${EOL}Installed ${shell.name} shell completions${EOL}` +
      `Added to ${formatPathLink(shell.rcFile)}${EOL}` +
      `Run: source ${shell.rcFile}${EOL}`
  } catch {
    return `${EOL}Could not install ${shell.name} shell completions${EOL}` +
      `Add this to ${formatPathLink(shell.rcFile)}:${EOL}${shell.completionLine}${EOL}`
  }
}

/**
 * Regenerate cached shell completion scripts in ~/.qiling/.
 * Called after `qiling update` so completions stay in sync.
 */
export async function regenerateCompletionCache(): Promise<void> {
  const shell = detectShell()
  if (!shell) return

  const qilingBin = process.argv[1] ?? 'qiling'
  await execFileNoThrow(qilingBin, [
    'completion',
    shell.shellFlag,
    '--output',
    shell.cacheFile,
  ])
}
