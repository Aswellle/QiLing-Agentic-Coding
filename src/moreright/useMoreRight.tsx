/**
 * useMoreRight stub — adapted from CC's moreright/useMoreRight.tsx
 *
 * External (non-Anthropic) builds: always returns no-op implementations.
 * Internal ANT builds have the real implementation with MoreRight AI features.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type M = any

export function useMoreRight(_args: {
  enabled: boolean
  setMessages: (action: M[] | ((prev: M[]) => M[])) => void
  inputValue: string
  setInputValue: (s: string) => void
  setToolJSX: (args: M) => void
}): {
  onBeforeQuery: (input: string, all: M[], n: number) => Promise<boolean>
  onTurnComplete: (all: M[], aborted: boolean) => Promise<void>
  render: () => null
} {
  return {
    onBeforeQuery: async () => true,
    onTurnComplete: async () => {},
    render: () => null,
  }
}
