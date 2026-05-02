import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

export interface PlanApprovalRequest {
  plan: string
  resolve: (approved: boolean) => void
}

interface Props {
  request: PlanApprovalRequest
}

const OPTIONS = [
  { key: 'y', label: 'Y', description: '批准并执行 (Approve)', approved: true },
  { key: 'n', label: 'N', description: '拒绝，请修改 (Reject)', approved: false },
]

export function PlanApprovalDialog({ request }: Props) {
  const [selected, setSelected] = useState(0)

  useInput((input, key) => {
    const lower = input.toLowerCase()
    const match = OPTIONS.findIndex(o => o.key === lower)
    if (match !== -1) {
      request.resolve(OPTIONS[match].approved)
      return
    }
    if (key.upArrow) setSelected(s => Math.max(0, s - 1))
    if (key.downArrow) setSelected(s => Math.min(OPTIONS.length - 1, s + 1))
    if (key.return) request.resolve(OPTIONS[selected].approved)
  })

  // Show first 40 lines of plan to avoid overwhelming the terminal
  const planLines = request.plan.split('\n')
  const visibleLines = planLines.slice(0, 40)
  const truncated = planLines.length > 40

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingLeft={1}
      paddingRight={1}
      marginBottom={1}
    >
      <Text color="magenta" bold>─ Claude 的实施计划 ─────────────────────────────</Text>

      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {visibleLines.map((line, i) => (
          <Text key={i} color={line.startsWith('##') ? 'white' : line.startsWith('#') ? 'white' : 'gray'} bold={line.startsWith('#')}>
            {line}
          </Text>
        ))}
        {truncated && (
          <Text color="gray" dimColor>… (计划还有 {planLines.length - 40} 行，批准后 Claude 将完整执行)</Text>
        )}
      </Box>

      <Box flexDirection="row" gap={3} marginTop={1}>
        {OPTIONS.map((opt, i) => (
          <Box key={opt.key} flexDirection="row">
            <Text color={i === selected ? (opt.approved ? 'green' : 'red') : 'white'} bold={i === selected}>
              [{opt.label}]
            </Text>
            <Text color="gray"> {opt.description}  </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
