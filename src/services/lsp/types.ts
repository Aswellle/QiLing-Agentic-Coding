/**
 * LSP service types — ported from CC's services/lsp/types.ts
 */

/** State of a single LSP server instance */
export type LspServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'

/** Configuration for a scoped LSP server */
export type ScopedLspServerConfig = {
  /** Command to run the LSP server */
  command: string
  /** Arguments to pass to the command */
  args?: string[]
  /** Extra environment variables */
  env?: Record<string, string>
  /** Map from file extension (e.g. ".ts") to LSP language ID (e.g. "typescript") */
  extensionToLanguage: Record<string, string>
  /** Optional workspace settings to pass to the server */
  workspaceSettings?: Record<string, unknown>
  /** Optional initialization options to pass to the server (LSP initializationOptions) */
  initializationOptions?: Record<string, unknown>
  /** Workspace folder path (defaults to cwd) */
  workspaceFolder?: string
  /** Max number of crash-recovery restarts (default: 3) */
  maxRestarts?: number
  /** Startup timeout in milliseconds */
  startupTimeout?: number
  /** Not implemented — will throw if set */
  restartOnCrash?: boolean
  /** Not implemented — will throw if set */
  shutdownTimeout?: number
}

/** A single diagnostic from an LSP server */
export type LspDiagnosticItem = {
  message: string
  severity: 'Error' | 'Warning' | 'Info' | 'Hint'
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  source?: string
  code?: string
}

/** A file's diagnostic results */
export type DiagnosticFile = {
  uri: string
  diagnostics: LspDiagnosticItem[]
}
