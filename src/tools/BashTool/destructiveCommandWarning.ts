/**
 * Detects potentially destructive bash commands and returns a warning string
 * for display in the permission dialog. This is purely informational — it
 * doesn't affect permission logic or auto-approval.
 *
 * Ported from CC's BashTool/destructiveCommandWarning.ts
 */

type DestructivePattern = {
  pattern: RegExp
  warning: string
}

const DESTRUCTIVE_PATTERNS: DestructivePattern[] = [
  // Git — data loss / hard to reverse
  { pattern: /\bgit\s+reset\s+--hard\b/, warning: 'Note: may discard uncommitted changes' },
  { pattern: /\bgit\s+push\b[^;&|\n]*[ \t](--force|--force-with-lease|-f)\b/, warning: 'Note: may overwrite remote history' },
  { pattern: /\bgit\s+clean\b(?![^;&|\n]*(?:-[a-zA-Z]*n|--dry-run))[^;&|\n]*-[a-zA-Z]*f/, warning: 'Note: may permanently delete untracked files' },
  { pattern: /\bgit\s+checkout\s+(--\s+)?\.[ \t]*($|[;&|\n])/, warning: 'Note: may discard all working tree changes' },
  { pattern: /\bgit\s+restore\s+(--\s+)?\.[ \t]*($|[;&|\n])/, warning: 'Note: may discard all working tree changes' },
  { pattern: /\bgit\s+stash[ \t]+(drop|clear)\b/, warning: 'Note: may permanently remove stashed changes' },
  { pattern: /\bgit\s+branch\s+(-D[ \t]|--delete\s+--force|--force\s+--delete)\b/, warning: 'Note: may force-delete a branch' },

  // Git — safety bypass
  { pattern: /\bgit\s+(commit|push|merge)\b[^;&|\n]*--no-verify\b/, warning: 'Note: may skip safety hooks' },
  { pattern: /\bgit\s+commit\b[^;&|\n]*--amend\b/, warning: 'Note: may rewrite the last commit' },

  // File deletion
  { pattern: /(^|[;&|\n]\s*)rm\s+-[a-zA-Z]*[rR][a-zA-Z]*f|(^|[;&|\n]\s*)rm\s+-[a-zA-Z]*f[a-zA-Z]*[rR]/, warning: 'Note: may recursively force-remove files' },
  { pattern: /(^|[;&|\n]\s*)rm\s+-[a-zA-Z]*[rR]/, warning: 'Note: may recursively remove files' },
  { pattern: /(^|[;&|\n]\s*)rm\s+-[a-zA-Z]*f/, warning: 'Note: may force-remove files' },

  // Database
  { pattern: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i, warning: 'Note: may drop or truncate database objects' },
  { pattern: /\bDELETE\s+FROM\s+\w+[ \t]*(;|"|'|\n|$)/i, warning: 'Note: may delete all rows from a database table' },

  // Infrastructure
  { pattern: /\bterraform\s+destroy\b/, warning: 'Note: may destroy infrastructure' },
  { pattern: /\bkubectl\s+delete\b/, warning: 'Note: may delete Kubernetes resources' },
  { pattern: /\baws\s+.*delete\b/i, warning: 'Note: may delete AWS resources' },

  // Docker
  { pattern: /\bdocker\s+(rm|rmi|system\s+prune|volume\s+rm|network\s+rm)\b/, warning: 'Note: may remove Docker resources' },

  // Process termination
  { pattern: /\bkill\s+-9\b/, warning: 'Note: may forcefully terminate processes' },
  { pattern: /\bpkill\s+-9\b/, warning: 'Note: may forcefully terminate processes' },

  // Archive extraction to dangerous locations
  { pattern: /\b(tar|unzip)\b.*\s+(\/|~\/)\s*$/, warning: 'Note: may extract files to root or home directory' },
]

/**
 * Returns a warning string if the command matches any destructive pattern,
 * or undefined if the command appears safe.
 */
export function getDestructiveCommandWarning(command: string): string | undefined {
  for (const { pattern, warning } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      return warning
    }
  }
  return undefined
}
