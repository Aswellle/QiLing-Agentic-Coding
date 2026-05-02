import type { Tool } from '../types/tool'
import type { Command } from '../commands/index'

/** What a QiLing plugin can export */
export interface PluginManifest {
  /** Plugin display name (defaults to filename) */
  name?: string
  /** Short description shown in /plugins */
  description?: string
  /** Additional tools to register (names auto-prefixed with plugin__<name>__) */
  tools?: Tool[]
  /** Additional slash commands to register */
  commands?: Command[]
}

export interface LoadedPlugin {
  id: string           // sanitised filename, e.g. "my-plugin"
  name: string         // display name
  description: string
  sourcePath: string
  toolCount: number
  commandCount: number
  tools: Tool[]
  commands: Command[]
  error?: string       // set if loading failed
}
