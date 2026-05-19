/**
 * Deferred hook messages — adapted from CC's hooks/useDeferredHookMessages.ts
 *
 * Manages async SessionStart hook messages so the REPL renders immediately
 * instead of blocking on hook execution (~500ms delay).
 *
 * Hook messages are injected asynchronously when the promise resolves.
 * The returned callback should be called before the first API request
 * to ensure the model always sees hook context.
 */

import React, { useCallback, useEffect, useRef } from 'react'
import type { Message } from '../types/message.js'

type HookResultMessage = Message & { fromHook?: boolean }

export function useDeferredHookMessages(
  pendingHookMessages: Promise<HookResultMessage[]> | undefined,
  setMessages: (action: React.SetStateAction<Message[]>) => void,
): () => Promise<void> {
  const pendingRef = useRef(pendingHookMessages ?? null)
  const resolvedRef = useRef(!pendingHookMessages)

  useEffect(() => {
    const promise = pendingRef.current
    if (!promise) return
    let cancelled = false

    promise.then(msgs => {
      if (cancelled) return
      resolvedRef.current = true
      pendingRef.current = null
      if (msgs.length > 0) {
        setMessages(prev => [...msgs, ...prev])
      }
    }).catch(() => {
      if (!cancelled) resolvedRef.current = true
    })

    return () => { cancelled = true }
  }, [setMessages])

  return useCallback(async () => {
    if (resolvedRef.current || !pendingRef.current) return
    const msgs = await pendingRef.current
    if (resolvedRef.current) return
    resolvedRef.current = true
    pendingRef.current = null
    if (msgs.length > 0) {
      setMessages(prev => [...msgs, ...prev])
    }
  }, [setMessages])
}
