export const DESCRIPTION = 'Update a task in the task list'

export const PROMPT = `Use this tool to update a task in the task list.

## When to Use This Tool

**Mark tasks as resolved:**
- When you have completed the work described in a task
- IMPORTANT: Always mark your assigned tasks as resolved when you finish them
- After resolving, call TaskList to find your next task

- ONLY mark a task as completed when you have FULLY accomplished it
- If you encounter errors or blockers, keep the task as in_progress
- Never mark as completed if tests are failing or implementation is partial

**Status Workflow:**
\`pending\` → \`in_progress\` → \`completed\`

Use \`deleted\` to permanently remove a task.

## Fields You Can Update

- **status**: Task status
- **subject**: Task title (imperative form, e.g., "Run tests")
- **description**: Task description
- **owner**: Agent name assigned to this task
- **addBlocks**: Mark tasks that cannot start until this one completes
- **addBlockedBy**: Mark tasks that must complete before this one can start

## Examples

Mark task as in progress:
\`\`\`json
{"taskId": "1", "status": "in_progress"}
\`\`\`

Mark task as completed:
\`\`\`json
{"taskId": "1", "status": "completed"}
\`\`\`

Claim a task:
\`\`\`json
{"taskId": "1", "owner": "my-name"}
\`\`\`

Set up dependencies:
\`\`\`json
{"taskId": "2", "addBlockedBy": ["1"]}
\`\`\`
`
