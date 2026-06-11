/**
 * API logging utilities — STUB.
 * FROM CC: services/api/logging.js (788L)
 * The full port is pending; these minimal types/exports are provided so that
 * forked-agent and other modules compile.
 *
 * NonNullableUsage mirrors CC's snake_case API usage shape (subset — only the
 * fields read by ported code). QiLing's own loop uses the camelCase TokenUsage
 * in types/message.ts; the two are independent.
 */
export type NonNullableUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  cache_creation: {
    ephemeral_1h_input_tokens: number;
    ephemeral_5m_input_tokens: number;
  };
  service_tier?: string | null;
};

export const EMPTY_USAGE: NonNullableUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_creation: {
    ephemeral_1h_input_tokens: 0,
    ephemeral_5m_input_tokens: 0,
  },
  service_tier: null,
};
