/**
 * Commands registry — STUB.
 * FROM CC: commands.js (755L)
 * Minimal type export for forkedAgent/runAgent compatibility.
 */
export type PromptCommand = {
  name: string;
  description: string;
  aliases?: string[];
  isEnabled?: boolean;
  /** CC: command kind discriminator ('prompt' | 'local' | 'local-jsx') */
  type?: string;
  // FROM CC: fields consumed by forkedAgent's prepareForkedCommandContext
  // and runAgent's slash-command handling.
  getPromptForCommand: (
    args: string,
    context: unknown,
  ) => Promise<Array<{ type: "text"; text: string }>>;
  allowedTools?: string[];
  agent?: string;
  argNames?: string[];
  progressMessage?: string;
};

// FROM CC: command lookup helpers. QiLing's slash commands live in
// src/commands/index.ts with a different registry shape; these stubs keep
// CC-ported agent code compiling until the registries are bridged.
export function hasCommand(_commandName: string, _commands: unknown): boolean {
  return false;
}

export function getCommand(
  commandName: string,
  _commands: unknown,
): PromptCommand & { type: "prompt" } {
  throw new ReferenceError(
    `Command ${commandName} not found (CC command registry not yet ported)`,
  );
}

export function getSkillToolCommands(_commands: unknown): PromptCommand[] {
  return [];
}
