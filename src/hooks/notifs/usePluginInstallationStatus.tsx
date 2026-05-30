// FROM CC: hooks/notifs/usePluginInstallationStatus.tsx (adapt-new)
// s.plugins.installationStatus not in QiLing AppState → safe no-op (undefined)
import * as React from 'react'
import { useEffect, useMemo } from 'react'
import { getIsRemoteMode } from '../../bootstrap/state.js'
import { useNotifications } from '../../context/notifications.js'
import { Text } from 'ink'
import { useAppState } from '../../state/AppState.js'
import { logForDebugging } from '../../utils/debug.js'
import { plural } from '../../utils/stringUtils.js'

export function usePluginInstallationStatus(): void {
  const { addNotification } = useNotifications()
  // QiLing: installationStatus not yet in AppState; always undefined (no-op)
  const installationStatus = useAppState(
    (s: any) => (s.plugins as any).installationStatus as
      | { marketplaces: Array<{status: string}>; plugins: Array<{status: string}> }
      | undefined,
  )

  const { totalFailed, failedMarketplacesCount, failedPluginsCount } =
    useMemo(() => {
      if (!installationStatus) {
        return { totalFailed: 0, failedMarketplacesCount: 0, failedPluginsCount: 0 }
      }
      const failedMarketplaces = installationStatus.marketplaces.filter(m => m.status === 'failed')
      const failedPlugins = installationStatus.plugins.filter(p => p.status === 'failed')
      return {
        totalFailed: failedMarketplaces.length + failedPlugins.length,
        failedMarketplacesCount: failedMarketplaces.length,
        failedPluginsCount: failedPlugins.length,
      }
    }, [installationStatus])

  useEffect(() => {
    if (getIsRemoteMode()) return
    if (!installationStatus) {
      logForDebugging('No installation status to monitor')
      return
    }
    if (totalFailed === 0) return
    logForDebugging(`Plugin installation status: ${failedMarketplacesCount} failed marketplaces, ${failedPluginsCount} failed plugins`)
    addNotification({
      key: 'plugin-install-failed',
      jsx: (
        <>
          <Text color="error">{totalFailed} {plural(totalFailed, 'plugin')} failed to install</Text>
          <Text dimColor> · /plugin for details</Text>
        </>
      ),
      priority: 'medium',
    })
  }, [addNotification, totalFailed, failedMarketplacesCount, failedPluginsCount])
}
