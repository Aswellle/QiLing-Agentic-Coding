/**
 * File path hyperlink — adapted from CC's components/FilePathLink.tsx
 *
 * Renders a file path as an OSC 8 hyperlink so terminals can identify it
 * even when it appears inside parentheses or other text.
 */

import React from 'react'
import { pathToFileURL } from 'node:url'
import { Text } from 'ink'

type Props = {
  /** The absolute file path */
  filePath: string
  /** Optional display text (defaults to filePath) */
  children?: React.ReactNode
}

export function FilePathLink({ filePath, children }: Props): React.ReactNode {
  const url = pathToFileURL(filePath).href
  // OSC 8 hyperlink — renders as clickable in supported terminals
  const linkStart = `\x1b]8;;${url}\x07`
  const linkEnd = `\x1b]8;;\x07`
  return <Text>{linkStart}{children ?? filePath}{linkEnd}</Text>
}
