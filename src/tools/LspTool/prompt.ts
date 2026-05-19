/**
 * LSP tool prompt — adapted from CC's tools/LSPTool/prompt.ts
 */

export const LSP_TOOL_NAME = 'LSP' as const

export const DESCRIPTION = `Interact with Language Server Protocol (LSP) servers to get code intelligence features.

Supported operations:
- goToDefinition: Find where a symbol is defined
- findReferences: Find all references to a symbol
- hover: Get hover information (documentation, type info)
- documentSymbol: Get all symbols in a document
- workspaceSymbol: Search for symbols across the workspace
- goToImplementation: Find implementations of interface/abstract methods
- prepareCallHierarchy: Get call hierarchy item at a position
- incomingCalls: Find callers of a function/method
- outgoingCalls: Find functions/methods called by a function

All operations require:
- filePath: The file to operate on
- line: Line number (1-based)
- character: Character offset (1-based)

Note: LSP servers must be configured for the file type.`
