/**
 * OSC 8 hyperlink component — adapted from CC's ink/components/Link.tsx
 *
 * Renders clickable hyperlinks in terminals that support OSC 8.
 * Falls back to plain text (or custom fallback) when not supported.
 */

import React, { type ReactNode } from 'react'
import { supportsHyperlinks } from '../supports-hyperlinks.js'
import { Text } from 'ink'

export type Props = {
  readonly children?: ReactNode
  readonly url: string
  readonly fallback?: ReactNode
}

export default function Link({ children, url, fallback }: Props): React.ReactNode {
  const content = children ?? url

  if (supportsHyperlinks()) {
    const linkStart = `\x1b]8;;${url}\x07`
    const linkEnd = `\x1b]8;;\x07`
    return <Text>{linkStart}{content}{linkEnd}</Text>
  }

  return <Text>{fallback ?? content}</Text>
}
