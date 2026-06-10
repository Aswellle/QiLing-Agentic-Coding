/**
 * Hooks settings utilities — STUB.
 * FROM CC: utils/hooks/hooksSettings.js
 */
import type { HookCommand } from "../settings/types.js";
export function isHookEqual(
  a: HookCommand | { type: string },
  b: HookCommand | { type: string },
): boolean {
  if (a.type !== b.type || a.type !== "command") return false;
  return (a as HookCommand).value === (b as HookCommand).value;
}
