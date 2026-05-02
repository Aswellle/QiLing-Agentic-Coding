import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'

const inputSchema = z.object({
  notebook_path: z.string()
    .describe('Path to the .ipynb Jupyter notebook file'),
  action: z.enum(['insert', 'replace', 'delete', 'set_type'])
    .describe(
      'insert = add a new cell at cell_index\n' +
      'replace = overwrite the source of cell at cell_index\n' +
      'delete = remove the cell at cell_index\n' +
      'set_type = change cell type (code/markdown/raw)'
    ),
  cell_index: z.number().int().min(0)
    .describe('0-based cell index to target. For insert: new cell is inserted BEFORE this index. Use the cell count to append at end.'),
  source: z.string().optional()
    .describe('New source content for the cell (required for insert/replace)'),
  cell_type: z.enum(['code', 'markdown', 'raw']).optional()
    .describe('Cell type (required for insert and set_type, optional for replace)'),
})

type Input = z.infer<typeof inputSchema>

interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw'
  source: string[]
  outputs: unknown[]
  execution_count: number | null
  metadata: Record<string, unknown>
  id?: string
}

interface Notebook {
  nbformat: number
  nbformat_minor: number
  cells: NotebookCell[]
  metadata: Record<string, unknown>
}

function toLines(source: string): string[] {
  // Notebook stores source as array of lines with trailing \n on all but last
  const lines = source.split('\n')
  return lines.map((line, i) => i < lines.length - 1 ? line + '\n' : line)
}

function makeCellId(): string {
  return Math.random().toString(36).slice(2, 12)
}

function makeCell(type: 'code' | 'markdown' | 'raw', source: string): NotebookCell {
  return {
    cell_type: type,
    source: toLines(source),
    outputs: [],
    execution_count: null,
    metadata: {},
    id: makeCellId(),
  }
}

export const NotebookEditTool: Tool<Input> = {
  name: 'NotebookEdit',

  description:
    'Edit a Jupyter notebook (.ipynb) — insert, replace, or delete cells, or change cell types. ' +
    'Use NotebookRead first to see existing cell indices. ' +
    'All edits preserve notebook metadata and existing outputs (unless a cell is deleted). ' +
    'Outputs and execution_count are cleared when a code cell\'s source is replaced.',

  inputSchema,

  checkPermissions(_input: Input): PermissionDecision {
    return { type: 'ask', description: `Edit notebook: ${_input.notebook_path}` }
  },

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.notebook_path)

    if (!existsSync(filePath)) {
      return {
        content: [{ type: 'text', text: `Notebook not found: ${input.notebook_path}` }],
        isError: true,
      }
    }

    let notebook: Notebook
    try {
      notebook = JSON.parse(readFileSync(filePath, 'utf-8')) as Notebook
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Failed to parse notebook: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }

    const cells = notebook.cells
    const idx = input.cell_index

    switch (input.action) {
      case 'insert': {
        if (!input.source) {
          return { content: [{ type: 'text', text: 'Error: source is required for insert' }], isError: true }
        }
        const type = input.cell_type ?? 'code'
        const newCell = makeCell(type, input.source)
        // clamp to valid range (allows appending at end)
        const insertAt = Math.min(Math.max(0, idx), cells.length)
        cells.splice(insertAt, 0, newCell)
        break
      }
      case 'replace': {
        if (idx >= cells.length) {
          return { content: [{ type: 'text', text: `Error: cell_index ${idx} out of range (notebook has ${cells.length} cells)` }], isError: true }
        }
        if (!input.source) {
          return { content: [{ type: 'text', text: 'Error: source is required for replace' }], isError: true }
        }
        const cell = cells[idx]!
        cell.source = toLines(input.source)
        if (input.cell_type) cell.cell_type = input.cell_type
        // Clear outputs when source changes (CC behaviour)
        if (cell.cell_type === 'code') {
          cell.outputs = []
          cell.execution_count = null
        }
        break
      }
      case 'delete': {
        if (idx >= cells.length) {
          return { content: [{ type: 'text', text: `Error: cell_index ${idx} out of range (notebook has ${cells.length} cells)` }], isError: true }
        }
        cells.splice(idx, 1)
        break
      }
      case 'set_type': {
        if (idx >= cells.length) {
          return { content: [{ type: 'text', text: `Error: cell_index ${idx} out of range` }], isError: true }
        }
        if (!input.cell_type) {
          return { content: [{ type: 'text', text: 'Error: cell_type is required for set_type' }], isError: true }
        }
        cells[idx]!.cell_type = input.cell_type
        if (input.cell_type !== 'code') {
          cells[idx]!.outputs = []
          cells[idx]!.execution_count = null
        }
        break
      }
    }

    try {
      writeFileSync(filePath, JSON.stringify(notebook, null, 1) + '\n', 'utf-8')
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Failed to write notebook: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }

    const summary = {
      insert: `Inserted ${input.cell_type ?? 'code'} cell at index ${Math.min(idx, cells.length - 1)}`,
      replace: `Replaced cell ${idx} source${input.cell_type ? ` (type → ${input.cell_type})` : ''}`,
      delete: `Deleted cell ${idx} (notebook now has ${cells.length} cells)`,
      set_type: `Changed cell ${idx} type to ${input.cell_type}`,
    }[input.action]

    return { content: [{ type: 'text', text: summary }] }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          notebook_path: { type: 'string', description: 'Path to .ipynb file' },
          action: { type: 'string', enum: ['insert', 'replace', 'delete', 'set_type'] },
          cell_index: { type: 'number', description: '0-based cell index' },
          source: { type: 'string', description: 'Cell source content (required for insert/replace)' },
          cell_type: { type: 'string', enum: ['code', 'markdown', 'raw'], description: 'Cell type' },
        },
        required: ['notebook_path', 'action', 'cell_index'],
      },
    }
  },
}
