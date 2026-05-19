/**
 * Startup notification hook — adapted from CC's hooks/notifs/useStartupNotification.ts
 *
 * Fires notification(s) exactly once on mount. Encapsulates the once-per-session
 * ref guard and async notification logic.
 *
 * @param compute  Sync or async function returning Notification, Notification[], or null
 */

import { useEffect, useRef } from 'react'
import { useNotifications } from '../../context/notifications.js'
import { logError } from '../../utils/log.js'
import type { Notification } from '../../context/notifications.js'

type Result = Notification | Notification[] | null

export function useStartupNotification(
  compute: () => Result | Promise<Result>,
): void {
  const { addNotification } = useNotifications()
  const hasRunRef = useRef(false)
  const computeRef = useRef(compute)
  computeRef.current = compute

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    void Promise.resolve()
      .then(() => computeRef.current())
      .then(result => {
        if (!result) return
        for (const n of Array.isArray(result) ? result : [result]) {
          addNotification(n)
        }
      })
      .catch(logError)
  }, [addNotification])
}
