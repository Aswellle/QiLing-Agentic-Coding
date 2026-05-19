/**
 * Ordered list component — adapted from CC's components/ui/OrderedList.tsx
 *
 * Renders an ordered list with properly formatted numeric markers.
 * Aligns markers by padding shorter numbers to match the widest marker.
 *
 * @example
 * <OrderedList>
 *   <OrderedList.Item>First item</OrderedList.Item>
 *   <OrderedList.Item>Second item</OrderedList.Item>
 * </OrderedList>
 */

import React, { createContext, isValidElement, type ReactNode, useContext } from 'react'
import { Box } from 'ink'
import { OrderedListItem, OrderedListItemContext } from './OrderedListItem.js'

const OrderedListContext = createContext({ marker: '' })

type OrderedListProps = { children: ReactNode }

function OrderedListComponent({ children }: OrderedListProps): React.ReactNode {
  const { marker: parentMarker } = useContext(OrderedListContext)

  let numberOfItems = 0
  for (const child of React.Children.toArray(children)) {
    if (!isValidElement(child) || child.type !== OrderedListItem) continue
    numberOfItems++
  }

  const maxMarkerWidth = String(numberOfItems).length

  return (
    <Box flexDirection="column">
      {React.Children.map(children, (child, index) => {
        if (!isValidElement(child) || child.type !== OrderedListItem) return child

        const paddedMarker = `${String(index + 1).padStart(maxMarkerWidth)}.`
        const marker = `${parentMarker}${paddedMarker}`

        return (
          <OrderedListContext.Provider value={{ marker }}>
            <OrderedListItemContext.Provider value={{ marker }}>
              {child}
            </OrderedListItemContext.Provider>
          </OrderedListContext.Provider>
        )
      })}
    </Box>
  )
}

OrderedListComponent.Item = OrderedListItem

export const OrderedList = OrderedListComponent
