/**
 * Slash command processing — STUB (formatSkillLoadingMetadata only).
 * FROM CC: utils/processUserInput/processSlashCommand.js
 */
// LOC: skill.loading.metadata
export function formatSkillLoadingMetadata(
  skillName: string,
  progressMessage?: string,
): string {
  return `<command-message>${progressMessage ?? `Loading skill: ${skillName}`}</command-message>`;
}
