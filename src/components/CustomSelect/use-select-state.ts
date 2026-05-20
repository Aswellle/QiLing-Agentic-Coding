/**
 * Select state hook — adapted from CC's components/CustomSelect/use-select-state.ts
 *
 * Wraps useSelectNavigation with value selection tracking.
 * useSelectNavigation handles viewport/focus; this adds the selected value.
 */

import { useCallback, useState } from 'react'
import type { OptionWithDescription, SelectNavigation } from './use-select-navigation.js'
import { useSelectNavigation } from './use-select-navigation.js'

export type UseSelectStateProps<T> = {
  visibleOptionCount?: number
  options: OptionWithDescription<T>[]
  defaultValue?: T
  onChange?: (value: T) => void
  onCancel?: () => void
  onFocus?: (value: T) => void
  focusValue?: T
}

export type SelectState<T> = SelectNavigation<T> & {
  value: T | undefined
  selectFocusedOption: () => void
  onChange?: (value: T) => void
  onCancel?: () => void
}

export function useSelectState<T>({
  visibleOptionCount = 5,
  options,
  defaultValue,
  onChange,
  onCancel,
  onFocus,
  focusValue,
}: UseSelectStateProps<T>): SelectState<T> {
  const [value, setValue] = useState<T | undefined>(defaultValue)

  const navigation = useSelectNavigation<T>({
    visibleOptionCount,
    options,
    initialFocusValue: undefined,
    onFocus,
    focusValue,
  })

  const selectFocusedOption = useCallback(() => {
    setValue(navigation.focusedValue)
  }, [navigation.focusedValue])

  return { ...navigation, value, selectFocusedOption, onChange, onCancel }
}
