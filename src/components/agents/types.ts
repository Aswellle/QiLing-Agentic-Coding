/**
 * Agent UI state types — adapted from CC's components/agents/types.ts
 */

import type { AgentDefinition } from '../../tools/AgentTool/loadAgentsDir.js'

export const AGENT_PATHS = {
  FOLDER_NAME: '.qiling',
  AGENTS_DIR: 'agents',
} as const

type WithPreviousMode = { previousMode: ModeState }
type WithAgent = { agent: AgentDefinition }

export type ModeState =
  | { mode: 'main-menu' }
  | { mode: 'list-agents'; source: 'all' | 'built-in' | 'user' | 'project' }
  | ({ mode: 'agent-menu' } & WithAgent & WithPreviousMode)
  | ({ mode: 'view-agent' } & WithAgent & WithPreviousMode)
  | { mode: 'create-agent' }
  | ({ mode: 'edit-agent' } & WithAgent & WithPreviousMode)
  | ({ mode: 'delete-confirm' } & WithAgent & WithPreviousMode)

export type AgentValidationResult = {
  isValid: boolean
  warnings: string[]
  errors: string[]
}
