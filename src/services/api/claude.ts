/**
 * Claude API client — STUB.
 * FROM CC: services/api/claude.js (3419L)
 * Minimal export surface for modules that need accumulateUsage / updateUsage
 * signatures. Full port pending.
 */
import type { NonNullableUsage } from "./logging.js";

export function accumulateUsage(
  a: NonNullableUsage,
  b: NonNullableUsage,
): NonNullableUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens:
      a.cache_read_input_tokens + b.cache_read_input_tokens,
    cache_creation_input_tokens:
      a.cache_creation_input_tokens + b.cache_creation_input_tokens,
    cache_creation: {
      ephemeral_1h_input_tokens:
        a.cache_creation.ephemeral_1h_input_tokens +
        b.cache_creation.ephemeral_1h_input_tokens,
      ephemeral_5m_input_tokens:
        a.cache_creation.ephemeral_5m_input_tokens +
        b.cache_creation.ephemeral_5m_input_tokens,
    },
    service_tier: b.service_tier ?? a.service_tier,
  };
}

export function updateUsage(
  base: NonNullableUsage,
  delta: Partial<NonNullableUsage> | undefined | null,
): NonNullableUsage {
  if (!delta) return base;
  return {
    ...base,
    ...delta,
    cache_creation: {
      ...base.cache_creation,
      ...(delta.cache_creation ?? {}),
    },
  };
}

export function getCacheControl(_mode: string): unknown {
  return {};
}
