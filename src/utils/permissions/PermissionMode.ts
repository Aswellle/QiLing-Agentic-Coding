/**
 * Permission mode utilities — adapted from CC's utils/permissions/PermissionMode.ts
 *
 * Provides display names, symbols, and helpers for the permission mode system.
 * Permission modes: default, plan, acceptEdits, bypassPermissions, dontAsk
 */

import { PAUSE_ICON } from '../../constants/figures.js'
import { z } from 'zod'
import { lazySchema } from '../lazySchema.js'

export type PermissionMode = 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions' | 'dontAsk'
export type ExternalPermissionMode = Exclude<PermissionMode, never>

export const PERMISSION_MODES = ['default', 'plan', 'acceptEdits', 'bypassPermissions', 'dontAsk'] as const
export const EXTERNAL_PERMISSION_MODES = PERMISSION_MODES

// FROM CC: Zod schemas for permission mode validation
export const permissionModeSchema = lazySchema(() => z.enum(PERMISSION_MODES))
export const externalPermissionModeSchema = lazySchema(() => z.enum(EXTERNAL_PERMISSION_MODES))

type ModeColorKey = 'text' | 'planMode' | 'permission' | 'autoAccept' | 'error' | 'warning'

type PermissionModeConfig = {
  title: string
  shortTitle: string
  symbol: string
  color: ModeColorKey
}

const PERMISSION_MODE_CONFIG: Record<PermissionMode, PermissionModeConfig> = {
  default: {
    title: 'Default',
    shortTitle: 'Default',
    symbol: '',
    color: 'text',
  },
  plan: {
    title: 'Plan Mode',
    shortTitle: 'Plan',
    symbol: PAUSE_ICON,
    color: 'planMode',
  },
  acceptEdits: {
    title: 'Accept edits',
    shortTitle: 'Accept',
    symbol: '⏵⏵',
    color: 'autoAccept',
  },
  bypassPermissions: {
    title: 'Bypass Permissions',
    shortTitle: 'Bypass',
    symbol: '⏵⏵',
    color: 'error',
  },
  dontAsk: {
    title: "Don't Ask",
    shortTitle: 'DontAsk',
    symbol: '⏵⏵',
    color: 'error',
  },
}

function getModeConfig(mode: PermissionMode): PermissionModeConfig {
  return PERMISSION_MODE_CONFIG[mode] ?? PERMISSION_MODE_CONFIG.default
}

export function permissionModeFromString(str: string): PermissionMode {
  return (PERMISSION_MODES as readonly string[]).includes(str)
    ? (str as PermissionMode)
    : 'default'
}

export function permissionModeTitle(mode: PermissionMode): string {
  return getModeConfig(mode).title
}

export function permissionModeShortTitle(mode: PermissionMode): string {
  return getModeConfig(mode).shortTitle
}

export function permissionModeSymbol(mode: PermissionMode): string {
  return getModeConfig(mode).symbol
}

export function getModeColor(mode: PermissionMode): ModeColorKey {
  return getModeConfig(mode).color
}

export function isDefaultMode(mode: PermissionMode | undefined): boolean {
  return mode === 'default' || mode === undefined
}

export function isExternalPermissionMode(mode: PermissionMode): mode is ExternalPermissionMode {
  return true  // In QiLing, all modes are external
}

export function toExternalPermissionMode(mode: PermissionMode): ExternalPermissionMode {
  return mode
}
