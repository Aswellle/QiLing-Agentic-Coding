import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'

export const ASK_USER_QUESTION_TOOL_NAME = 'AskUserQuestion'

const optionSchema = z.object({
  label: z.string().describe('Short display text for this option (1-5 words)'),
  description: z.string().describe('Explanation of what choosing this option means or implies'),
})

const questionSchema = z.object({
  question: z.string().describe(
    'The complete question to ask the user. Should be clear, specific, and end with "?". ' +
    'Example: "Which database should we use for this project?"'
  ),
  options: z
    .array(optionSchema)
    .min(2)
    .max(4)
    .describe('2-4 distinct, mutually exclusive answer options'),
  multiSelect: z
    .boolean()
    .default(false)
    .describe('Set to true to allow selecting multiple options. Use when choices are not mutually exclusive.'),
})

export type AskUserQuestion = z.infer<typeof questionSchema>
export type AskUserQuestionOption = z.infer<typeof optionSchema>

const inputSchema = z.object({
  questions: z
    .array(questionSchema)
    .min(1)
    .max(4)
    .describe(
      'Questions to ask the user (1-4 per call). Group related questions together. ' +
      'Users answer one at a time via keyboard navigation.'
    ),
  answers: z
    .record(z.string(), z.string())
    .optional()
    .describe('Populated by the UI after the user responds — do NOT set this yourself'),
})

export type AskUserQuestionInput = z.infer<typeof inputSchema>

export const AskUserQuestionTool: Tool<AskUserQuestionInput> = {
  name: ASK_USER_QUESTION_TOOL_NAME,

  description:
    'Asks the user multiple-choice questions to gather information, clarify ambiguity, ' +
    'understand preferences, or get decisions on implementation choices. ' +
    'Use this tool when you need user input before you can proceed — for example, ' +
    'to choose between design approaches, confirm a destructive action, or select a feature scope. ' +
    'Each call can include 1-4 questions, each with 2-4 options. ' +
    'If you recommend a specific option, list it first and append "(Recommended)" to its label.',

  inputSchema,

  // Read-only interaction — no file system or network side effects
  checkPermissions(_input: AskUserQuestionInput): PermissionDecision {
    return { type: 'allow' }
  },

  async call(input: AskUserQuestionInput, _context: ToolContext): Promise<ToolResult> {
    // answers are injected by query.ts after the user responds via AskUserQuestionDialog
    if (!input.answers || Object.keys(input.answers).length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No answers received — interactive session is unavailable in this context.',
        }],
        isError: true,
      }
    }

    const answersText = Object.entries(input.answers)
      .map(([q, a]) => `• "${q}"\n  → ${a}`)
      .join('\n')

    return {
      content: [{
        type: 'text',
        text: `User answered your questions:\n\n${answersText}\n\nYou can now continue with the user's answers in mind.`,
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
          questions: {
            type: 'array',
            description: 'Questions to ask the user (1-4)',
            minItems: 1,
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                  description: 'The question text (clear, ends with "?")',
                },
                options: {
                  type: 'array',
                  description: '2-4 answer options',
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: 'object',
                    properties: {
                      label: {
                        type: 'string',
                        description: 'Short option label (1-5 words)',
                      },
                      description: {
                        type: 'string',
                        description: 'What this option means or implies',
                      },
                    },
                    required: ['label', 'description'],
                  },
                },
                multiSelect: {
                  type: 'boolean',
                  description: 'Allow selecting multiple options',
                  default: false,
                },
              },
              required: ['question', 'options'],
            },
          },
        },
        required: ['questions'],
      },
    }
  },
}
