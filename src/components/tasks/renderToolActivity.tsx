import React from 'react'
import { Text } from 'ink'
import type { ThemeName } from '../../utils/theme.js'

// FROM CC: ToolActivity from tasks/LocalAgentTask/LocalAgentTask.ts — inline type
type ToolActivity = {
  toolName: string
  input: Record<string, unknown>
}

// FROM CC: Tools type and findToolByName from Tool.ts — simplified
type ToolLike = {
  name?: string
  inputSchema?: { safeParse?: (input: unknown) => { success: boolean; data: unknown } }
  userFacingName?: (input: unknown) => string | null
  renderToolUseMessage?: (input: unknown, opts: { theme: string; verbose: boolean }) => React.ReactNode
}
type Tools = ToolLike[] | Record<string, ToolLike>

function findToolByName(tools: Tools, name: string): ToolLike | undefined {
  if (Array.isArray(tools)) {
    return tools.find(t => t.name === name)
  }
  return (tools as Record<string, ToolLike>)[name]
}

export function renderToolActivity(
  activity: ToolActivity,
  tools: Tools,
  theme: ThemeName,
): React.ReactNode {
  const tool = findToolByName(tools, activity.toolName)
  if (!tool) {
    return activity.toolName
  }
  try {
    const parsed = tool.inputSchema?.safeParse?.(activity.input)
    const parsedInput = parsed?.success ? parsed.data : {}
    const userFacingName = tool.userFacingName?.(parsedInput)
    if (!userFacingName) {
      return activity.toolName
    }
    const toolArgs = tool.renderToolUseMessage?.(parsedInput, {
      theme,
      verbose: false,
    })
    if (toolArgs) {
      return (
        <Text>
          {userFacingName}({toolArgs})
        </Text>
      )
    }
    return userFacingName
  } catch {
    return activity.toolName
  }
}
