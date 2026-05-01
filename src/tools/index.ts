import type { Tool } from '../types/tool'
import { FileReadTool } from './FileReadTool'
import { FileEditTool } from './FileEditTool'
import { FileWriteTool } from './FileWriteTool'
import { GlobTool } from './GlobTool'
import { GrepTool } from './GrepTool'
import { BashTool } from './BashTool'
import { PowerShellTool } from './PowerShellTool'
import { WebFetchTool } from './WebFetchTool'
import { TodoWriteTool } from './TodoWriteTool'
import type { Settings } from '../settings/schema'

export function buildToolRegistry(settings: Settings): Map<string, Tool> {
  const tools: Tool[] = [
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    GlobTool,
    GrepTool,
    TodoWriteTool,
  ]

  // Shell tool (platform-aware)
  if (process.platform === 'win32') {
    if (settings.tools.powershell.enabled) tools.push(PowerShellTool)
    if (settings.tools.bash.enabled) tools.push(BashTool) // WSL / Git Bash
  } else {
    if (settings.tools.bash.enabled) tools.push(BashTool)
  }

  // Network tools
  if (settings.tools.webFetch.enabled) tools.push(WebFetchTool)

  const registry = new Map<string, Tool>()
  for (const tool of tools) {
    registry.set(tool.name, tool)
  }
  return registry
}

export {
  FileReadTool,
  FileEditTool,
  FileWriteTool,
  GlobTool,
  GrepTool,
  BashTool,
  PowerShellTool,
  WebFetchTool,
  TodoWriteTool,
}
