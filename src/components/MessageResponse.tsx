/**
 * MessageResponse — adapted from CC's components/MessageResponse.tsx
 *
 * Wraps tool/assistant response content with a "⎿" gutter character.
 * Uses context to avoid nesting (only outermost renders the gutter).
 * Wraps in Ratchet (offscreen lock) to prevent height collapse during streaming.
 */

import React, { useContext } from 'react'
import { Box, Text } from 'ink'
import { Ratchet } from './design-system/Ratchet.js'
import { NoSelect } from '../ink/components/NoSelect.js'

type Props = {
  children: React.ReactNode
  height?: number
}

const MessageResponseContext = React.createContext(false)

function MessageResponseProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  return <MessageResponseContext.Provider value={true}>{children}</MessageResponseContext.Provider>
}

export function MessageResponse({ children, height }: Props): React.ReactNode {
  const isMessageResponse = useContext(MessageResponseContext)

  if (isMessageResponse) return <>{children}</>

  const content = (
    <MessageResponseProvider>
      <Box flexDirection="row" height={height} overflowY="hidden">
        <NoSelect fromLeftEdge flexShrink={0}>
          <Text dimColor>{'  '}⎿ &nbsp;</Text>
        </NoSelect>
        <Box flexShrink={1} flexGrow={1}>
          {children}
        </Box>
      </Box>
    </MessageResponseProvider>
  )

  if (height !== undefined) return content

  return <Ratchet lock="offscreen">{content}</Ratchet>
}
