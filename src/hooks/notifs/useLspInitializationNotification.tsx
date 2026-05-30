import * as React from 'react'
import { getIsRemoteMode, getIsScrollDraining } from '../../bootstrap/state.js'
import { useNotifications } from '../../context/notifications.js'
import { Text } from 'ink'
import {
  getInitializationStatus,
  getLspServerManager,
} from '../../services/lsp/manager.js'
import { logForDebugging } from '../../utils/debug.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

const LSP_POLL_INTERVAL_MS = 5000

// FROM CC: usehooks-ts not installed — inline useInterval
function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = React.useRef(callback)
  savedCallback.current = callback
  React.useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

/**
 * Hook that polls LSP status and shows a notification when:
 * 1. Manager initialization fails
 * 2. Any LSP server enters an error state
 *
 * Also adds errors to appState.plugins.errors for /doctor display.
 * Only active when ENABLE_LSP_TOOL is set.
 */
export function useLspInitializationNotification(): void {
  const { addNotification } = useNotifications()
  const [shouldPoll, setShouldPoll] = React.useState(() =>
    isEnvTruthy('true'),
  )
  const notifiedErrorsRef = React.useRef<Set<string>>(new Set())

  const addError = React.useCallback(
    (source: string, errorMessage: string) => {
      const errorKey = `${source}:${errorMessage}`
      if (notifiedErrorsRef.current.has(errorKey)) {
        return
      }
      notifiedErrorsRef.current.add(errorKey)

      logForDebugging(`LSP error: ${source} - ${errorMessage}`)
      // FROM CC: QiLing's PluginError type differs — skip appState.plugins.errors update

      const displayName = source.startsWith('plugin:')
        ? (source.split(':')[1] ?? source)
        : source

      addNotification({
        key: `lsp-error-${source}`,
        jsx: (
          <>
            <Text color="error">LSP for {displayName} failed</Text>
            <Text dimColor> · /plugin for details</Text>
          </>
        ),
        priority: 'medium',
        timeoutMs: 8000,
      })
    },
    [addNotification],
  )

  const poll = React.useCallback(() => {
    if (getIsRemoteMode()) return
    if (getIsScrollDraining()) return

    const status = getInitializationStatus()

    if (status.status === 'failed') {
      addError('lsp-manager', status.error.message)
      setShouldPoll(false)
      return
    }

    if (status.status === 'pending' || status.status === 'not-started') {
      return
    }

    const manager = getLspServerManager()
    if (manager) {
      const servers = manager.getAllServers()
      for (const [serverName, server] of servers) {
        if (server.state === 'error' && server.lastError) {
          addError(serverName, server.lastError.message)
        }
      }
    }
  }, [addError])

  useInterval(poll, shouldPoll ? LSP_POLL_INTERVAL_MS : null)

  React.useEffect(() => {
    if (getIsRemoteMode() || !shouldPoll) return
    poll()
  }, [poll, shouldPoll])
}
