/**
 * ClickableImageRef — adapted from CC's components/ClickableImageRef.tsx
 *
 * Renders [Image #N] as a clickable OSC 8 hyperlink when the terminal
 * supports it and the image file is found in the store.
 */

import React from 'react'
import { pathToFileURL } from 'url'
import { Text } from 'ink'
import Link from '../ink/components/Link.js'
import { supportsHyperlinks } from '../ink/supports-hyperlinks.js'

// Stub: wire to actual imageStore when ported
function getStoredImagePath(_id: number): string | null { return null }

type Props = {
  imageId: number
  backgroundColor?: string
  isSelected?: boolean
}

export function ClickableImageRef({ imageId, backgroundColor, isSelected = false }: Props): React.ReactNode {
  const imagePath = getStoredImagePath(imageId)
  const displayText = `[Image #${imageId}]`

  if (imagePath && supportsHyperlinks()) {
    const fileUrl = pathToFileURL(imagePath).href
    return (
      <Link url={fileUrl} fallback={<Text backgroundColor={backgroundColor} inverse={isSelected}>{displayText}</Text>}>
        <Text backgroundColor={backgroundColor} inverse={isSelected} bold={isSelected}>{displayText}</Text>
      </Link>
    )
  }

  return <Text backgroundColor={backgroundColor} inverse={isSelected}>{displayText}</Text>
}
