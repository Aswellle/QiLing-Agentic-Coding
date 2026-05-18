/**
 * Jupyter notebook type definitions — inferred from CC usage in
 * utils/notebook.ts and tools/NotebookEditTool/
 */

export type NotebookOutputImage = {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

export type NotebookCellSourceOutput = {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  text?: string
  image?: NotebookOutputImage
}

export type NotebookCellSource = {
  cellType: 'code' | 'markdown' | 'raw'
  source: string
  execution_count?: number
  cell_id: string
  language?: string
  outputs?: NotebookCellSourceOutput[]
}

export type NotebookCellOutput = {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  // stream
  text?: string | string[]
  // execute_result / display_data
  data?: Record<string, unknown>
  // error
  ename?: string
  evalue?: string
  traceback?: string[]
}

export type NotebookCell = {
  cell_type: 'code' | 'markdown' | 'raw'
  source: string | string[]
  id?: string
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
  metadata?: Record<string, unknown>
}

export type NotebookContent = {
  cells: NotebookCell[]
  metadata: {
    language_info?: { name: string }
    kernelspec?: { display_name: string; language: string; name: string }
    [key: string]: unknown
  }
  nbformat: number
  nbformat_minor: number
}
