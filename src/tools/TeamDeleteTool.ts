import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { deleteTeam, getTeam, listTeams } from '../services/teams/store'
import { clearInbox } from '../services/messaging/bus'

const inputSchema = z.object({
  team_name: z.string().describe('Name of the team to delete'),
  force: z.boolean().default(false).describe(
    'Force delete even if the team has members (default: false). ' +
    'Use only after all member agents have been stopped.'
  ),
})

type Input = z.infer<typeof inputSchema>

export const TeamDeleteTool: Tool<Input> = {
  name: 'TeamDelete',

  description:
    'Delete a team and clean up its resources (member inboxes, registry entry). ' +
    'By default refuses if the team has non-lead members still registered — ' +
    'stop all member agents first, then delete. ' +
    'Use force=true only when you are certain all agents have stopped.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const team = getTeam(input.team_name)
    if (!team) {
      // Also check by case-insensitive normalised name
      const normalised = input.team_name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
      const byNorm = listTeams().find(t => t.name === normalised)
      if (!byNorm) {
        return {
          content: [{ type: 'text', text: `Error: Team '${input.team_name}' not found` }],
          isError: true,
        }
      }
      return this.call({ ...input, team_name: byNorm.name }, _ctx)
    }

    const nonLeadMembers = team.members.filter(m => m.name !== 'team-lead')
    if (nonLeadMembers.length > 0 && !input.force) {
      return {
        content: [{
          type: 'text',
          text: [
            `Error: Team '${team.name}' still has ${nonLeadMembers.length} member(s): ` +
            nonLeadMembers.map(m => m.name).join(', '),
            'Stop all member agents first, then delete.',
            'Or use force=true to delete anyway.',
          ].join('\n'),
        }],
        isError: true,
      }
    }

    // Clear all member inboxes
    for (const member of team.members) {
      clearInbox(member.agentId)
      clearInbox(member.name)
    }

    deleteTeam(team.name)

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          team_name: team.name,
          message: `Team '${team.name}' deleted. ${team.members.length} inbox(es) cleared.`,
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
          team_name: { type: 'string', description: 'Name of the team to delete' },
          force: { type: 'boolean', description: 'Force delete with members (default false)', default: false },
        },
        required: ['team_name'],
      },
    }
  },
}
