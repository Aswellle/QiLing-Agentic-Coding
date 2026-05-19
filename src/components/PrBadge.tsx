/**
 * PR Badge — adapted from CC's components/PrBadge.tsx
 *
 * Renders a PR number as a hyperlink with status-based color coding.
 * Colors: approved=success, changes_requested=error, pending=warning, merged=merged.
 */

import React from 'react'
import { Text } from 'ink'
import Link from '../ink/components/Link.js'

export type PrReviewState = 'approved' | 'changes_requested' | 'pending' | 'merged' | 'unknown'

type Props = {
  number: number
  url: string
  reviewState?: PrReviewState
  bold?: boolean
}

function getPrStatusColor(state?: PrReviewState): string | undefined {
  switch (state) {
    case 'approved': return 'green'
    case 'changes_requested': return 'red'
    case 'pending': return 'yellow'
    case 'merged': return 'magenta'
    default: return undefined
  }
}

export function PrBadge({ number, url, reviewState, bold }: Props): React.ReactNode {
  const color = getPrStatusColor(reviewState)
  const label = <Text color={color} dimColor={!color && !bold} bold={bold}>#{number}</Text>
  return (
    <Text>
      <Text dimColor={!bold}>PR</Text>{' '}
      <Link url={url} fallback={label}>
        <Text color={color} dimColor={!color && !bold} underline bold={bold}>
          #{number}
        </Text>
      </Link>
    </Text>
  )
}
