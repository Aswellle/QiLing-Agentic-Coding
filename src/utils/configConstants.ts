/**
 * Dependency-free configuration constants — direct port of CC's utils/configConstants.ts
 *
 * IMPORTANT: Do NOT add imports. This file must remain dependency-free to avoid
 * circular dependency issues anywhere it's imported.
 */

export const NOTIFICATION_CHANNELS = [
  'auto',
  'iterm2',
  'iterm2_with_bell',
  'terminal_bell',
  'kitty',
  'ghostty',
  'notifications_disabled',
] as const

export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number]

// Valid editor modes (excludes deprecated 'emacs' which is auto-migrated to 'normal')
export const EDITOR_MODES = ['normal', 'vim'] as const

export type EditorMode = typeof EDITOR_MODES[number]

// Valid teammate modes for spawning
// 'tmux' = traditional tmux-based teammates
// 'in-process' = in-process teammates running in same process
// 'auto' = automatically choose based on context (default)
export const TEAMMATE_MODES = ['auto', 'tmux', 'in-process'] as const

export type TeammateMode = typeof TEAMMATE_MODES[number]
