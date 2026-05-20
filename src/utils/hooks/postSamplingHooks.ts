/**
 * Post-sampling hook registry — adapted from CC's utils/hooks/postSamplingHooks.ts
 *
 * Internal hook registry for callbacks that run after model sampling completes.
 * Not exposed in settings.json — programmatic API only.
 */

import type { Message } from '../../types/message.js'
import { toError } from '../errors.js'
import { logError } from '../log.js'

export type REPLHookContext = {
  messages: Message[]
  systemPrompt: { value: string; type: string }
  userContext: Record<string, string>
  systemContext: Record<string, string>
  toolUseContext: { options: Record<string, unknown> }
  querySource?: string
}

export type PostSamplingHook = (context: REPLHookContext) => Promise<void> | void

const postSamplingHooks: PostSamplingHook[] = []

export function registerPostSamplingHook(hook: PostSamplingHook): void {
  postSamplingHooks.push(hook)
}

export function clearPostSamplingHooks(): void {
  postSamplingHooks.length = 0
}

export async function executePostSamplingHooks(
  messages: Message[],
  systemPrompt: { value: string; type: string },
  userContext: Record<string, string>,
  systemContext: Record<string, string>,
  toolUseContext: { options: Record<string, unknown> },
  querySource?: string,
): Promise<void> {
  const context: REPLHookContext = { messages, systemPrompt, userContext, systemContext, toolUseContext, querySource }
  for (const hook of postSamplingHooks) {
    try { await hook(context) }
    catch (error) { logError(toError(error)) }
  }
}
