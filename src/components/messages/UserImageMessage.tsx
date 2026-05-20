/**
 * User image message — adapted from CC's components/messages/UserImageMessage.tsx
 *
 * Shows image attachment as clickable link (OSC 8) when available,
 * falling back to plain label text.
 */

import React from 'react'
import { pathToFileURL } from 'url'
import { Box, Text } from 'ink'
import Link from '../../ink/components/Link.js'
import { supportsHyperlinks } from '../../ink/supports-hyperlinks.js'
import { MessageResponse } from '../MessageResponse.js'

// Stub: wire to actual imageStore when ported
function getStoredImagePath(_id: number): string | null { return null }

type Props = {
  imageId?: number
  addMargin?: boolean
}

export function UserImageMessage({ imageId, addMargin }: Props): React.ReactNode {
  const label = imageId ? `[Image #${imageId}]` : '[Image]'
  const imagePath = imageId ? getStoredImagePath(imageId) : null

  const content = imagePath && supportsHyperlinks()
    ? <Link url={pathToFileURL(imagePath).href}><Text>{label}</Text></Link>
    : <Text>{label}</Text>

  if (addMargin) return <Box marginTop={1}>{content}</Box>
  return <MessageResponse>{content}</MessageResponse>
}
