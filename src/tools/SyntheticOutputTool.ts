/**
 * SyntheticOutputTool (StructuredOutput) — ported from CC's SyntheticOutputTool
 *
 * Enables non-interactive/SDK sessions to request structured JSON output from the model.
 * The caller passes a JSON Schema (via QILING_OUTPUT_SCHEMA env var); the tool validates
 * the model's output against it.
 */

import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'

export const SYNTHETIC_OUTPUT_TOOL_NAME = 'StructuredOutput'

const inputSchema = z.object({}).passthrough()
type Input = Record<string, unknown>

// ─── Lightweight schema validation (no Ajv dep) ───────────────────────────────
type JSONSchema = Record<string, unknown>

function validateAgainstSchema(value: unknown, schema: JSONSchema, path = 'root'): string[] {
  const errors: string[] = []

  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${path}: expected object, got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`)
      return errors
    }
    const obj = value as Record<string, unknown>
    const required = (schema.required as string[]) ?? []
    for (const key of required) {
      if (!(key in obj)) errors.push(`${path}.${key}: required field missing`)
    }
    const props = (schema.properties as Record<string, JSONSchema>) ?? {}
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj) errors.push(...validateAgainstSchema(obj[key], propSchema, `${path}.${key}`))
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array, got ${typeof value}`)
      return errors
    }
    if (schema.items) {
      value.forEach((item, i) =>
        errors.push(...validateAgainstSchema(item, schema.items as JSONSchema, `${path}[${i}]`))
      )
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') errors.push(`${path}: expected string, got ${typeof value}`)
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number') errors.push(`${path}: expected number, got ${typeof value}`)
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path}: expected boolean, got ${typeof value}`)
  }

  return errors
}

// ─── Cached tool builder ──────────────────────────────────────────────────────
const toolCache = new WeakMap<object, Tool>()

export function createSyntheticOutputTool(jsonSchema: JSONSchema): { tool: Tool } | { error: string } {
  const cached = toolCache.get(jsonSchema)
  if (cached) return { tool: cached }

  try {
    const tool = buildSyntheticOutputTool(jsonSchema)
    toolCache.set(jsonSchema, tool)
    return { tool }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

function buildSyntheticOutputTool(jsonSchema: JSONSchema): Tool<Input> {
  return {
    name: SYNTHETIC_OUTPUT_TOOL_NAME,
    description: 'Return structured output in the requested format. Use this tool exactly once at the end of your response to provide the structured output.',
    inputSchema,

    isConcurrencySafe(_input: Input): boolean { return true },

    checkPermissions(_input: Input): PermissionDecision {
      return { type: 'allow' }
    },

    async call(input: Input, _context: ToolContext): Promise<ToolResult> {
      const errors = validateAgainstSchema(input, jsonSchema)
      if (errors.length > 0) {
        const errMsg = `Output does not match required schema: ${errors.join(', ')}`
        return { content: [{ type: 'text', text: errMsg }], isError: true }
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ data: 'Structured output provided successfully', structured_output: input }),
        }],
      }
    },

    toDefinition(): ToolDefinition {
      return {
        name: SYNTHETIC_OUTPUT_TOOL_NAME,
        description: 'Return structured output in the requested format.',
        input_schema: {
          type: 'object',
          properties: (jsonSchema.properties as Record<string, unknown>) ?? {},
          required: (jsonSchema.required as string[]) ?? [],
        },
      }
    },
  }
}

export function isSyntheticOutputToolEnabled(): boolean {
  const schemaEnv = process.env.QILING_OUTPUT_SCHEMA
  if (!schemaEnv) return false
  try {
    JSON.parse(schemaEnv)
    return true
  } catch {
    return false
  }
}

export function getSyntheticOutputSchema(): JSONSchema | null {
  const schemaEnv = process.env.QILING_OUTPUT_SCHEMA
  if (!schemaEnv) return null
  try {
    return JSON.parse(schemaEnv) as JSONSchema
  } catch {
    return null
  }
}

export const SyntheticOutputTool: Tool<Input> = {
  name: SYNTHETIC_OUTPUT_TOOL_NAME,
  description: 'Return structured output in the requested format. Use this tool exactly once at the end of your response to provide the structured output.',
  inputSchema,

  isConcurrencySafe(_input: Input): boolean { return true },

  checkPermissions(_input: Input): PermissionDecision {
    return { type: 'allow' }
  },

  async call(input: Input, _context: ToolContext): Promise<ToolResult> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ data: 'Structured output provided successfully', structured_output: input }),
      }],
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: SYNTHETIC_OUTPUT_TOOL_NAME,
      description: 'Return structured output in the requested format.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    }
  },
}
