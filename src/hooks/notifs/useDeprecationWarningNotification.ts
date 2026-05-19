/**
 * Model deprecation warning notification — adapted from CC's hooks/notifs/useDeprecationWarningNotification.tsx
 *
 * Shows a warning notification when the user has selected a deprecated model.
 */

import { useEffect, useRef } from 'react'
import { useNotifications } from '../../context/notifications.js'
import { logForDebugging } from '../../utils/log.js'

// Known deprecated models and their replacements
const DEPRECATED_MODELS: Record<string, string> = {
  'claude-2': '请升级到 Claude 3 或更新版本',
  'claude-2.0': '请升级到 Claude 3 或更新版本',
  'claude-2.1': '请升级到 Claude 3 或更新版本',
  'claude-instant-1': '请升级到 Claude 3 Haiku 或 Sonnet',
  'claude-1': '请升级到 Claude 3 或更新版本',
}

function getModelDeprecationWarning(model: string): string | null {
  const lowerModel = model.toLowerCase()
  for (const [pattern, message] of Object.entries(DEPRECATED_MODELS)) {
    if (lowerModel.includes(pattern)) {
      return `⚠ 模型 ${model} 已废弃。${message}`
    }
  }
  return null
}

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
