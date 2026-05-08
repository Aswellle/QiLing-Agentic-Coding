/**
 * Secure subprocess environment — ported from CC's utils/subprocessEnv.ts
 *
 * Strips sensitive secrets from subprocess environments in GitHub Actions.
 * Prevents prompt-injection attacks via shell expansion (${ANTHROPIC_API_KEY}).
 *
 * Enable via: QILING_SUBPROCESS_ENV_SCRUB=1 (or CC's CLAUDE_CODE_SUBPROCESS_ENV_SCRUB)
 * The parent qiling process keeps these vars; only child processes (Bash, MCP stdio) are scrubbed.
 */

const GHA_SUBPROCESS_SCRUB = [
  // Anthropic/AI provider auth
  'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_AUTH_TOKEN',
  'MINIMAX_API_KEY', 'DASHSCOPE_API_KEY', 'ARK_API_KEY', 'ZHIPUAI_API_KEY',
  'OPENAI_API_KEY', 'GEMINI_API_KEY',

  // OTLP monitoring credentials
  'OTEL_EXPORTER_OTLP_HEADERS', 'OTEL_EXPORTER_OTLP_LOGS_HEADERS',
  'OTEL_EXPORTER_OTLP_METRICS_HEADERS', 'OTEL_EXPORTER_OTLP_TRACES_HEADERS',

  // Cloud provider credentials
  'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_BEARER_TOKEN_BEDROCK',
  'GOOGLE_APPLICATION_CREDENTIALS', 'AZURE_CLIENT_SECRET',

  // GitHub Actions OIDC (minting installation tokens)
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_URL',

  // GitHub Actions artifact/cache API
  'ACTIONS_RUNTIME_TOKEN', 'ACTIONS_RUNTIME_URL',

  // GitHub Actions custom inputs that may contain secrets
  'ALL_INPUTS', 'OVERRIDE_GITHUB_TOKEN', 'DEFAULT_WORKFLOW_TOKEN',
] as const

/**
 * Returns a copy of process.env with sensitive secrets stripped, for use when
 * spawning subprocesses (Bash tool, MCP stdio, hooks).
 *
 * Enable by setting QILING_SUBPROCESS_ENV_SCRUB=1 (automatically set in
 * GitHub Actions with untrusted content / claude-code-action).
 */
export function subprocessEnv(): NodeJS.ProcessEnv {
  const shouldScrub =
    process.env.QILING_SUBPROCESS_ENV_SCRUB === '1' ||
    process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB === '1' ||
    // Auto-detect GitHub Actions with potential prompt injection surface
    (process.env.GITHUB_ACTIONS === 'true' && process.env.QILING_SUBPROCESS_ENV_SCRUB !== '0')

  if (!shouldScrub) return process.env

  const env = { ...process.env }
  for (const k of GHA_SUBPROCESS_SCRUB) {
    delete env[k]
    // GitHub Actions auto-creates INPUT_<NAME> for `with:` inputs
    delete env[`INPUT_${k}`]
  }
  return env
}
