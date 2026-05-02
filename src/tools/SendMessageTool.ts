import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { sendMessage, broadcast, listRegisteredAgents } from '../services/messaging/bus'
import { getAllMemberNames } from '../services/teams/store'

const inputSchema = z.object({
  to: z.string().describe(
    'Recipient name. Use an agent name (e.g. "researcher"), ' +
    '"*" to broadcast to all known agents, ' +
    'or a team name to message all team members.'
  ),
  message: z.string().describe('Message content to send'),
  summary: z.string().optional().describe('5-10 word summary of the message (for logs)'),
  teamName: z.string().optional().describe(
    'If provided, broadcast to all members of this team instead of using "to"'
  ),
})

type Input = z.infer<typeof inputSchema>

export const SendMessageTool: Tool<Input> = {
  name: 'SendMessage',

  description:
    'Send a message to another agent or broadcast to a team. ' +
    'Messages are queued in the recipient\'s inbox and delivered on their next activation. ' +
    'Use this for agent coordination: passing results between agents, ' +
    'signalling completion, requesting help, or broadcasting status updates. ' +
    'Use to="*" to reach all registered agents. ' +
    'Messages are in-session only — not persisted across restarts.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, ctx: ToolContext): Promise<ToolResult> {
    const sender = ctx.sessionId ?? 'unknown-agent'

    // Broadcast to team members
    if (input.teamName) {
      const members = getAllMemberNames(input.teamName)
      if (members.length === 0) {
        return {
          content: [{ type: 'text', text: `Error: Team '${input.teamName}' not found or has no members` }],
          isError: true,
        }
      }
      const sent = broadcast(sender, input.message, members)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            broadcast: true,
            recipients: sent.map(m => m.to),
            messageCount: sent.length,
            summary: input.summary,
          }),
        }],
      }
    }

    // Broadcast to all registered agents
    if (input.to === '*') {
      const all = listRegisteredAgents()
      const sent = broadcast(sender, input.message, all)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            broadcast: true,
            recipients: sent.map(m => m.to),
            messageCount: sent.length,
          }),
        }],
      }
    }

    // Direct message
    const msg = sendMessage(input.to, sender, input.message)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          messageId: msg.id,
          to: input.to,
          from: sender,
          summary: input.summary ?? input.message.slice(0, 60),
        }),
      }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          to: { type: 'string', description: 'Recipient name or "*" for broadcast' },
          message: { type: 'string', description: 'Message content' },
          summary: { type: 'string', description: '5-10 word summary (optional)' },
          teamName: { type: 'string', description: 'Team name to broadcast to (optional)' },
        },
        required: ['to', 'message'],
      },
    }
  },
}
