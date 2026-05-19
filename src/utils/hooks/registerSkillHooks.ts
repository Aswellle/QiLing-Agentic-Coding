/**
 * Skill hook registration — adapted from CC's utils/hooks/registerSkillHooks.ts
 *
 * Registers hooks from a skill's frontmatter as session hooks.
 * Hooks persist for the session lifetime unless `once: true` (auto-removed after first success).
 *
 * Used when a skill is invoked that has hooks in its frontmatter,
 * e.g., skills that run a linter on file changes.
 */

import { HOOK_EVENTS } from '../../hooks/index.js'
import { logForDebugging } from '../log.js'
import type { HookEntry, HookEvent } from '../../hooks/index.js'

type HookWithOnce = HookEntry & { once?: boolean }
type HooksSettings = Partial<Record<HookEvent, Array<{ matcher?: string; hooks: HookWithOnce[] }>>>

type HookAddFn = (
  sessionId: string,
  event: HookEvent,
  matcher: string,
  hook: HookEntry,
  onSuccess?: () => void,
  skillRoot?: string,
) => void

type HookRemoveFn = (
  sessionId: string,
  event: HookEvent,
  hook: HookEntry,
) => void

/**
 * Register hooks from a skill's frontmatter as session hooks.
 *
 * @param sessionId    Current session ID
 * @param hooks        Hooks config from skill frontmatter
 * @param skillName    Skill name (for logging)
 * @param addHook      Function to add a session hook
 * @param removeHook   Function to remove a session hook (for once:true hooks)
 * @param skillRoot    Skill base dir (exposed as QILING_PLUGIN_ROOT env var)
 */
export function registerSkillHooks(
  sessionId: string,
  hooks: HooksSettings,
  skillName: string,
  addHook: HookAddFn,
  removeHook: HookRemoveFn,
  skillRoot?: string,
): void {
  let registeredCount = 0

  for (const eventName of HOOK_EVENTS) {
    const matchers = hooks[eventName]
    if (!matchers) continue

    for (const matcher of matchers) {
      for (const hook of matcher.hooks) {
        const onHookSuccess = hook.once
          ? () => {
              logForDebugging(`Removing one-shot hook for event ${eventName} in skill '${skillName}'`)
              removeHook(sessionId, eventName, hook)
            }
          : undefined

        addHook(sessionId, eventName, matcher.matcher ?? '', hook, onHookSuccess, skillRoot)
        registeredCount++
      }
    }
  }

  if (registeredCount > 0) {
    logForDebugging(`Registered ${registeredCount} hooks from skill '${skillName}'`)
  }
}
