/**
 * Notifications context — adapted from CC's context/notifications.tsx
 *
 * Priority-based notification queue with timeout support.
 * Notifications are shown one at a time; immediate priority jumps the queue.
 *
 * Usage:
 *   const { addNotification, removeNotification } = useNotifications()
 *   addNotification({ key: 'update', text: 'New version available', priority: 'medium' })
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Priority = 'low' | 'medium' | 'high' | 'immediate'

type BaseNotification = {
  key: string
  priority: Priority
  timeoutMs?: number
  /** Keys of notifications this notification invalidates */
  invalidates?: string[]
}

type TextNotification = BaseNotification & {
  text: string
  color?: string
}

type JSXNotification = BaseNotification & {
  jsx: React.ReactNode
}

export type Notification = TextNotification | JSXNotification

type NotificationState = {
  queue: Notification[]
  current: Notification | null
}

type NotificationsContextValue = {
  addNotification: (n: Notification) => void
  removeNotification: (key: string) => void
  current: Notification | null
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

const DEFAULT_TIMEOUT_MS = 8_000
const PRIORITY_ORDER: Record<Priority, number> = {
  immediate: 3,
  high: 2,
  medium: 1,
  low: 0,
}

function sortedInsert(queue: Notification[], notification: Notification): Notification[] {
  const idx = queue.findIndex(
    n => PRIORITY_ORDER[n.priority] < PRIORITY_ORDER[notification.priority],
  )
  if (idx === -1) {
    return [...queue, notification]
  }
  const result = [...queue]
  result.splice(idx, 0, notification)
  return result
}

type Props = { children: React.ReactNode }

export function NotificationsProvider({ children }: Props): React.ReactNode {
  const [state, setState] = useState<NotificationState>({ queue: [], current: null })
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearCurrent = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    setState(prev => ({ ...prev, current: null }))
  }, [])

  const processQueue = useCallback(() => {
    setState(prev => {
      if (prev.current !== null || prev.queue.length === 0) return prev
      const [next, ...rest] = prev.queue
      return { queue: rest, current: next ?? null }
    })
  }, [])

  // Start timer when current notification changes
  useEffect(() => {
    if (!state.current) {
      processQueue()
      return
    }
    const ms = state.current.timeoutMs ?? DEFAULT_TIMEOUT_MS
    timeoutRef.current = setTimeout(() => {
      clearCurrent()
    }, ms)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [state.current, processQueue, clearCurrent])

  const addNotification = useCallback((n: Notification) => {
    setState(prev => {
      // Invalidate other notifications
      const invalidated = new Set(n.invalidates ?? [])
      const queue = prev.queue.filter(q => !invalidated.has(q.key))

      // Check for duplicate key in queue
      const existingIdx = queue.findIndex(q => q.key === n.key)
      if (existingIdx !== -1) {
        const newQueue = [...queue]
        newQueue[existingIdx] = n
        return { ...prev, queue: newQueue }
      }

      // Immediate priority: show immediately
      if (n.priority === 'immediate') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        return { queue, current: n }
      }

      return { ...prev, queue: sortedInsert(queue, n) }
    })
  }, [])

  const removeNotification = useCallback((key: string) => {
    setState(prev => {
      if (prev.current?.key === key) {
        clearCurrent()
        return { queue: prev.queue, current: null }
      }
      return { ...prev, queue: prev.queue.filter(n => n.key !== key) }
    })
  }, [clearCurrent])

  return (
    <NotificationsContext.Provider value={{ addNotification, removeNotification, current: state.current }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    // Graceful fallback for components outside the provider
    return {
      addNotification: () => {},
      removeNotification: () => {},
      current: null,
    }
  }
  return ctx
}

export function useCurrentNotification(): Notification | null {
  return useNotifications().current
}
