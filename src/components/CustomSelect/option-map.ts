/**
 * OptionMap — adapted from CC's components/CustomSelect/option-map.ts
 *
 * Doubly-linked list + Map for O(1) next/prev navigation in selects.
 * Maintains insertion order with index tracking.
 */

import type { ReactNode } from 'react'

type OptionWithDescription<T> = {
  label: ReactNode
  value: T
  description?: string
}

type OptionMapItem<T> = {
  label: ReactNode
  value: T
  description?: string
  previous: OptionMapItem<T> | undefined
  next: OptionMapItem<T> | undefined
  index: number
}

export default class OptionMap<T> extends Map<T, OptionMapItem<T>> {
  readonly first: OptionMapItem<T> | undefined
  readonly last: OptionMapItem<T> | undefined

  constructor(options: OptionWithDescription<T>[]) {
    const items: Array<[T, OptionMapItem<T>]> = []
    let firstItem: OptionMapItem<T> | undefined
    let lastItem: OptionMapItem<T> | undefined
    let previous: OptionMapItem<T> | undefined
    let index = 0

    for (const option of options) {
      const item: OptionMapItem<T> = { label: option.label, value: option.value, description: option.description, previous, next: undefined, index }
      if (previous) previous.next = item
      firstItem ||= item
      lastItem = item
      items.push([option.value, item])
      index++
      previous = item
    }

    super(items)
    this.first = firstItem
    this.last = lastItem
  }
}
