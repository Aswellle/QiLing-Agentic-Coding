/**
 * Environment variable utilities — ported from CC's utils/envUtils.ts (core subset)
 *
 * isEnvTruthy(): 1/true/yes/on → true
 * isEnvDefinedFalsy(): 0/false/no/off → true (opposite of truthy, but defined)
 * parseEnvVars(): parse KEY=VALUE strings
 */

import memoize from 'lodash-es/memoize.js'
import { homedir } from 'os'
import { join } from 'path'

/** Returns true for "1", "true", "yes", "on" (case-insensitive). */
export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  return ['1', 'true', 'yes', 'on'].includes(envVar.toLowerCase().trim())
}

/** Returns true for "0", "false", "no", "off" (explicitly disabled). */
export function isEnvDefinedFalsy(envVar: string | boolean | undefined): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  return ['0', 'false', 'no', 'off'].includes(envVar.toLowerCase().trim())
}

/** Parse KEY=VALUE strings into a Record. */
export function parseEnvVars(rawEnvArgs: string[] | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  if (!rawEnvArgs) return result
  for (const envStr of rawEnvArgs) {
    const eqIdx = envStr.indexOf('=')
    if (eqIdx > 0) {
      result[envStr.slice(0, eqIdx)] = envStr.slice(eqIdx + 1)
    }
  }
  return result
}

/** Check if running in "bare" mode (skip non-essential features). */
export function isBareMode(): boolean {
  return isEnvTruthy(process.env.QILING_BARE) || process.argv.includes('--bare')
}

// FROM CC: getClaudeConfigHomeDir
// NAME: .claude → .qiling (Phase C rename)
export const getClaudeConfigHomeDir = memoize(
  (): string => {
    return (
      process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude') // NAME: .claude
    ).normalize('NFC')
  },
  () => process.env.CLAUDE_CONFIG_DIR,
)

// FROM CC: getTeamsDir
export function getTeamsDir(): string {
  return join(getClaudeConfigHomeDir(), 'teams')
}

// FROM CC: hasNodeOption
export function hasNodeOption(flag: string): boolean {
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions) return false
  return nodeOptions.split(/\s+/).includes(flag)
}

// FROM CC: getAWSRegion
export function getAWSRegion(): string {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
}

// FROM CC: getDefaultVertexRegion
export function getDefaultVertexRegion(): string {
  return process.env.CLOUD_ML_REGION || 'us-east5'
}

// FROM CC: shouldMaintainProjectWorkingDir
export function shouldMaintainProjectWorkingDir(): boolean {
  return isEnvTruthy(process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR) // NAME: CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR
}

// FROM CC: isAntUser
export function isAntUser(): boolean {
  return (
    process.env.USER_TYPE === 'ant' ||
    isEnvTruthy(process.env.CLAUDE_RESEARCH_MODE) // NAME: CLAUDE_RESEARCH_MODE
  )
}

// FROM CC: isRunningOnHomespace
export function isRunningOnHomespace(): boolean {
  return isAntUser() && isEnvTruthy(process.env.COO_RUNNING_ON_HOMESPACE)
}

// FROM CC: VERTEX_REGION_OVERRIDES / getVertexRegionForModel
const VERTEX_REGION_OVERRIDES: ReadonlyArray<[string, string]> = [
  ['claude-haiku-4-5', 'VERTEX_REGION_CLAUDE_HAIKU_4_5'],
  ['claude-3-5-haiku', 'VERTEX_REGION_CLAUDE_3_5_HAIKU'],
  ['claude-3-5-sonnet', 'VERTEX_REGION_CLAUDE_3_5_SONNET'],
  ['claude-3-7-sonnet', 'VERTEX_REGION_CLAUDE_3_7_SONNET'],
  ['claude-opus-4-1', 'VERTEX_REGION_CLAUDE_4_1_OPUS'],
  ['claude-opus-4', 'VERTEX_REGION_CLAUDE_4_0_OPUS'],
  ['claude-sonnet-4-6', 'VERTEX_REGION_CLAUDE_4_6_SONNET'],
  ['claude-sonnet-4-5', 'VERTEX_REGION_CLAUDE_4_5_SONNET'],
  ['claude-sonnet-4', 'VERTEX_REGION_CLAUDE_4_0_SONNET'],
]

export function getVertexRegionForModel(model: string | undefined): string | undefined {
  if (model) {
    const match = VERTEX_REGION_OVERRIDES.find(([prefix]) => model.startsWith(prefix))
    if (match) return process.env[match[1]] || getDefaultVertexRegion()
  }
  return getDefaultVertexRegion()
}
