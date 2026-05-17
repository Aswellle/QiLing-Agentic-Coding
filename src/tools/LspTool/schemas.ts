/**
 * LSP Tool input schemas — ported from CC's tools/LSPTool/schemas.ts
 *
 * Discriminated union of all LSP operations with Zod validation.
 * Each operation targets a specific position or document.
 */

import { z } from 'zod'

// ─── Operation schemas ────────────────────────────────────────────────────────

const positionFields = {
  filePath: z.string().describe('Absolute or relative path to the file'),
  line: z.number().int().positive().describe('Line number (1-based, as shown in editors)'),
  character: z.number().int().positive().describe('Character offset (1-based, as shown in editors)'),
}

const goToDefinitionSchema = z.object({
  operation: z.literal('goToDefinition'),
  ...positionFields,
})

const findReferencesSchema = z.object({
  operation: z.literal('findReferences'),
  ...positionFields,
})

const hoverSchema = z.object({
  operation: z.literal('hover'),
  ...positionFields,
})

const documentSymbolsSchema = z.object({
  operation: z.literal('documentSymbols'),
  filePath: z.string().describe('Absolute or relative path to the file'),
})

const workspaceSymbolsSchema = z.object({
  operation: z.literal('workspaceSymbols'),
  query: z.string().describe('Search query for workspace-wide symbol lookup'),
})

const prepareCallHierarchySchema = z.object({
  operation: z.literal('prepareCallHierarchy'),
  ...positionFields,
})

const incomingCallsSchema = z.object({
  operation: z.literal('incomingCalls'),
  ...positionFields,
})

const outgoingCallsSchema = z.object({
  operation: z.literal('outgoingCalls'),
  ...positionFields,
})

// ─── Union ────────────────────────────────────────────────────────────────────

export const lspToolInputSchema = z.discriminatedUnion('operation', [
  goToDefinitionSchema,
  findReferencesSchema,
  hoverSchema,
  documentSymbolsSchema,
  workspaceSymbolsSchema,
  prepareCallHierarchySchema,
  incomingCallsSchema,
  outgoingCallsSchema,
])

export type LspToolInput = z.infer<typeof lspToolInputSchema>

export type LspOperation = LspToolInput['operation']

// ─── LSP method mapping ───────────────────────────────────────────────────────

export const OPERATION_TO_LSP_METHOD: Record<LspOperation, string> = {
  goToDefinition: 'textDocument/definition',
  findReferences: 'textDocument/references',
  hover: 'textDocument/hover',
  documentSymbols: 'textDocument/documentSymbol',
  workspaceSymbols: 'workspace/symbol',
  prepareCallHierarchy: 'textDocument/prepareCallHierarchy',
  incomingCalls: 'callHierarchy/incomingCalls',
  outgoingCalls: 'callHierarchy/outgoingCalls',
}
