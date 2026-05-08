/**
 * Pattern lists for dangerous shell-tool allow-rule prefixes — ported from CC's
 * utils/permissions/dangerousPatterns.ts
 *
 * An allow rule like `Bash(python:*)` lets the model run arbitrary code via
 * that interpreter, bypassing the classifier. These lists feed the permission
 * setup to strip such rules in auto-mode.
 */

export const CROSS_PLATFORM_CODE_EXEC = [
  // Interpreters
  'python', 'python3', 'python2', 'node', 'deno', 'tsx', 'ruby', 'perl', 'php', 'lua',
  // Package runners
  'npx', 'bunx', 'npm run', 'yarn run', 'pnpm run', 'bun run',
  // Shells
  'bash', 'sh',
  // Remote
  'ssh',
] as const

export const DANGEROUS_BASH_PATTERNS: readonly string[] = [
  ...CROSS_PLATFORM_CODE_EXEC,
  'zsh', 'fish', 'eval', 'exec', 'env',
  'xargs', 'sudo',
]

export const DANGEROUS_POWERSHELL_PATTERNS: readonly string[] = [
  ...CROSS_PLATFORM_CODE_EXEC,
  'powershell', 'pwsh',
]
