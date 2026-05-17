/**
 * Zod v3 → JSON Schema conversion with WeakMap caching.
 * Ported from CC's utils/zodToJsonSchema.ts
 *
 * toolToAPISchema() is called for every tool on every API request (~60-250
 * times/turn). Tool schemas use the same Zod object reference per session,
 * so WeakMap identity caching avoids repeated schema traversal.
 */

import type { ZodTypeAny } from 'zod'

export type JsonSchema7Type = Record<string, unknown>

const cache = new WeakMap<ZodTypeAny, JsonSchema7Type>()

/**
 * Convert a Zod schema to JSON Schema 7 format.
 * Caches results by schema object identity for performance.
 */
export function zodToJsonSchema(schema: ZodTypeAny): JsonSchema7Type {
  const cached = cache.get(schema)
  if (cached) return cached

  const result = buildJsonSchema(schema)
  cache.set(schema, result)
  return result
}

/**
 * Build JSON Schema from Zod schema.
 * Handles the most common Zod types used in QiLing tool definitions.
 */
function buildJsonSchema(schema: ZodTypeAny): JsonSchema7Type {
  const def = (schema as { _def?: Record<string, unknown> })._def

  if (!def) return { type: 'object' }

  const typeName = def.typeName as string

  switch (typeName) {
    case 'ZodString':
      return buildStringSchema(def)
    case 'ZodNumber':
    case 'ZodBigInt':
      return { type: 'number' }
    case 'ZodInt':
      return { type: 'integer' }
    case 'ZodBoolean':
      return { type: 'boolean' }
    case 'ZodNull':
      return { type: 'null' }
    case 'ZodUndefined':
    case 'ZodVoid':
      return {}
    case 'ZodArray':
      return buildArraySchema(def)
    case 'ZodObject':
      return buildObjectSchema(def)
    case 'ZodEnum':
      return { enum: (def.values as unknown[]) }
    case 'ZodNativeEnum':
      return { enum: Object.values(def.values as Record<string, unknown>) }
    case 'ZodUnion':
      return { oneOf: (def.options as ZodTypeAny[]).map(o => zodToJsonSchema(o)) }
    case 'ZodDiscriminatedUnion':
      return { oneOf: (def.options as ZodTypeAny[]).map(o => zodToJsonSchema(o)) }
    case 'ZodOptional':
      return zodToJsonSchema(def.innerType as ZodTypeAny)
    case 'ZodNullable':
      return { oneOf: [zodToJsonSchema(def.innerType as ZodTypeAny), { type: 'null' }] }
    case 'ZodDefault':
      return { ...zodToJsonSchema(def.innerType as ZodTypeAny), default: (def.defaultValue as () => unknown)?.() }
    case 'ZodLiteral':
      return { const: def.value }
    case 'ZodRecord':
      return { type: 'object', additionalProperties: zodToJsonSchema(def.valueType as ZodTypeAny) }
    case 'ZodTuple':
      return { type: 'array', items: (def.items as ZodTypeAny[]).map(zodToJsonSchema) }
    case 'ZodIntersection':
      return { allOf: [zodToJsonSchema(def.left as ZodTypeAny), zodToJsonSchema(def.right as ZodTypeAny)] }
    case 'ZodLazy':
      return zodToJsonSchema((def.getter as () => ZodTypeAny)())
    default:
      return {}
  }
}

function buildStringSchema(def: Record<string, unknown>): JsonSchema7Type {
  const schema: JsonSchema7Type = { type: 'string' }
  const checks = (def.checks as Array<{ kind: string; value?: unknown }>) ?? []
  for (const check of checks) {
    if (check.kind === 'min') schema.minLength = check.value
    if (check.kind === 'max') schema.maxLength = check.value
    if (check.kind === 'regex') schema.pattern = String(check.value)
    if (check.kind === 'url') schema.format = 'uri'
    if (check.kind === 'email') schema.format = 'email'
    if (check.kind === 'uuid') schema.format = 'uuid'
  }
  return schema
}

function buildArraySchema(def: Record<string, unknown>): JsonSchema7Type {
  const schema: JsonSchema7Type = { type: 'array' }
  if (def.type) schema.items = zodToJsonSchema(def.type as ZodTypeAny)
  const checks = (def.checks as Array<{ kind: string; value?: unknown }>) ?? []
  for (const check of checks) {
    if (check.kind === 'min') schema.minItems = check.value
    if (check.kind === 'max') schema.maxItems = check.value
  }
  return schema
}

function buildObjectSchema(def: Record<string, unknown>): JsonSchema7Type {
  const shape = def.shape as (() => Record<string, ZodTypeAny>) | Record<string, ZodTypeAny>
  const shapeObj = typeof shape === 'function' ? shape() : shape

  const properties: Record<string, JsonSchema7Type> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shapeObj ?? {})) {
    properties[key] = zodToJsonSchema(value)
    const valueDef = (value as { _def?: { typeName?: string } })._def
    const isOptional = valueDef?.typeName === 'ZodOptional' || valueDef?.typeName === 'ZodDefault'
    if (!isOptional) required.push(key)
  }

  const schema: JsonSchema7Type = { type: 'object', properties }
  if (required.length > 0) schema.required = required
  return schema
}
