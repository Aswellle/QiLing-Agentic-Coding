/**
 * In-memory team registry for QiLing sessions.
 * Mirrors CC's TeamFile schema — name, members, lead agent.
 */

export interface TeamMember {
  name: string       // e.g. "researcher", "coder", "reviewer"
  agentId: string    // e.g. "researcher@my-team"
  joinedAt: number
}

export interface Team {
  name: string
  description: string
  leadAgentId: string
  members: TeamMember[]
  createdAt: number
}

const teams = new Map<string, Team>()

export function createTeam(name: string, description: string, agentType = 'team-lead'): Team {
  // Sanitise name: lowercase, replace spaces/special chars with hyphens
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
  const finalName = teams.has(safeName) ? `${safeName}-${Date.now().toString(36).slice(-4)}` : safeName
  const leadAgentId = `team-lead@${finalName}`

  const team: Team = {
    name: finalName,
    description,
    leadAgentId,
    members: [{
      name: agentType === 'team-lead' ? 'team-lead' : agentType,
      agentId: leadAgentId,
      joinedAt: Date.now(),
    }],
    createdAt: Date.now(),
  }
  teams.set(finalName, team)
  return team
}

export function getTeam(name: string): Team | undefined {
  return teams.get(name)
}

export function listTeams(): Team[] {
  return Array.from(teams.values())
}

export function addMember(teamName: string, memberName: string): TeamMember | null {
  const team = teams.get(teamName)
  if (!team) return null
  const agentId = `${memberName}@${teamName}`
  if (team.members.some(m => m.agentId === agentId)) return null
  const member: TeamMember = { name: memberName, agentId, joinedAt: Date.now() }
  team.members.push(member)
  return member
}

export function deleteTeam(name: string): boolean {
  return teams.delete(name)
}

export function getAllMemberNames(teamName: string): string[] {
  return (teams.get(teamName)?.members ?? []).map(m => m.name)
}

export function clearAllTeams(): void {
  teams.clear()
}
