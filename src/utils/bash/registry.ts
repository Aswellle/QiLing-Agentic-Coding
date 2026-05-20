/**
 * Bash command spec registry — adapted from CC's utils/bash/registry.ts
 *
 * Provides CommandSpec type definitions and a lookup function for
 * shell command completion/documentation. Specs are loaded lazily from
 * @withfig/autocomplete when not in the bundled spec list.
 */

import { memoizeWithLRU } from '../memoize.js'
import specs from './specs/index.js'

export type CommandSpec = {
  name: string
  description?: string
  subcommands?: CommandSpec[]
  args?: Argument | Argument[]
  options?: Option[]
}

export type Argument = {
  name?: string
  description?: string
  isDangerous?: boolean
  isVariadic?: boolean
  isOptional?: boolean
  isCommand?: boolean
  isModule?: string | boolean
  isScript?: boolean
}

export type Option = {
  name: string | string[]
  description?: string
  args?: Argument | Argument[]
  isRequired?: boolean
}

export async function loadFigSpec(command: string): Promise<CommandSpec | null> {
  if (!command || command.includes('/') || command.includes('\\')) return null
  if (command.includes('..')) return null
  if (command.startsWith('-') && command !== '-') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const module = await import(`@withfig/autocomplete/build/${command}.js`) as any
    return module.default || module
  } catch {
    return null
  }
}

export const getCommandSpec = memoizeWithLRU(
  async (command: string): Promise<CommandSpec | null> => {
    const spec = specs.find(s => s.name === command) || (await loadFigSpec(command)) || null
    return spec
  },
  (command: string) => command,
)
