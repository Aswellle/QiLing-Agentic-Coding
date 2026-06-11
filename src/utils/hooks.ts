
/** FROM CC: AggregatedHookResult */
export type AggregatedHookResult = {
  pass: boolean;
  blockedBy?: string;
  error?: string;
};

// FROM CC: executeSubagentStartHooks — SubagentStart hook execution.
// STUB: QiLing's hook pipeline (src/hooks/index.ts) doesn't dispatch
// SubagentStart yet; yields nothing until that event is wired.
// eslint-disable-next-line require-yield
export async function* executeSubagentStartHooks(
  _agentId: string,
  _agentType: string,
  _signal: AbortSignal,
): AsyncGenerator<{ additionalContexts?: string[] }> {
  /* NO-OP */
}

