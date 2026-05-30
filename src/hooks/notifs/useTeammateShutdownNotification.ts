import { useEffect, useRef } from 'react'
import { getIsRemoteMode } from '../../bootstrap/state.js'
import {
  type Notification,
  useNotifications,
} from '../../context/notifications.js'

// FROM CC: isInProcessTeammateTask from tasks/InProcessTeammateTask/types.ts — stub
const isInProcessTeammateTask = (_task: unknown): boolean => false

function makeSpawnNotif(count: number): Notification {
  return {
    key: 'teammate-spawn',
    text: count === 1 ? '1 agent spawned' : `${count} agents spawned`,
    priority: 'low',
    timeoutMs: 5000,
  }
}

function makeShutdownNotif(count: number): Notification {
  return {
    key: 'teammate-shutdown',
    text: count === 1 ? '1 agent shut down' : `${count} agents shut down`,
    priority: 'low',
    timeoutMs: 5000,
  }
}

/**
 * Fires batched notifications when in-process teammates spawn or shut down.
 * FROM CC: QiLing's AppState.tasks not available — hook is currently a no-op.
 * Will be activated once task tracking is ported.
 */
export function useTeammateLifecycleNotification(): void {
  const { addNotification: _addNotification } = useNotifications()
  const seenRunningRef = useRef<Set<string>>(new Set())
  const seenCompletedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (getIsRemoteMode()) return
    // FROM CC: AppState.tasks not in QiLing yet — no-op until tasks are ported
    void seenRunningRef
    void seenCompletedRef
    void isInProcessTeammateTask
  }, [])
}
