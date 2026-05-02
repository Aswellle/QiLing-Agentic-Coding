/**
 * External editor launcher — ported from CC's utils/editor.ts
 *
 * GUI editors (code, cursor, windsurf, subl, etc.): spawned detached so the
 * TUI stays interactive while the editor opens in a separate window.
 *
 * Terminal editors (vim, nvim, nano, etc.): use ANSI alt-screen escape sequences
 * to hide the TUI while the editor runs, then restore it on exit.
 *
 * CC deps replaced: lodash memoize → module cache, whichSync → Bun.which(),
 *                   ink instances → ANSI escape sequences, logForDebugging → silent.
 */

import { spawn, spawnSync, type SpawnOptions, type SpawnSyncOptions } from 'child_process'
import { basename } from 'path'

// ─── Alt-screen helpers (ANSI escape sequences, no Ink internals needed) ─────

const ESC = '\x1b'
// Enter/exit alternate screen buffer — same sequences Ink itself uses
function enterAlternateScreen(): void {
  process.stdout.write(`${ESC}[?1049h`)  // enter alt screen
  process.stdout.write(`${ESC}[H`)       // move cursor to top-left
}
function exitAlternateScreen(): void {
  process.stdout.write(`${ESC}[?1049l`)  // exit alt screen (restores original)
}

// ─── Editor classification (mirrors CC verbatim) ──────────────────────────────

// GUI editors that open in a separate window and can be spawned detached
const GUI_EDITORS = [
  'code',
  'cursor',
  'windsurf',
  'codium',
  'subl',
  'atom',
  'gedit',
  'notepad++',
  'notepad',
]

// Editors that accept +N as a goto-line argument
const PLUS_N_EDITORS = /\b(vi|vim|nvim|nano|emacs|pico|micro|helix|hx)\b/

// VS Code and forks use -g file:line; subl uses bare file:line
const VSCODE_FAMILY = new Set(['code', 'cursor', 'windsurf', 'codium'])

/**
 * Classify the editor binary as GUI or terminal.
 * Returns the matched GUI family name, or undefined for terminal editors.
 * Uses basename so absolute paths / code-insiders still match 'code'.
 */
export function classifyGuiEditor(editor: string): string | undefined {
  const base = basename(editor.split(' ')[0] ?? '')
  return GUI_EDITORS.find(g => base.includes(g))
}

function guiGotoArgv(guiFamily: string, filePath: string, line: number | undefined): string[] {
  if (!line) return [filePath]
  if (VSCODE_FAMILY.has(guiFamily)) return ['-g', `${filePath}:${line}`]
  if (guiFamily === 'subl') return [`${filePath}:${line}`]
  return [filePath]
}

// ─── Editor detection (memoized) ─────────────────────────────────────────────

let _cachedEditor: string | undefined | null = null  // null = not yet resolved

function isCommandAvailable(cmd: string): boolean {
  return Bun.which(cmd) !== null
}

export function getExternalEditor(): string | undefined {
  if (_cachedEditor !== null) return _cachedEditor

  if (process.env.VISUAL?.trim()) {
    _cachedEditor = process.env.VISUAL.trim()
    return _cachedEditor
  }

  if (process.env.EDITOR?.trim()) {
    _cachedEditor = process.env.EDITOR.trim()
    return _cachedEditor
  }

  if (process.platform === 'win32') {
    _cachedEditor = 'start /wait notepad'
    return _cachedEditor
  }

  const editors = ['code', 'cursor', 'windsurf', 'vi', 'nano']
  _cachedEditor = editors.find(cmd => isCommandAvailable(cmd))
  return _cachedEditor
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Launch a file in the user's configured external editor.
 *
 * GUI editors: spawned detached (editor opens in separate window, TUI stays live).
 * Terminal editors: blocks via alt-screen handoff until editor exits.
 *
 * Returns true if the editor was launched, false if no editor is available.
 */
export function openFileInExternalEditor(filePath: string, line?: number): boolean {
  const editor = getExternalEditor()
  if (!editor) return false

  const parts = editor.split(' ')
  const base = parts[0] ?? editor
  const editorArgs = parts.slice(1)
  const guiFamily = classifyGuiEditor(editor)

  if (guiFamily) {
    const gotoArgv = guiGotoArgv(guiFamily, filePath, line)
    const detachedOpts: SpawnOptions = { detached: true, stdio: 'ignore' }
    let child

    if (process.platform === 'win32') {
      const gotoStr = gotoArgv.map(a => `"${a}"`).join(' ')
      child = spawn(`${editor} ${gotoStr}`, { ...detachedOpts, shell: true })
    } else {
      child = spawn(base, [...editorArgs, ...gotoArgv], detachedOpts)
    }

    child.on('error', () => {/* spawn errors for user-configured editors are non-fatal */})
    child.unref()
    return true
  }

  // Terminal editor — needs alt-screen handoff so TUI is hidden while editing
  const useGotoLine = !!line && PLUS_N_EDITORS.test(basename(base))
  enterAlternateScreen()
  try {
    const syncOpts: SpawnSyncOptions = { stdio: 'inherit' }
    let result

    if (process.platform === 'win32') {
      const lineArg = useGotoLine ? `+${line} ` : ''
      result = spawnSync(`${editor} ${lineArg}"${filePath}"`, { ...syncOpts, shell: true })
    } else {
      const args = [...editorArgs, ...(useGotoLine ? [`+${line}`, filePath] : [filePath])]
      result = spawnSync(base, args, syncOpts)
    }

    return !result.error
  } finally {
    exitAlternateScreen()
  }
}

/** Human-readable name for the current external editor */
export function getEditorDisplayName(): string {
  const editor = getExternalEditor()
  if (!editor) return '(none)'
  const NAMES: Record<string, string> = {
    code: 'VS Code', cursor: 'Cursor', windsurf: 'Windsurf', codium: 'VSCodium',
    subl: 'Sublime Text', atom: 'Atom', vi: 'Vim', vim: 'Vim', nvim: 'Neovim',
    nano: 'nano', emacs: 'Emacs', notepad: 'Notepad',
    'start /wait notepad': 'Notepad',
  }
  const base = basename(editor.split(' ')[0] ?? editor)
  return NAMES[base] ?? NAMES[editor] ?? base
}
