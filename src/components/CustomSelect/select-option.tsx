/**
 * SelectOption — adapted from CC's components/CustomSelect/select-option.tsx
 *
 * Renders a single option in a select list using ListItem.
 * Supports focus, selection, description, and scroll arrow indicators.
 */

import React, { type ReactNode } from 'react'
import { ListItem } from '../design-system/ListItem.js'

export type SelectOptionProps = {
  readonly isFocused: boolean
  readonly isSelected: boolean
  readonly children: ReactNode
  readonly description?: string
  readonly shouldShowDownArrow?: boolean
  readonly shouldShowUpArrow?: boolean
  readonly declareCursor?: boolean
}

export function SelectOption({
  isFocused,
  isSelected,
  children,
  description,
  shouldShowDownArrow,
  shouldShowUpArrow,
}: SelectOptionProps): React.ReactNode {
  return (
    <ListItem
      isFocused={isFocused}
      isSelected={isSelected}
      description={description}
      showScrollDown={shouldShowDownArrow}
      showScrollUp={shouldShowUpArrow}
      styled={false}
    >
      {children}
    </ListItem>
  )
}
