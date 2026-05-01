import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  file_path: z.string().describe('Path to the file to edit'),
  old_string: z.string().describe('The exact string to replace (must be unique in the file)'),
  new_string: z.string().describe('The string to replace it with'),
  replace_all: z.boolean().default(false).describe('Replace all occurrences instead of requiring uniqueness'),
})

type Input = z.infer<typeof inputSchema>

export const FileEditTool: Tool<Input> = {
  name: 'FileEdit',
  description:
    'Edit a file by replacing an exact string with a new string. ' +
    'The old_string must appear exactly once in the file (or use replace_all: true). ' +
    'Preserves all other content and formatting. ' +
    'Prefer this over FileWrite when making targeted edits to existing files.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.file_path)

    if (!existsSync(filePath)) {
      return {
        content: [{ type: 'text', text: `File not found: ${input.file_path}` }],
        isError: true,
      }
    }

    const content = readFileSync(filePath, 'utf-8')

    if (!input.replace_all) {
      const count = countOccurrences(content, input.old_string)
      if (count === 0) {
        return {
          content: [{ type: 'text', text: `String not found in file:\n${input.old_string}` }],
          isError: true,
        }
      }
      if (count > 1) {
        return {
          content: [{
            type: 'text',
            text: `Found ${count} occurrences of the string. Use replace_all: true to replace all, or provide more context to make it unique.`,
          }],
          isError: true,
        }
      }
    }

    const newContent = input.replace_all
      ? content.split(input.old_string).join(input.new_string)
      : content.replace(input.old_string, input.new_string)

    writeFileSync(filePath, newContent, 'utf-8')

    const occurrences = countOccurrences(content, input.old_string)
    // Embed diff metadata as JSON comment so ToolCallDisplay can render it
    const diffMeta = JSON.stringify({
      __diff: true,
      file_path: input.file_path,
      old_string: input.old_string.slice(0, 2000),
      new_string: input.new_string.slice(0, 2000),
    })
    return {
      content: [{
        type: 'text',
        text: `Successfully edited ${input.file_path} (replaced ${occurrences} occurrence${occurrences !== 1 ? 's' : ''}).\n<!--DIFF:${diffMeta}-->`,
      }],
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to edit' },
          old_string: { type: 'string', description: 'The exact string to replace' },
          new_string: { type: 'string', description: 'The replacement string' },
          replace_all: { type: 'boolean', description: 'Replace all occurrences', default: false },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    }
  },
}

function countOccurrences(text: string, pattern: string): number {
  if (pattern.length === 0) return 0
  let count = 0
  let pos = 0
  while ((pos = text.indexOf(pattern, pos)) !== -1) {
    count++
    pos += pattern.length
  }
  return count
}
