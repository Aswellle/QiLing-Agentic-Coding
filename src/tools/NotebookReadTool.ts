import { z } from 'zod'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  notebook_path: z.string().describe('Path to the .ipynb Jupyter notebook file'),
})

type Input = z.infer<typeof inputSchema>

interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw'
  source: string | string[]
  outputs?: Array<{
    output_type: string
    text?: string | string[]
    data?: Record<string, string | string[]>
    evalue?: string
    traceback?: string[]
  }>
  execution_count?: number | null
}

export const NotebookReadTool: Tool<Input> = {
  name: 'NotebookRead',
  description:
    'Read a Jupyter notebook (.ipynb) and display all cells with their outputs. ' +
    'Shows cell type, source code, and execution outputs in a readable format.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.notebook_path)

    if (!existsSync(filePath)) {
      return {
        content: [{ type: 'text', text: `Notebook not found: ${input.notebook_path}` }],
        isError: true,
      }
    }

    try {
      const raw = readFileSync(filePath, 'utf-8')
      const notebook = JSON.parse(raw) as {
        nbformat: number
        cells: NotebookCell[]
        metadata?: { kernelspec?: { display_name?: string } }
      }

      const kernelName = notebook.metadata?.kernelspec?.display_name ?? 'Unknown'
      const lines: string[] = [
        `Jupyter Notebook — ${input.notebook_path}`,
        `Kernel: ${kernelName} | Format: nbformat ${notebook.nbformat}`,
        `Cells: ${notebook.cells.length}`,
        '',
      ]

      for (let i = 0; i < notebook.cells.length; i++) {
        const cell = notebook.cells[i]
        const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source
        const count = cell.execution_count !== null && cell.execution_count !== undefined
          ? ` [${cell.execution_count}]`
          : ''

        lines.push(`─── Cell ${i + 1} [${cell.cell_type}]${count} ${'─'.repeat(30)}`)
        lines.push(source || '(empty)')

        if (cell.cell_type === 'code' && cell.outputs && cell.outputs.length > 0) {
          lines.push('── Output:')
          for (const output of cell.outputs) {
            if (output.output_type === 'error') {
              lines.push(`ERROR: ${output.evalue ?? ''}`)
            } else if (output.text) {
              const text = Array.isArray(output.text) ? output.text.join('') : output.text
              lines.push(text.trimEnd())
            } else if (output.data?.['text/plain']) {
              const text = output.data['text/plain']
              lines.push(Array.isArray(text) ? text.join('') : text)
            }
          }
        }
        lines.push('')
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to parse notebook: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      }
    }
  },

  isConcurrencySafe: () => true,

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          notebook_path: { type: 'string', description: 'Path to .ipynb file' },
        },
        required: ['notebook_path'],
      },
    }
  },
}
