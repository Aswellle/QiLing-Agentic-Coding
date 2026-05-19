/**
 * Permission request title — adapted from CC's components/permissions/PermissionRequestTitle.tsx
 *
 * Renders the title and subtitle for a permission request dialog.
 * Supports an optional worker badge for coordinator agent context.
 */

import React from 'react'
import { Box, Text } from 'ink'

type WorkerBadgeProps = {
  name: string
  color?: string
}

type Props = {
  title: string
  subtitle?: React.ReactNode
  color?: string
  workerBadge?: WorkerBadgeProps
}

export function PermissionRequestTitle({
  title,
  subtitle,
  color = 'cyan',
  workerBadge,
}: Props): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text bold color={color}>{title}</Text>
        {workerBadge && (
          <Text dimColor>· @{workerBadge.name}</Text>
        )}
      </Box>
      {subtitle != null && (
        typeof subtitle === 'string' ? (
          <Text dimColor wrap="truncate-start">{subtitle}</Text>
        ) : subtitle
      )}
    </Box>
  )
}
