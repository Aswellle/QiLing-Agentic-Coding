/**
 * Perfetto tracing — STUB.
 * FROM CC: utils/telemetry/perfettoTracing.js (29KB)
 * Agent-hierarchy trace visualization is ANT-internal tooling; QiLing keeps
 * the registration surface as no-ops so ported agent code compiles.
 */
export function isPerfettoTracingEnabled(): boolean {
  return false;
}

export function registerAgent(
  _agentId: string,
  _agentType: string,
  _parentId: string,
): void {}

export function unregisterAgent(_agentId: string): void {}
