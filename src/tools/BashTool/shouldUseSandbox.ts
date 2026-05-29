// FROM CC: tools/BashTool/shouldUseSandbox.ts (stub — pending bashPermissions.ts port)
// Full logic deferred; simplified version that checks sandbox enabled flag only.

import { SandboxManager } from '../../utils/sandbox/index.js'

type SandboxInput = {
  command?: string
  dangerouslyDisableSandbox?: boolean
}

export function shouldUseSandbox(input: Partial<SandboxInput>): boolean {
  if (!SandboxManager.isSandboxingEnabled()) return false
  if (input.dangerouslyDisableSandbox) return false
  if (!input.command) return false
  return true
}
