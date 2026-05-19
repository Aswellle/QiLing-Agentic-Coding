/**
 * Sandbox UI utilities — adapted from CC's utils/sandbox/sandbox-ui-utils.ts
 *
 * Helpers for cleaning up sandbox violation messages for display.
 */

export function removeSandboxViolationTags(text: string): string {
  return text.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g, '')
}
