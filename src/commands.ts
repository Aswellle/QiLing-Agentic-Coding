/**
 * Commands registry — STUB.
 * FROM CC: commands.js (755L)
 * Minimal type export for forkedAgent compatibility.
 */
export type PromptCommand = {
  name: string;
  description: string;
  aliases?: string[];
  isEnabled?: boolean;
};

