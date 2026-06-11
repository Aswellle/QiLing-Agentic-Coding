/**
 * MCP config lookup — STUB.
 * FROM CC: services/mcp/config.js
 * QiLing's MCP configs load through settings; per-name lookup for agent
 * frontmatter MCP servers is pending the full port.
 */
import type { ScopedMcpServerConfig } from "./types.js";

export function getMcpConfigByName(
  _name: string,
): ScopedMcpServerConfig | null {
  return null;
}
