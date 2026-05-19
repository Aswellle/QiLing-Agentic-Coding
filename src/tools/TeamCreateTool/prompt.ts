/**
 * TeamCreate tool prompt — adapted from CC's tools/TeamCreateTool/prompt.ts
 */

export function getPrompt(): string {
  return `
# TeamCreate

## When to Use

Use this tool proactively whenever:
- The user explicitly asks to use a team, swarm, or group of agents
- A task is complex enough to benefit from parallel work by multiple agents
- The user mentions wanting agents to work together or coordinate

When in doubt about whether a task warrants a team, prefer spawning a team.

## Team Workflow

1. **Create a team** with TeamCreate
2. **Create tasks** using TaskCreate, TaskList, etc.
3. **Spawn teammates** using the Agent tool with \`team_name\` and \`name\` parameters
4. **Assign tasks** using TaskUpdate with \`owner\` to give tasks to teammates
5. **Teammates work** on assigned tasks and mark them completed
6. **Shutdown your team** when complete via SendMessage with \`message: {type: "shutdown_request"}\`

## Important Notes

- Teammates go idle after every turn — this is normal and expected
- Messages from teammates are automatically delivered to you
- Always refer to teammates by NAME when messaging (not by agentId)
- Do NOT send structured JSON status messages — communicate in plain text
- Use TaskUpdate (not messages) to mark tasks completed

\`\`\`json
{
  "team_name": "my-project",
  "description": "Working on feature X"
}
\`\`\`

This creates a team config and task list directory.
`.trim()
}
