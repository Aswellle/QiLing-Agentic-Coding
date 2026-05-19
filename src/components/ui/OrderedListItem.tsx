/**
 * Ordered list item component — adapted from CC's components/ui/OrderedListItem.tsx
 *
 * Renders a list item with a marker (e.g., "1.", "2.", "a.") using React context
 * to receive the marker from a parent ordered list.
 */

import React, { createContext, type ReactNode, useContext } from 'react'
import { Box, Text } from 'ink'

export const OrderedListItemContext = createContext({ marker: '' })

type OrderedListItemProps = {
  children: ReactNode
}

export function OrderedListItem({ children }: OrderedListItemProps): React.ReactNode {
  const { marker } = useContext(OrderedListItemContext)
  return (
    <Box gap={1}>
      <Text dimColor>{marker}</Text>
      <Box flexDirection="column">{children}</Box>
    </Box>
  )
}
