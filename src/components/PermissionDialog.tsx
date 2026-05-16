import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { useTheme } from '../utils/themeContext'

export interface PermissionRequest {
  toolName: string
  description: string
  resolve: (decision: 'allow' | 'deny', remember: 'session' | 'project' | 'global' | 'once') => void
}

interface Props {
  request: PermissionRequest
}

const OPTIONS = [
  { key: 'y', label: 'Y', description: '允许一次 (Once)', decision: 'allow' as const, remember: 'once' as const },
  { key: 'n', label: 'N', description: '拒绝 (Deny)', decision: 'deny' as const, remember: 'once' as const },
  { key: 'a', label: 'A', description: '本次会话允许 (Session)', decision: 'allow' as const, remember: 'session' as const },
  { key: 'g', label: 'G', description: '全局永久允许 (Global)', decision: 'allow' as const, remember: 'global' as const },
]

export function PermissionDialog({ request }: Props) {
  const [selected, setSelected] = useState(0)
  const { theme } = useTheme()

  useInput((input, key) => {
    const lower = input.toLowerCase()
    const match = OPTIONS.findIndex(o => o.key === lower)
    if (match !== -1) {
      const opt = OPTIONS[match]!
      request.resolve(opt.decision, opt.remember)
      return
    }

    if (key.upArrow) setSelected(s => Math.max(0, s - 1))
    if (key.downArrow) setSelected(s => Math.min(OPTIONS.length - 1, s + 1))
    if (key.return) {
      const opt = OPTIONS[selected]!
      request.resolve(opt.decision, opt.remember)
    }
  })

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.permission}
      paddingLeft={1}
      paddingRight={1}
      marginBottom={1}
    >
      <Text color={theme.permission} bold>─ 权限请求 ─────────────────────────</Text>
      <Box marginTop={1} marginBottom={1} flexDirection="column">
        <Text color={theme.warning}>⚠  {request.toolName} 请求执行：</Text>
        <Text>{request.description}</Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        {OPTIONS.map((opt, i) => (
          <Box key={opt.key} flexDirection="row">
            <Text color={i === selected ? theme.suggestion : undefined} bold={i === selected}>
              [{opt.label}]
            </Text>
            <Text color={theme.inactive}> {opt.description}  </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
