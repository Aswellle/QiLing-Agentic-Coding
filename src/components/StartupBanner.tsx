import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import figlet from 'figlet'
import gradient from 'gradient-string'
import type { ProviderConfig } from '../types/provider'

interface Props {
  version: string
  provider: ProviderConfig
  workingDir: string
}

// Pre-render the ASCII art synchronously so it's ready on first render
function renderBanner(text: string): string {
  try {
    return figlet.textSync(text, { font: 'Slant', horizontalLayout: 'default' })
  } catch {
    // Fallback to a simple banner if figlet fails
    return `  QiLing  `
  }
}

const QILING_BANNER = renderBanner('QiLing')

// Apply cyan→blue gradient to the banner
function colorizedBanner(text: string): string {
  try {
    return gradient(['#00d4ff', '#0080ff', '#4040ff'])(text)
  } catch {
    return text
  }
}

export function StartupBanner({ version, provider, workingDir }: Props) {
  const [bannerLines, setBannerLines] = useState<string[]>([])

  useEffect(() => {
    const colored = colorizedBanner(QILING_BANNER)
    setBannerLines(colored.split('\n'))
  }, [])

  const shortDir = workingDir.length > 50
    ? '...' + workingDir.slice(-47)
    : workingDir

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top border */}
      <Text color="cyan">{'═'.repeat(64)}</Text>

      {/* ASCII art logo */}
      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        {bannerLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {/* Subtitle */}
      <Box marginLeft={2} marginTop={1}>
        <Text color="cyan">启 灵 编 程 代 理  </Text>
        <Text color="white">·  QiLing Programming Agent  </Text>
        <Text color="gray">v{version}</Text>
      </Box>

      {/* Provider info */}
      <Box
        flexDirection="column"
        marginLeft={2}
        marginTop={1}
        borderStyle="round"
        borderColor="gray"
        paddingLeft={1}
        paddingRight={1}
      >
        <Box>
          <Text color="gray">Provider  </Text>
          <Text color="cyan">›  </Text>
          <Text color="white">{provider.displayName}</Text>
        </Box>
        <Box>
          <Text color="gray">Model     </Text>
          <Text color="cyan">›  </Text>
          <Text color="white">{provider.model}</Text>
        </Box>
        <Box>
          <Text color="gray">Endpoint  </Text>
          <Text color="cyan">›  </Text>
          <Text color="white">{provider.endpoint ?? 'https://api.anthropic.com'}</Text>
        </Box>
      </Box>

      {/* Working directory */}
      <Box marginLeft={2} marginTop={1}>
        <Text color="gray">Working in  </Text>
        <Text color="yellow">{shortDir}</Text>
      </Box>

      {/* Command hints — CC-style compact command row */}
      <Box marginLeft={2} marginTop={1} flexWrap="wrap" gap={2}>
        {['/help', '/model', '/memory', '/compact', '/cost', '/fast', '/clear'].map(cmd => (
          <Text key={cmd} color="cyan">{cmd}</Text>
        ))}
      </Box>
      <Box marginLeft={2} marginTop={0}>
        <Text color="gray" dimColor>输入 /help 查看全部命令 · Tab 自动补全 · Esc 进入 Vim 模式 · ! cmd 执行 Shell</Text>
      </Box>

      {/* Bottom border */}
      <Box marginTop={1}>
        <Text color="cyan">{'═'.repeat(64)}</Text>
      </Box>
    </Box>
  )
}
