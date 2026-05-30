/**
 * Environment detection utilities — adapted from CC's utils/env.ts
 *
 * Provides terminal/platform detection constants used throughout the codebase.
 * Simplified for QiLing: removes CC-specific auth/billing fields.
 */

import { existsSync, readFileSync } from 'fs'
import { isEnvTruthy } from './envUtils.js'

export type TerminalType =
  | 'iterm2' | 'kitty' | 'ghostty' | 'vscode' | 'wezterm'
  | 'windows-terminal' | 'hyper' | 'alacritty' | 'unknown'

function detectTerminal(): TerminalType {
  const tp = process.env.TERM_PROGRAM
  const te = process.env.TERM_EMULATOR

  if (process.env.ITERM_SESSION_ID || tp === 'iTerm.app') return 'iterm2'
  if (process.env.KITTY_WINDOW_ID) return 'kitty'
  if (tp === 'ghostty') return 'ghostty'
  if (process.env.VSCODE_INJECTION || process.env.VSCODE_PID) return 'vscode'
  if (process.env.WT_SESSION) return 'windows-terminal'
  if (process.env.WEZTERM_EXECUTABLE) return 'wezterm'
  if (te === 'hyper') return 'hyper'
  if (tp === 'alacritty') return 'alacritty'
  return 'unknown'
}

export const env = {
  terminal: detectTerminal(),
  platform: process.platform as 'win32' | 'darwin' | 'linux',
  isCI: !!(process.env.CI || process.env.CONTINUOUS_INTEGRATION),
  isTTY: process.stdout.isTTY ?? false,
  isInTmux: !!process.env.TMUX,
  isInScreen: !!process.env.STY,
}

// FROM CC: JETBRAINS_IDES
export const JETBRAINS_IDES = [
  'pycharm', 'intellij', 'webstorm', 'phpstorm', 'rubymine',
  'clion', 'goland', 'rider', 'datagrip', 'appcode',
  'dataspell', 'aqua', 'gateway', 'fleet', 'jetbrains', 'androidstudio',
]

// FROM CC: detectDeploymentEnvironment
// Adapted: uses fs.existsSync/readFileSync directly (no getFsImplementation abstraction in QiLing)
export function detectDeploymentEnvironment(): string {
  // Cloud development environments
  if (isEnvTruthy(process.env.CODESPACES)) return 'codespaces'
  if (process.env.GITPOD_WORKSPACE_ID) return 'gitpod'
  if (process.env.REPL_ID || process.env.REPL_SLUG) return 'replit'
  if (process.env.PROJECT_DOMAIN) return 'glitch'

  // Cloud platforms
  if (isEnvTruthy(process.env.VERCEL)) return 'vercel'
  if (process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_SERVICE_NAME) return 'railway'
  if (isEnvTruthy(process.env.RENDER)) return 'render'
  if (isEnvTruthy(process.env.NETLIFY)) return 'netlify'
  if (process.env.DYNO) return 'heroku'
  if (process.env.FLY_APP_NAME || process.env.FLY_MACHINE_ID) return 'fly.io'
  if (isEnvTruthy(process.env.CF_PAGES)) return 'cloudflare-pages'
  if (process.env.DENO_DEPLOYMENT_ID) return 'deno-deploy'
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'aws-lambda'
  if (process.env.AWS_EXECUTION_ENV === 'AWS_ECS_FARGATE') return 'aws-fargate'
  if (process.env.AWS_EXECUTION_ENV === 'AWS_ECS_EC2') return 'aws-ecs'
  try {
    const uuid = readFileSync('/sys/hypervisor/uuid', { encoding: 'utf8' }).trim().toLowerCase()
    if (uuid.startsWith('ec2')) return 'aws-ec2'
  } catch { /* non-EC2 */ }
  if (process.env.K_SERVICE) return 'gcp-cloud-run'
  if (process.env.GOOGLE_CLOUD_PROJECT) return 'gcp'
  if (process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_SKU) return 'azure-app-service'
  if (process.env.AZURE_FUNCTIONS_ENVIRONMENT) return 'azure-functions'
  if (process.env.APP_URL?.includes('ondigitalocean.app')) return 'digitalocean-app-platform'
  if (process.env.SPACE_CREATOR_USER_ID) return 'huggingface-spaces'

  // CI/CD platforms
  if (isEnvTruthy(process.env.GITHUB_ACTIONS)) return 'github-actions'
  if (isEnvTruthy(process.env.GITLAB_CI)) return 'gitlab-ci'
  if (process.env.CIRCLECI) return 'circleci'
  if (process.env.BUILDKITE) return 'buildkite'
  if (isEnvTruthy(process.env.CI)) return 'ci'

  // Container orchestration
  if (process.env.KUBERNETES_SERVICE_HOST) return 'kubernetes'
  try {
    if (existsSync('/.dockerenv')) return 'docker'
  } catch { /* ignore */ }

  if (env.platform === 'darwin') return 'unknown-darwin'
  if (env.platform === 'linux') return 'unknown-linux'
  if (env.platform === 'win32') return 'unknown-win32'
  return 'unknown'
}

// FROM CC: getHostPlatformForAnalytics
export function getHostPlatformForAnalytics(): 'win32' | 'darwin' | 'linux' {
  const override = process.env.CLAUDE_CODE_HOST_PLATFORM // NAME: CLAUDE_CODE_HOST_PLATFORM
  if (override === 'win32' || override === 'darwin' || override === 'linux') return override
  return env.platform
}

// FROM CC: utils/env.ts getGlobalClaudeFile
import memoize from 'lodash-es/memoize.js'
import { join } from 'path'
import { getClaudeConfigHomeDir } from './envUtils.js'

export const getGlobalClaudeFile = memoize((): string => {
  // Legacy fallback: ~/.claude/.config.json
  const legacyPath = join(getClaudeConfigHomeDir(), '.config.json')
  if (existsSync(legacyPath)) {
    return legacyPath
  }
  return join(getClaudeConfigHomeDir(), '.claude.json')
})
