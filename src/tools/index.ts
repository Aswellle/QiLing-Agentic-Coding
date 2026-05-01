import type { Tool } from '../types/tool'
import { FileReadTool } from './FileReadTool'
import { FileEditTool } from './FileEditTool'
import { FileWriteTool } from './FileWriteTool'
import { GlobTool } from './GlobTool'
import { GrepTool } from './GrepTool'
import { BashTool } from './BashTool'
import { PowerShellTool } from './PowerShellTool'
import type { Settings } from '../settings/schema'

export function buildToolRegistry(settings: Settings): Map<string, Tool> {
  const tools: Tool[] = [
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    GlobTool,
    GrepTool,
  ]

  // Platform-appropriate shell tool
  if (process.platform === 'win32') {
    if (settings.tools.powershell.enabled) tools.push(PowerShellTool)
    // Also include Bash on Windows if WSL/Git Bash is available
    if (settings.tools.bash.enabled) tools.push(BashTool)
  } else {
    if (settings.tools.bash.enabled) tools.push(BashTool)
  }

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
}
