export const DESCRIPTION = 'Create a new task in the task list'

export const PROMPT = `Use this tool to create tasks in the task list.

## When to Use This Tool

- When breaking a complex project into discrete work items
- When you identify new work that needs to be done
- When assigning work to teammates in a swarm

## Fields

- **subject** (required): Brief task title in imperative form (e.g., "Add authentication")
- **description** (required): Detailed requirements and context
- **status**: Initial status (default: 'pending')
- **owner**: Agent name to assign immediately
- **blockedBy**: Task IDs that must complete first

## Examples

Create a simple task:
\`\`\`json
{"subject": "Write unit tests", "description": "Add tests for auth module"}
\`\`\`

Create with dependencies:
\`\`\`json
{"subject": "Deploy to production", "description": "Deploy after tests pass", "blockedBy": ["1", "2"]}
\`\`\`
`
