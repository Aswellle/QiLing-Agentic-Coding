import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { createTeam, getTeam } from '../services/teams/store'

const inputSchema = z.object({
  team_name: z.string().describe(
    'Name for the new team (e.g. "research-team", "review-squad"). ' +
    'Automatically lowercased and hyphenated. Must be unique per session.'
  ),
  description: z.string().default('').describe(
    'Purpose of this team — what it will work on'
  ),
  agent_type: z.string().default('team-lead').describe(
    'Role/type for the lead agent (e.g. "researcher", "coordinator"). Default: "team-lead"'
  ),
})

type Input = z.infer<typeof inputSchema>

export const TeamCreateTool: Tool<Input> = {
  name: 'TeamCreate',

  description:
    'Create a named team for coordinating multiple agents. ' +
    'A team has a lead agent and can have members added over time. ' +
    'Once created, spawn agents via AgentTool with the team context, ' +
    'use SendMessage to communicate between agents, ' +
    'and use TaskCreate/TaskUpdate to track shared work. ' +
    'Clean up with TeamDelete when the team\'s work is complete.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    // Check for name collision early (createTeam auto-deduplicates but we want to report it)
    const safeName = input.team_name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    const exists = getTeam(safeName)

    const team = createTeam(input.team_name, input.description, input.agent_type)

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          team_name: team.name,
          lead_agent_id: team.leadAgentId,
          description: team.description,
          members: team.members.map(m => ({ name: m.name, agentId: m.agentId })),
          ...(exists ? { note: `Name conflict — team created as '${team.name}'` } : {}),
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
          team_name: { type: 'string', description: 'Team name (auto-hyphenated)' },
          description: { type: 'string', description: 'Team purpose' },
          agent_type: { type: 'string', description: 'Lead agent role (default: team-lead)' },
        },
        required: ['team_name'],
      },
    }
  },
}
