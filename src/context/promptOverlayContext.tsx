/**
 * Prompt overlay context — adapted from CC's context/promptOverlayContext.tsx
 *
 * Portal for floating content above the prompt (suggestions, dialogs).
 * Escapes the FullscreenLayout bottom-slot overflowY:hidden clip.
 * Split into data/setter pairs so writers never re-render on their own writes.
 */

import React, { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

export type PromptOverlayData = {
  suggestions: Array<{ label: string; value: string; description?: string }>
  selectedSuggestion: number
  maxColumnWidth?: number
}

type Setter<T> = (d: T | null) => void

const DataContext = createContext<PromptOverlayData | null>(null)
const SetContext = createContext<Setter<PromptOverlayData> | null>(null)
const DialogContext = createContext<ReactNode>(null)
const SetDialogContext = createContext<Setter<ReactNode> | null>(null)

export function PromptOverlayProvider({ children }: { children: ReactNode }): ReactNode {
  const [data, setData] = useState<PromptOverlayData | null>(null)
  const [dialog, setDialog] = useState<ReactNode>(null)
  return (
    <SetContext.Provider value={setData}>
      <SetDialogContext.Provider value={setDialog}>
        <DataContext.Provider value={data}>
          <DialogContext.Provider value={dialog}>
            {children}
          </DialogContext.Provider>
        </DataContext.Provider>
      </SetDialogContext.Provider>
    </SetContext.Provider>
  )
}

export function usePromptOverlay(): PromptOverlayData | null {
  return useContext(DataContext)
}

export function usePromptOverlayDialog(): ReactNode {
  return useContext(DialogContext)
}

export function useSetPromptOverlay(data: PromptOverlayData | null): void {
  const set = useContext(SetContext)
  useEffect(() => {
    if (!set) return
    set(data)
    return () => set(null)
  }, [set, data])
}

export function useSetPromptOverlayDialog(node: ReactNode): void {
  const set = useContext(SetDialogContext)
  useEffect(() => {
    if (!set) return
    set(node)
    return () => set(null)
  }, [set, node])
}
