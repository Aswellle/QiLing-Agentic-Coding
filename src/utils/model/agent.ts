/**
 * Agent model resolution — STUB (simplified).
 * FROM CC: utils/model/agent.js
 * Resolution order mirrors CC: explicit tool-level model > agent frontmatter
 * model (unless 'inherit') > parent main-loop model.
 */
export function getAgentModel(
  agentDefinitionModel: string | undefined,
  mainLoopModel: string | undefined | null,
  modelOverride: string | undefined,
  _permissionMode: string,
): string {
  if (modelOverride) return modelOverride;
  if (agentDefinitionModel && agentDefinitionModel !== "inherit") {
    return agentDefinitionModel;
  }
  return mainLoopModel ?? "";
}
