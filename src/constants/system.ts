// FROM CC: constants/system.ts (adapt-new)
// Stripped: bun:bundle feature flags, GrowthBook killswitch, cch attestation placeholder
// NAME: "Claude Code" in CLI_SYSPROMPT_PREFIXES and DEFAULT_PREFIX
import { logForDebugging } from '../utils/debug.js'
import { isEnvDefinedFalsy } from '../utils/envUtils.js'
import { getAPIProvider } from '../utils/model/providers.js'
import { getWorkload } from '../utils/workloadContext.js'

// NAME: Claude Code
const DEFAULT_PREFIX = `You are Claude Code, Anthropic's official CLI for Claude.`
// NAME: Claude Code
const AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX = `You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK.`
const AGENT_SDK_PREFIX = `You are a Claude agent, built on Anthropic's Claude Agent SDK.`

const CLI_SYSPROMPT_PREFIX_VALUES = [
  DEFAULT_PREFIX,
  AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX,
  AGENT_SDK_PREFIX,
] as const

export type CLISyspromptPrefix = (typeof CLI_SYSPROMPT_PREFIX_VALUES)[number]

export const CLI_SYSPROMPT_PREFIXES: ReadonlySet<string> = new Set(
  CLI_SYSPROMPT_PREFIX_VALUES,
)

export function getCLISyspromptPrefix(options?: {
  isNonInteractive: boolean
  hasAppendSystemPrompt: boolean
}): CLISyspromptPrefix {
  const apiProvider = getAPIProvider()
  if (apiProvider === 'vertex') {
    return DEFAULT_PREFIX
  }

  if (options?.isNonInteractive) {
    if (options.hasAppendSystemPrompt) {
      return AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX
    }
    return AGENT_SDK_PREFIX
  }
  return DEFAULT_PREFIX
}

function isAttributionHeaderEnabled(): boolean {
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_ATTRIBUTION_HEADER)) {
    return false
  }
  return true // QiLing: GrowthBook killswitch removed; header always enabled by default
}

export function getAttributionHeader(fingerprint: string): string {
  if (!isAttributionHeaderEnabled()) {
    return ''
  }

  const version = `${process.env.npm_package_version ?? 'unknown'}.${fingerprint}`
  const entrypoint = process.env.CLAUDE_CODE_ENTRYPOINT ?? 'unknown'
  const workload = getWorkload()
  const workloadPair = workload ? ` cc_workload=${workload};` : ''
  // QiLing: cch=00000 attestation placeholder removed (Bun-internal ANT feature)
  const header = `x-anthropic-billing-header: cc_version=${version}; cc_entrypoint=${entrypoint};${workloadPair}`

  logForDebugging(`attribution header ${header}`)
  return header
}
