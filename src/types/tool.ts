import type { ZodType, ZodTypeDef } from 'zod'
import type React from 'react'

export type PermissionDecision =
  | { type: 'allow' }
  | { type: 'deny'; reason: string }
  | { type: 'ask'; description: string }

export interface ToolResultItem {
  type: 'text'
  text: string
}

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
}
