/**
 * Detects potentially destructive PowerShell commands and returns a warning
 * string for display in the permission dialog. Purely informational — does not
 * affect permission logic or auto-approval.
 *
 * Ported from CC's PowerShellTool/destructiveCommandWarning.ts
 */

type DestructivePattern = {
  pattern: RegExp
  warning: string
}

const DESTRUCTIVE_PATTERNS: DestructivePattern[] = [
  // Remove-Item with -Recurse and/or -Force (and aliases rm, del, rd, rmdir, ri)
  {
    pattern: /(?:^|[|;&\n({])\s*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Recurse\b[^|;&\n}]*-Force\b/i,
    warning: 'Note: may recursively force-remove files',
  },
  {
    pattern: /(?:^|[|;&\n({])\s*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Force\b[^|;&\n}]*-Recurse\b/i,
    warning: 'Note: may recursively force-remove files',
  },
  {
    pattern: /(?:^|[|;&\n({])\s*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Recurse\b/i,
    warning: 'Note: may recursively remove files',
  },
  {
    pattern: /(?:^|[|;&\n({])\s*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Force\b/i,
    warning: 'Note: may force-remove files',
  },

  // Clear-Content and Clear-Disk
  { pattern: /\bClear-Content\b[^|;&\n]*\*/i, warning: 'Note: may clear content of multiple files' },
  { pattern: /\bFormat-Volume\b/i, warning: 'Note: may format a disk volume' },
  { pattern: /\bClear-Disk\b/i, warning: 'Note: may clear a disk' },

  // Git destructive operations
  { pattern: /\bgit\s+reset\s+--hard\b/i, warning: 'Note: may discard uncommitted changes' },
  { pattern: /\bgit\s+push\b[^;&|\n]*(-f|--force|--force-with-lease)\b/i, warning: 'Note: may overwrite remote history' },
  { pattern: /\bgit\s+clean\b(?![^;&|\n]*(?:-[a-zA-Z]*n|--dry-run))[^;&|\n]*-[a-zA-Z]*f/i, warning: 'Note: may permanently delete untracked files' },
  { pattern: /\bgit\s+checkout\s+(--\s+)?\.[ \t]*($|[;&|\n])/i, warning: 'Note: may discard all working tree changes' },
  { pattern: /\bgit\s+stash[ \t]+(drop|clear)\b/i, warning: 'Note: may permanently remove stashed changes' },
  { pattern: /\bgit\s+branch\s+(-D[ \t]|--delete\s+--force)\b/i, warning: 'Note: may force-delete a branch' },
  { pattern: /\bgit\s+(commit|push|merge)\b[^;&|\n]*--no-verify\b/i, warning: 'Note: may skip safety hooks' },
  { pattern: /\bgit\s+commit\b[^;&|\n]*--amend\b/i, warning: 'Note: may rewrite the last commit' },

  // Database
  { pattern: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i, warning: 'Note: may drop or truncate database objects' },
  { pattern: /\bDELETE\s+FROM\s+\w+[ \t]*(;|"|'|\n|$)/i, warning: 'Note: may delete all rows from a database table' },

  // Infrastructure
  { pattern: /\bterraform\s+destroy\b/i, warning: 'Note: may destroy infrastructure' },
  { pattern: /\bkubectl\s+delete\b/i, warning: 'Note: may delete Kubernetes resources' },

  // Stop-Process / Stop-Service with force
  { pattern: /\bStop-Process\b[^|;&\n]*-Force\b/i, warning: 'Note: may forcefully terminate processes' },
  { pattern: /\bStop-Service\b/i, warning: 'Note: may stop a Windows service' },

  // Registry dangerous operations
  { pattern: /\bRemove-ItemProperty\b[^|;&\n]*HKLM:/i, warning: 'Note: may remove system registry entries' },
  { pattern: /\bRemove-Item\b[^|;&\n]*HKLM:/i, warning: 'Note: may remove system registry keys' },
]

/**
 * Returns a warning string if the command matches any destructive pattern,
 * or undefined if the command appears safe.
 */
export function getDestructiveCommandWarningPS(command: string): string | undefined {
  for (const { pattern, warning } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      return warning
    }
  }
  return undefined
}
