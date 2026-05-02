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
import { AgentTool } from './AgentTool'
import { NotebookReadTool } from './NotebookReadTool'
import { RepoMapTool } from './RepoMapTool'
import { LspTool } from './LspTool'
import { NotebookEditTool } from './NotebookEditTool'
import { ConfigTool } from './ConfigTool'
import { BriefTool } from './BriefTool'
import { AskUserQuestionTool } from './AskUserQuestionTool'
import { WebSearchTool } from './WebSearchTool'
import { EnterPlanModeTool } from './EnterPlanModeTool'
import { ExitPlanModeTool } from './ExitPlanModeTool'
import { TaskCreateTool } from './TaskCreateTool'
import { TaskGetTool } from './TaskGetTool'
import { TaskListTool } from './TaskListTool'
import { TaskUpdateTool } from './TaskUpdateTool'
import { TaskStopTool } from './TaskStopTool'
import { TaskOutputTool } from './TaskOutputTool'
import { SendMessageTool } from './SendMessageTool'
import { TeamCreateTool } from './TeamCreateTool'
import { TeamDeleteTool } from './TeamDeleteTool'
import { CronCreateTool } from './CronCreateTool'
import { CronDeleteTool } from './CronDeleteTool'
import { CronListTool } from './CronListTool'
import { SleepTool } from './SleepTool'
import { ToolSearchTool } from './ToolSearchTool'
import { SkillTool } from './SkillTool'
import { EnterWorktreeTool } from './EnterWorktreeTool'
import { ExitWorktreeTool } from './ExitWorktreeTool'
import { ListMcpResourcesTool } from './ListMcpResourcesTool'
import { ReadMcpResourceTool } from './ReadMcpResourceTool'
import { McpAuthTool } from './McpAuthTool'
import { RemoteTriggerTool } from './RemoteTriggerTool'
import type { Settings } from '../settings/schema'

export function buildToolRegistry(settings: Settings): Map<string, Tool> {
  const tools: Tool[] = [
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    GlobTool,
    GrepTool,
    TodoWriteTool,
    AgentTool,
    NotebookReadTool,
    RepoMapTool,
    LspTool,
    NotebookEditTool,
    ConfigTool,
    BriefTool,
    AskUserQuestionTool,
    EnterPlanModeTool,
    ExitPlanModeTool,
    // Task coordination system
    TaskCreateTool,
    TaskGetTool,
    TaskListTool,
    TaskUpdateTool,
    TaskStopTool,
    TaskOutputTool,
    // Multi-agent coordination
    SendMessageTool,
    TeamCreateTool,
    TeamDeleteTool,
    // Scheduling & sleep
    CronCreateTool,
    CronDeleteTool,
    CronListTool,
    SleepTool,
    // Tool discovery & skill invocation
    ToolSearchTool,
    SkillTool,
    // Git worktree isolation
    EnterWorktreeTool,
    ExitWorktreeTool,
    // MCP ecosystem
    ListMcpResourcesTool,
    ReadMcpResourceTool,
    McpAuthTool,
    RemoteTriggerTool,
  ]

  // Shell tools (platform-aware)
  if (process.platform === 'win32') {
    if (settings.tools.powershell.enabled) tools.push(PowerShellTool)
    if (settings.tools.bash.enabled) tools.push(BashTool) // WSL / Git Bash
  } else {
    if (settings.tools.bash.enabled) tools.push(BashTool)
  }

  // Network tools
  if (settings.tools.webFetch.enabled) tools.push(WebFetchTool)
  if (settings.tools.webSearch.enabled) tools.push(WebSearchTool)

  const registry = new Map<string, Tool>()
  for (const tool of tools) {
    registry.set(tool.name, tool)
  }
  // Expose to ToolSearchTool
  _activeRegistry = registry
  return registry
}

// Module-level registry reference for ToolSearchTool
let _activeRegistry: Map<string, Tool> | null = null

export function getActiveRegistry(): Map<string, Tool> | null {
  return _activeRegistry
}

export {
  FileReadTool, FileEditTool, FileWriteTool,
  GlobTool, GrepTool, BashTool, PowerShellTool,
  WebFetchTool, TodoWriteTool, AgentTool,
}
