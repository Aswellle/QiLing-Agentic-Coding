/**
 * Status indicator icon — adapted from CC's components/design-system/StatusIcon.tsx
 *
 * Renders a status icon with appropriate color and symbol.
 *
 * @example
 * <StatusIcon status="success" />
 * <Text><StatusIcon status="error" withSpace />Failed to connect</Text>
 */

import figures from 'figures'
import React from 'react'
import { Text } from 'ink'

type Status = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'loading'

type Props = {
  /**
   * Status to display:
   * - success: Green checkmark (✓)
   * - error:   Red cross (✗)
   * - warning: Yellow warning (⚠)
   * - info:    Blue info (ℹ)
   * - pending: Dimmed circle (○)
   * - loading: Dimmed ellipsis (…)
   */
  status: Status
  /** Include a trailing space after the icon. @default false */
  withSpace?: boolean
}

type ColorName = 'green' | 'red' | 'yellow' | 'blue' | undefined

const STATUS_CONFIG: Record<Status, { icon: string; color: ColorName }> = {
  success: { icon: figures.tick,    color: 'green' },
  error:   { icon: figures.cross,   color: 'red' },
  warning: { icon: figures.warning, color: 'yellow' },
  info:    { icon: figures.info,    color: 'blue' },
  pending: { icon: figures.circle,  color: undefined },
  loading: { icon: '…',             color: undefined },
}

export function StatusIcon({ status, withSpace = false }: Props): React.ReactNode {
  const config = STATUS_CONFIG[status]
  return (
    <Text color={config.color} dimColor={!config.color}>
      {config.icon}
      {withSpace && ' '}
    </Text>
  )
}
