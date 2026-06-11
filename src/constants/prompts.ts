// FROM CC: constants/prompts.ts (partial — full file 914 lines, deep deps)
// Only prependBullets ported at this stage; remaining exports pending T6 layer.

export function prependBullets(items: Array<string | string[]>): string[] {
  return items.flatMap(item =>
    Array.isArray(item)
      ? item.map(subitem => `  - ${subitem}`)
      : [` - ${item}`],
  )
}

// FROM CC: DEFAULT_AGENT_PROMPT (verbatim)
// NAME: Claude Code / Anthropic / Claude
export const DEFAULT_AGENT_PROMPT = `You are an agent for Claude Code, Anthropic's official CLI for Claude. Given the user's message, you should use the tools available to complete the task. Complete the task fully—don't gold-plate, but don't leave it half-done. When you complete the task, respond with a concise report covering what was done and any key findings — the caller will relay this to the user, so it only needs the essentials.`

// FROM CC: enhanceSystemPromptWithEnvDetails (reduced)
// CC's version also appends computeEnvInfo() output and DiscoverSkills
// guidance (skill-search feature). Those depend on unported modules
// (constants/env details, skill discovery); the agent Notes block below is
// verbatim. Env info wiring pending the env-details port.
export async function enhanceSystemPromptWithEnvDetails(
  existingSystemPrompt: string[],
  _model: string,
  _additionalWorkingDirectories?: string[],
  _enabledToolNames?: ReadonlySet<string>,
): Promise<string[]> {
  const notes = `Notes:
- Agent threads always have their cwd reset between bash calls, as a result please only use absolute file paths.
- In your final response, share file paths (always absolute, never relative) that are relevant to the task. Include code snippets only when the exact text is load-bearing (e.g., a bug you found, a function signature the caller asked for) — do not recap code you merely read.
- For clear communication with the user the assistant MUST avoid using emojis.
- Do not use a colon before tool calls. Text like "Let me read the file:" followed by a read tool call should just be "Let me read the file." with a period.`
  return [...existingSystemPrompt, notes]
}
