/**
 * Byline metadata separator — adapted from CC's components/design-system/Byline.tsx
 *
 * Joins children with a middot separator (" · ") for inline metadata display.
 * Named after the publishing term "byline" - metadata shown below a title.
 *
 * Automatically filters null/undefined/false children and only renders
 * separators between valid elements.
 *
 * @example
 * // "Enter to confirm · Esc to cancel"
 * <Text dimColor>
 *   <Byline>
 *     <KeyboardShortcutHint shortcut="Enter" action="confirm" />
 *     <KeyboardShortcutHint shortcut="Esc" action="cancel" />
 *   </Byline>
 * </Text>
 *
 * @example
 * // Conditional: "Esc to cancel" (only one item when enter is hidden)
 * <Text dimColor>
 *   <Byline>
 *     {showEnter && <KeyboardShortcutHint shortcut="Enter" action="confirm" />}
 *     <KeyboardShortcutHint shortcut="Esc" action="cancel" />
 *   </Byline>
 * </Text>
 */

import React, { Children, isValidElement } from 'react'
import { Text } from 'ink'

type Props = {
  children: React.ReactNode
}

export function Byline({ children }: Props): React.ReactNode {
  const validChildren = Children.toArray(children)
  if (validChildren.length === 0) return null

  return (
    <>
      {validChildren.map((child, index) => (
        <React.Fragment key={isValidElement(child) ? (child.key ?? index) : index}>
          {index > 0 && <Text dimColor> · </Text>}
          {child}
        </React.Fragment>
      ))}
    </>
  )
}
