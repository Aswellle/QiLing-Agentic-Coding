/**
 * FuzzyPicker — adapted from CC's components/design-system/FuzzyPicker.tsx
 *
 * Generic filtered list picker with search input, keyboard navigation,
 * optional preview panel, and scroll indicators. Used for /model, /theme,
 * /plugins, history search, etc.
 *
 * Adaptations from CC:
 * - onKeyDown via useInput (QiLing doesn't have CC's Box onKeyDown event system)
 * - useTerminalFocus imported directly from hook
 * - borderColor uses theme string keys (QiLing) not CC's 'permission'
 */

import React, { useEffect, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { useSearchInput } from '../../hooks/useSearchInput.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { clamp } from '../../ink/layout/geometry.js'
import { useTerminalFocus } from '../../ink/hooks/use-terminal-focus.js'
import { SearchBox } from '../SearchBox.js'
import { Byline } from './Byline.js'
import { KeyboardShortcutHint } from './KeyboardShortcutHint.js'
import { ListItem } from './ListItem.js'
import { Pane } from './Pane.js'

type PickerAction<T> = {
  action: string
  handler: (item: T) => void
}

type Props<T> = {
  title: string
  placeholder?: string
  initialQuery?: string
  items: readonly T[]
  getKey: (item: T) => string
  renderItem: (item: T, isFocused: boolean) => React.ReactNode
  renderPreview?: (item: T) => React.ReactNode
  previewPosition?: 'bottom' | 'right'
  visibleCount?: number
  direction?: 'down' | 'up'
  onQueryChange: (query: string) => void
  onSelect: (item: T) => void
  onTab?: PickerAction<T>
  onShiftTab?: PickerAction<T>
  onFocus?: (item: T | undefined) => void
  onCancel: () => void
  emptyMessage?: string | ((query: string) => string)
  matchLabel?: string
  selectAction?: string
  extraHints?: React.ReactNode
}

const DEFAULT_VISIBLE = 8
const CHROME_ROWS = 10
const MIN_VISIBLE = 2

export function FuzzyPicker<T>({
  title,
  placeholder = 'Type to search…',
  initialQuery,
  items,
  getKey,
  renderItem,
  renderPreview,
  previewPosition = 'bottom',
  visibleCount: requestedVisible = DEFAULT_VISIBLE,
  direction = 'down',
  onQueryChange,
  onSelect,
  onTab,
  onShiftTab,
  onFocus,
  onCancel,
  emptyMessage = 'No results',
  matchLabel,
  selectAction = 'select',
  extraHints,
}: Props<T>): React.ReactNode {
  const isTerminalFocused = useTerminalFocus()
  const { rows, columns } = useTerminalSize()
  const [focusedIndex, setFocusedIndex] = useState(0)

  const visibleCount = Math.max(
    MIN_VISIBLE,
    Math.min(requestedVisible, rows - CHROME_ROWS - (matchLabel ? 1 : 0)),
  )
  const compact = columns < 120

  const step = (delta: 1 | -1) => {
    setFocusedIndex(i => clamp(i + delta, 0, items.length - 1))
  }

  const { query, cursorOffset } = useSearchInput({
    isActive: true,
    onExit: () => {
      const selected = items[focusedIndex]
      if (selected) onSelect(selected)
    },
    onCancel,
    initialQuery,
    backspaceExitsOnEmpty: false,
  })

  useInput((input, key) => {
    if (key.upArrow || (key.ctrl && input === 'p')) {
      step(direction === 'up' ? 1 : -1)
      return
    }
    if (key.downArrow || (key.ctrl && input === 'n')) {
      step(direction === 'up' ? -1 : 1)
      return
    }
    if (key.tab) {
      const selected = items[focusedIndex]
      if (!selected) return
      const tabAction = key.shift ? (onShiftTab ?? onTab) : onTab
      if (tabAction) tabAction.handler(selected)
      else onSelect(selected)
      return
    }
  })

  useEffect(() => {
    onQueryChange(query)
    setFocusedIndex(0)
  }, [query])

  useEffect(() => {
    setFocusedIndex(i => clamp(i, 0, Math.max(0, items.length - 1)))
  }, [items.length])

  const focused = items[focusedIndex]
  useEffect(() => {
    onFocus?.(focused)
  }, [focused])

  const windowStart = clamp(
    focusedIndex - visibleCount + 1,
    0,
    Math.max(0, items.length - visibleCount),
  )
  const visible = items.slice(windowStart, windowStart + visibleCount)
  const emptyText = typeof emptyMessage === 'function' ? emptyMessage(query) : emptyMessage

  const searchBox = (
    <SearchBox
      query={query}
      cursorOffset={cursorOffset}
      placeholder={placeholder}
      isFocused
      isTerminalFocused={isTerminalFocused}
    />
  )

  const listBlock = (
    <List
      visible={visible}
      windowStart={windowStart}
      visibleCount={visibleCount}
      total={items.length}
      focusedIndex={focusedIndex}
      direction={direction}
      getKey={getKey}
      renderItem={renderItem}
      emptyText={emptyText}
    />
  )

  const preview = renderPreview && focused
    ? <Box flexDirection="column" flexGrow={1}>{renderPreview(focused)}</Box>
    : null

  const listGroup = renderPreview && previewPosition === 'right' ? (
    <Box flexDirection="row" gap={2} height={visibleCount + (matchLabel ? 1 : 0)}>
      <Box flexDirection="column" flexShrink={0}>
        {listBlock}
        {matchLabel && <Text dimColor>{matchLabel}</Text>}
      </Box>
      {preview ?? <Box flexGrow={1} />}
    </Box>
  ) : (
    <Box flexDirection="column">
      {listBlock}
      {matchLabel && <Text dimColor>{matchLabel}</Text>}
      {preview}
    </Box>
  )

  const inputAbove = direction !== 'up'

  return (
    <Pane>
      <Box flexDirection="column" gap={1}>
        <Text bold>{title}</Text>
        {inputAbove && searchBox}
        {listGroup}
        {!inputAbove && searchBox}
        <Text dimColor>
          <Byline>
            <KeyboardShortcutHint shortcut="↑/↓" action={compact ? 'nav' : 'navigate'} />
            <KeyboardShortcutHint shortcut="Enter" action={compact ? firstWord(selectAction) : selectAction} />
            {onTab && <KeyboardShortcutHint shortcut="Tab" action={onTab.action} />}
            {onShiftTab && !compact && <KeyboardShortcutHint shortcut="shift+tab" action={onShiftTab.action} />}
            <KeyboardShortcutHint shortcut="Esc" action="cancel" />
            {extraHints}
          </Byline>
        </Text>
      </Box>
    </Pane>
  )
}

type ListProps<T> = Pick<Props<T>, 'visibleCount' | 'direction' | 'getKey' | 'renderItem'> & {
  visible: readonly T[]
  windowStart: number
  total: number
  focusedIndex: number
  emptyText: string
}

function List<T>({
  visible,
  windowStart,
  visibleCount,
  total,
  focusedIndex,
  direction,
  getKey,
  renderItem,
  emptyText,
}: ListProps<T>): React.ReactNode {
  if (visible.length === 0) {
    return <Box height={visibleCount} flexShrink={0}><Text dimColor>{emptyText}</Text></Box>
  }

  const rows = visible.map((item, i) => {
    const actualIndex = windowStart + i
    const isFocused = actualIndex === focusedIndex
    const atLowEdge = i === 0 && windowStart > 0
    const atHighEdge = i === visible.length - 1 && windowStart + visibleCount! < total
    return (
      <ListItem
        key={getKey(item)}
        isFocused={isFocused}
        showScrollUp={direction === 'up' ? atHighEdge : atLowEdge}
        showScrollDown={direction === 'up' ? atLowEdge : atHighEdge}
        styled={false}
      >
        {renderItem(item, isFocused)}
      </ListItem>
    )
  })

  return (
    <Box height={visibleCount} flexShrink={0} flexDirection={direction === 'up' ? 'column-reverse' : 'column'}>
      {rows}
    </Box>
  )
}

function firstWord(s: string): string {
  const i = s.indexOf(' ')
  return i === -1 ? s : s.slice(0, i)
}
