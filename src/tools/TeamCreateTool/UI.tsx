import React from 'react'

type Input = { team_name?: string }

export function renderToolUseMessage(input: Partial<Input>): React.ReactNode {
  return `create team: ${input.team_name}`
}
