/**
 * After-first-render hook — adapted from CC's hooks/useAfterFirstRender.ts
 *
 * Used for startup timing measurement. Set QILING_EXIT_AFTER_FIRST_RENDER=1
 * (or CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER=1) to print startup time and exit.
 *
 * Useful for CI/benchmark scripts that measure startup performance.
 */

import { useEffect } from 'react'

export function useAfterFirstRender(): void {
  useEffect(() => {
    const shouldExit =
      process.env.QILING_EXIT_AFTER_FIRST_RENDER === '1' ||
      process.env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER === '1'

    if (shouldExit) {
      process.stderr.write(`\nStartup time: ${Math.round(process.uptime() * 1000)}ms\n`)
      process.exit(0)
    }
  }, [])
}
