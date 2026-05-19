/**
 * Dangerous patterns — CC path compatibility re-export
 *
 * CC path: utils/permissions/dangerousPatterns.ts
 * QiLing implementation: permissions/dangerousPatterns.ts
 *
 * Additional helpers not in the original implementation.
 */

export {
  CROSS_PLATFORM_CODE_EXEC,
  DANGEROUS_BASH_PATTERNS,
  DANGEROUS_POWERSHELL_PATTERNS,
} from '../../permissions/dangerousPatterns.js'

/**
 * Check if a Bash allow-rule prefix is dangerous.
 * Returns true for patterns that would grant arbitrary code execution.
 */
export function isDangerousBashPattern(pattern: string): boolean {
  // Import lazily to avoid circular deps
  const { DANGEROUS_BASH_PATTERNS } = require('../../permissions/dangerousPatterns.js') as {
    DANGEROUS_BASH_PATTERNS: readonly string[]
  }
  const lower = pattern.toLowerCase()
  return DANGEROUS_BASH_PATTERNS.some((p: string) =>
    lower === p ||
    lower.startsWith(p + ' ') ||
    lower.startsWith(p + ':')
  )
}

/**
 * Check if a PowerShell allow-rule prefix is dangerous.
 */
export function isDangerousPowerShellPattern(pattern: string): boolean {
  const { DANGEROUS_POWERSHELL_PATTERNS } = require('../../permissions/dangerousPatterns.js') as {
    DANGEROUS_POWERSHELL_PATTERNS: readonly string[]
  }
  const lower = pattern.toLowerCase()
  return DANGEROUS_POWERSHELL_PATTERNS.some((p: string) =>
    lower === p ||
    lower.startsWith(p.toLowerCase() + ' ') ||
    lower.startsWith(p.toLowerCase() + ':')
  )
}
