/**
 * useInput hook — adapted from CC's ink/hooks/use-input.ts
 *
 * Re-exports ink's built-in useInput. In CC this wraps the internal
 * StdinContext event emitter; in QiLing we use ink's standard implementation.
 */

import { useInput } from 'ink'
export default useInput
