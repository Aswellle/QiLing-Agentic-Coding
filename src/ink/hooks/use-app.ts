/**
 * useApp hook — adapted from CC's ink/hooks/use-app.ts
 *
 * Re-exports from QiLing's AppContext. Provides { exit } for unmounting the app.
 * In QiLing we use ink's built-in useApp via this wrapper for consistency.
 */

import { useApp } from 'ink'
export default useApp
