/**
 * Default shell resolution — adapted from CC's utils/shell/resolveDefaultShell.ts
 *
 * Resolves the default shell for ! commands and skill shell frontmatter.
 *
 * Resolution order (CC design: ps-shell-selection.md §4.2):
 *   settings.defaultShell → 'bash'
 *
 * Platform default is 'bash' everywhere — we do NOT auto-flip Windows to
 * PowerShell (would break existing Windows users with bash hooks).
 */

import { loadSettings } from '../../settings/loader.js'

export function resolveDefaultShell(): 'bash' | 'powershell' {
  try {
    const settings = loadSettings(process.cwd())
    return settings.defaultShell ?? 'bash'
  } catch {
    return 'bash'
  }
}
