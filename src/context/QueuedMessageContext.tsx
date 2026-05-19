/**
 * Queued message context — adapted from CC's context/QueuedMessageContext.tsx
 *
 * Provides context for messages that are queued (pending execution).
 * Used by the REPL to visually indicate queued messages with padding.
 */

import React, { useMemo } from 'react'
import { Box } from 'ink'

type QueuedMessageContextValue = {
  isQueued: boolean
  isFirst: boolean
  /** Width reduction for container padding (e.g., 4 for paddingX={2}) */
  paddingWidth: number
}

const QueuedMessageContext = React.createContext<QueuedMessageContextValue | undefined>(undefined)

export function useQueuedMessage(): QueuedMessageContextValue | undefined {
  return React.useContext(QueuedMessageContext)
}

const PADDING_X = 2

type Props = {
  isFirst: boolean
  useBriefLayout?: boolean
  children: React.ReactNode
}

export function QueuedMessageProvider({ isFirst, useBriefLayout, children }: Props): React.ReactNode {
  const padding = useBriefLayout ? 0 : PADDING_X
  const value = useMemo(
    () => ({ isQueued: true, isFirst, paddingWidth: padding * 2 }),
    [isFirst, padding],
  )

  return (
    <QueuedMessageContext.Provider value={value}>
      <Box paddingX={padding}>{children}</Box>
    </QueuedMessageContext.Provider>
  )
}
