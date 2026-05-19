/**
 * Teammate default model — adapted from CC's utils/swarm/teammateModel.ts
 *
 * Returns the fallback model for new teammates when no model is configured.
 * Must be provider-aware for Bedrock/Vertex/Foundry compatibility.
 */

import { CLAUDE_OPUS_4_6_CONFIG } from '../model/configs.js'
import { getAPIProvider } from '../model/providers.js'

/**
 * Get the hardcoded fallback model for teammates.
 * Used when settings.teammateDefaultModel is not configured.
 *
 * Default: Opus 4.6 (most capable; teammates handle complex sub-tasks).
 * @[MODEL LAUNCH]: Update when a new default teammate model launches.
 */
export function getHardcodedTeammateModelFallback(): string {
  return CLAUDE_OPUS_4_6_CONFIG[getAPIProvider()]
}
