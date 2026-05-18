/**
 * Direct team member messaging — adapted from CC's utils/directMemberMessage.ts
 *
 * Parses `@agent-name message` syntax and routes messages directly to
 * specific team members without going through the model.
 *
 * The @-mention syntax is: @agent-name followed by the message content.
 * Example: "@researcher Can you look at the auth module?"
 */

/**
 * Parse `@agent-name message` syntax for direct team member messaging.
 * Returns null if the input doesn't match the @-mention pattern.
 */
export function parseDirectMemberMessage(input: string): {
  recipientName: string
  message: string
} | null {
  const match = input.match(/^@([\w-]+)\s+(.+)$/s)
  if (!match) return null

  const [, recipientName, message] = match
  if (!recipientName || !message) return null

  const trimmedMessage = message.trim()
  if (!trimmedMessage) return null

  return { recipientName, message: trimmedMessage }
}

export type DirectMessageResult =
  | { success: true; recipientName: string }
  | {
      success: false
      error: 'no_team_context' | 'unknown_recipient'
      recipientName?: string
    }

/**
 * Send a direct message to a team member, bypassing the model.
 * Requires a team context and a writeToMailbox implementation.
 */
export async function sendDirectMemberMessage(
  recipientName: string,
  message: string,
  teamContext: { teammates?: Record<string, { name: string }>; teamName: string } | null | undefined,
  writeToMailbox?: (
    recipientName: string,
    message: { from: string; text: string; timestamp: string },
    teamName: string,
  ) => Promise<void>,
): Promise<DirectMessageResult> {
  if (!teamContext || !writeToMailbox) {
    return { success: false, error: 'no_team_context' }
  }

  const member = Object.values(teamContext.teammates ?? {}).find(
    t => t.name === recipientName,
  )

  if (!member) {
    return { success: false, error: 'unknown_recipient', recipientName }
  }

  await writeToMailbox(
    recipientName,
    { from: 'user', text: message, timestamp: new Date().toISOString() },
    teamContext.teamName,
  )

  return { success: true, recipientName }
}
