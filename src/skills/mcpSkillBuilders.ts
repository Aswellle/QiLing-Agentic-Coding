/**
 * MCP skill builder registry — adapted from CC's skills/mcpSkillBuilders.ts
 *
 * Write-once registry for skill builder functions needed by MCP skill discovery.
 * This module is a dependency-graph leaf — it imports only types to avoid
 * circular dependencies between mcpSkills and loadSkillsDir.
 *
 * Registration happens at skills/loader.ts module init (eager startup import).
 * MCP skill discovery calls getMCPSkillBuilders() after registration is complete.
 */

export type SkillBuilder<TCommand, TFields> = {
  createSkillCommand: (args: TCommand) => unknown
  parseSkillFrontmatterFields: (args: TFields) => unknown
}

let builders: unknown | null = null

export function registerMCPSkillBuilders(b: unknown): void {
  builders = b
}

export function getMCPSkillBuilders(): unknown {
  if (!builders) {
    throw new Error(
      'MCP skill builders not registered — skills/loader.ts has not been evaluated yet. ' +
      'Ensure loader.ts is imported before calling getMCPSkillBuilders().',
    )
  }
  return builders
}

export function isMCPSkillBuildersRegistered(): boolean {
  return builders !== null
}
