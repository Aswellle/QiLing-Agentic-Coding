import type { ZodType, ZodTypeDef } from 'zod'
import type React from 'react'
import type { ProgressMessage } from './message.js'
import type { ThemeName } from '../utils/theme.js'

// FROM CC: Tool.ts — base type for tool execution progress data.
// Each tool defines its own progress type (must have a `type` discriminant).
export type ToolProgressData = {
  type: string
}

// FROM CC: Tool.ts
export type ToolProgress<P extends ToolProgressData = ToolProgressData> = {
  toolUseID: string
  data: P
}

// FROM CC: Tool.ts — callback passed to tool.call() for streaming progress
export type ToolCallProgress<P extends ToolProgressData = ToolProgressData> = (
  progress: ToolProgress<P>,
) => void

export type PermissionDecision =
  | { type: 'allow' }
  | { type: 'deny'; reason: string }
  | { type: 'ask'; description: string }

export interface ToolResultTextItem {
  type: 'text'
  text: string
}

export interface ToolResultImageItem {
  type: 'image'
  source: {
    type: 'base64'
    media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
    data: string
  }
}

export type ToolResultItem = ToolResultTextItem | ToolResultImageItem

export interface ToolResult {
  content: ToolResultItem[]
  isError?: boolean
}

export interface ToolContext {
  workingDir: string
  sessionId: string
  onProgress?: (message: string) => void
}

export interface PermissionManager {
  check(toolName: string, input: unknown): Promise<PermissionDecision>
  recordDecision(
    toolName: string,
    pattern: string,
    decision: 'allow' | 'deny',
    scope: 'session' | 'project' | 'global'
  ): void
}

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface Tool<TInput = Record<string, unknown>> {
  name: string
  description: string
  inputSchema: ZodType<TInput, ZodTypeDef, unknown>

  call(input: TInput, context: ToolContext): Promise<ToolResult>
  checkPermissions?(input: TInput): PermissionDecision | Promise<PermissionDecision>

  renderToolUse?(input: TInput): React.ReactNode
  renderToolResult?(result: ToolResult, input: TInput): React.ReactNode

  // FROM CC: Tool.ts — per-tool UI rendering hooks (used by tool UI.tsx modules)
  renderToolResultMessage?(
    content: unknown,
    progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
    options: {
      style?: 'condensed'
      theme?: ThemeName
      verbose?: boolean
      tools?: readonly Tool<any>[]
      isTranscriptMode?: boolean
      isBriefOnly?: boolean
      input?: unknown
    },
  ): React.ReactNode
  renderToolUseProgressMessage?(
    progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
    options: {
      tools?: readonly Tool<any>[]
      verbose?: boolean
      terminalSize?: { columns: number; rows: number }
      inProgressToolCallCount?: number
      isTranscriptMode?: boolean
    },
  ): React.ReactNode

  toDefinition(): ToolDefinition

  /**
   * Returns true if this tool can safely run concurrently with other tools.
   * Read-only tools (FileRead, Glob, Grep etc.) return true.
   * Write/execute tools (FileEdit, FileWrite, Bash etc.) return false (default).
   * Mirrors CC's isConcurrencySafe() on Tool.
   */
  isConcurrencySafe?(input: TInput): boolean

  /**
   * Maximum result size in characters before microcompact truncation.
   * Mirrors CC's maxResultSizeChars on tool definitions.
   * Undefined = no limit (use global default).
   */
  maxResultSizeChars?: number
}
