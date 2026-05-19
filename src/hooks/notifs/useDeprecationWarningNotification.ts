/**
 * Model deprecation warning notification — adapted from CC's hooks/notifs/useDeprecationWarningNotification.tsx
 *
 * Shows a warning notification when the user has selected a deprecated model.
 */

import { useEffect, useRef } from 'react'
import { useNotifications } from '../../context/notifications.js'
import { logForDebugging } from '../../utils/log.js'
import { getModelDeprecationWarning } from '../../utils/model/deprecation.js'

export function useDeprecationWarningNotification(model: string): void {
  const { addNotification } = useNotifications()
  const lastWarningRef = useRef<string | null>(null)

  useEffect(() => {
    const deprecationWarning = getModelDeprecationWarning(model)

    if (deprecationWarning && deprecationWarning !== lastWarningRef.current) {
      lastWarningRef.current = deprecationWarning
      logForDebugging(`Model deprecation warning: ${model}`)
      addNotification({
        key: 'model-deprecation-warning',
        text: deprecationWarning,
        color: 'yellow',
        priority: 'high',
      })
    }

    if (!deprecationWarning) {
      lastWarningRef.current = null
    }
  }, [model, addNotification])
}
