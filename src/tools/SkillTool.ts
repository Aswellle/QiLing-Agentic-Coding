import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { loadAllSkills } from '../skills/loader'

const inputSchema = z.object({
  skill: z.string().describe(
    'Skill name to invoke (without leading /). ' +
    'Examples: "commit", "review-pr", "test". ' +
    'Use the exact name from the skill file (frontmatter "name" field or filename).'
  ),
  args: z.string().optional().describe(
    'Optional arguments to pass to the skill (appended after skill instructions)'
  ),
})

type Input = z.infer<typeof inputSchema>

export const SkillTool: Tool<Input> = {
  name: 'Skill',

  description:
    'Invoke a predefined skill by name. Skills are markdown prompt files stored in ' +
    '.qiling/skills/ or ~/.qiling/skills/ that encode reusable workflows. ' +
    'Calling this tool returns the skill\'s instructions — you should then follow them. ' +
    'Use this when the user references a skill explicitly or when a task clearly maps ' +
    'to a known skill (e.g., "commit" for committing changes, "test" for running tests). ' +
    'Use ToolSearch first if you\'re unsure of the skill name.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, ctx: ToolContext): Promise<ToolResult> {
    const skills = loadAllSkills(ctx.workingDir)
    const skillName = input.skill.replace(/^\//, '').trim()

    const skill = skills.find(s =>
      s.name === skillName ||
      s.name.toLowerCase() === skillName.toLowerCase()
    )

    if (!skill) {
      const available = skills.map(s => s.name).join(', ') || 'none'
      return {
        content: [{
          type: 'text',
          text: `Skill '${skillName}' not found.\nAvailable skills: ${available}`,
        }],
        isError: true,
      }
    }

    const argsSection = input.args?.trim()
      ? `\n\nUser-provided arguments: ${input.args.trim()}`
      : ''

    return {
      content: [{
        type: 'text',
        text: [
          `# Skill: ${skill.name}`,
          skill.description ? `> ${skill.description}` : '',
          '',
          skill.instructions,
          argsSection,
        ].filter(Boolean).join('\n'),
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
          skill: { type: 'string', description: 'Skill name to invoke' },
          args: { type: 'string', description: 'Optional arguments for the skill' },
        },
        required: ['skill'],
      },
    }
  },
}
