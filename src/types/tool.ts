import type { ZodType, ZodTypeDef } from 'zod'
import type React from 'react'

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
