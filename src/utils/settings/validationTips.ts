/**
 * Settings validation tips — adapted from CC's utils/settings/validationTips.ts
 *
 * Maps Zod validation error contexts to human-readable suggestions and doc links.
 * Used by the settings validation pipeline to improve error messages.
 */

export type ValidationTip = {
  suggestion?: string
  docLink?: string
}

export type TipContext = {
  path: string
  code: string
  expected?: string
  received?: unknown
  enumValues?: string[]
  message?: string
  value?: unknown
}

const DOCS = 'https://code.claude.com/docs/en'

type TipMatcher = { matches: (ctx: TipContext) => boolean; tip: ValidationTip }

const TIP_MATCHERS: TipMatcher[] = [
  { matches: ctx => ctx.path === 'permissions.defaultMode' && ctx.code === 'invalid_value', tip: { suggestion: 'Valid modes: "acceptEdits", "plan", "bypassPermissions", or "default"', docLink: `${DOCS}/iam#permission-modes` } },
  { matches: ctx => ctx.path === 'apiKeyHelper' && ctx.code === 'invalid_type', tip: { suggestion: 'Provide a shell command that outputs your API key. Example: "/bin/generate_temp_api_key.sh"' } },
  { matches: ctx => ctx.path === 'cleanupPeriodDays' && ctx.code === 'too_small', tip: { suggestion: 'Must be 0 or greater. 0 disables session persistence.' } },
  { matches: ctx => ctx.path.startsWith('env.') && ctx.code === 'invalid_type', tip: { suggestion: 'Environment variables must be strings. Example: "DEBUG": "true", "PORT": "3000"', docLink: `${DOCS}/settings#environment-variables` } },
  { matches: ctx => (ctx.path === 'permissions.allow' || ctx.path === 'permissions.deny') && ctx.code === 'invalid_type' && ctx.expected === 'array', tip: { suggestion: 'Permission rules must be in an array. Example: ["Bash(npm run build)", "Edit(docs/**)", "Read(~/.zshrc)"]' } },
  { matches: ctx => ctx.path.includes('hooks') && ctx.code === 'invalid_type', tip: { suggestion: 'Hooks: {"PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "echo Done"}]}]}' } },
  { matches: ctx => ctx.code === 'invalid_type' && ctx.expected === 'boolean', tip: { suggestion: 'Use true or false without quotes. Example: "includeCoAuthoredBy": true' } },
  { matches: ctx => ctx.code === 'unrecognized_keys', tip: { suggestion: 'Check for typos or refer to the documentation for valid fields', docLink: `${DOCS}/settings` } },
  { matches: ctx => ctx.code === 'invalid_value' && ctx.enumValues !== undefined, tip: {} },
  { matches: ctx => ctx.code === 'invalid_type' && ctx.expected === 'object' && ctx.received === null && ctx.path === '', tip: { suggestion: 'Check for missing commas, unmatched brackets, or trailing commas. Use a JSON validator.' } },
  { matches: ctx => ctx.path === 'permissions.additionalDirectories' && ctx.code === 'invalid_type', tip: { suggestion: 'Must be an array of directory paths. Example: ["~/projects", "/tmp/workspace"]', docLink: `${DOCS}/iam#working-directories` } },
]

const PATH_DOC_LINKS: Record<string, string> = {
  permissions: `${DOCS}/iam#configuring-permissions`,
  env: `${DOCS}/settings#environment-variables`,
  hooks: `${DOCS}/hooks`,
}

export function getValidationTip(context: TipContext): ValidationTip | null {
  const matcher = TIP_MATCHERS.find(m => m.matches(context))
  if (!matcher) return null

  const tip: ValidationTip = { ...matcher.tip }

  if (context.code === 'invalid_value' && context.enumValues && !tip.suggestion) {
    tip.suggestion = `Valid values: ${context.enumValues.map(v => `"${v}"`).join(', ')}`
  }

  if (!tip.docLink && context.path) {
    const prefix = context.path.split('.')[0]
    if (prefix) tip.docLink = PATH_DOC_LINKS[prefix]
  }

  return tip
}
