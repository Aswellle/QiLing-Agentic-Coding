export const LIST_MCP_RESOURCES_TOOL_NAME = 'ListMcpResourcesTool'

export const DESCRIPTION = `
Lists available resources from configured MCP servers.
Each resource object includes a 'server' field indicating which server it's from.

Usage examples:
- List all resources from all servers: listMcpResources
- List resources from a specific server: listMcpResources({ server: "myserver" })
`

export const PROMPT = `
List available resources from configured MCP servers.
Each returned resource includes standard MCP resource fields plus a 'server' field.

Parameters:
- server (optional): Specific MCP server name. If omitted, returns resources from all servers.
`
