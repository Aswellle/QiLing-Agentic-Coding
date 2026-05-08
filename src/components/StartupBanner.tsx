import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import figlet from 'figlet'
import gradient from 'gradient-string'
import type { ProviderConfig } from '../types/provider'

// ── Spring Green Palette ────────────────────────────────────────────────────
// 从嫩芽浅绿 → 春日翠绿 → 深林墨绿，象征春意盎然、灵感迸发
const SPRING_COLORS = {
  sprout:  '#b9f6ca',   // 嫩芽 — 最浅，初萌
  mint:    '#69f0ae',   // 薄荷 — 清新透亮
  vivid:   '#00e676',   // 鲜翠 — 饱满生机
  deep:    '#00c853',   // 深绿 — 茂盛
  forest:  '#1de9b6',   // 翡翠 — 灵动点缀
  dim:     '#004d2e',   // 暗林 — 衬托层次
}

// 春意渐变梯度
const springGrad  = gradient([SPRING_COLORS.sprout, SPRING_COLORS.vivid, SPRING_COLORS.deep])
const accentGrad  = gradient([SPRING_COLORS.mint, SPRING_COLORS.forest])
const logoGrad    = gradient([
  SPRING_COLORS.sprout,
  SPRING_COLORS.mint,
  SPRING_COLORS.vivid,
  SPRING_COLORS.deep,
  SPRING_COLORS.mint,
])

// ── Pre-render ASCII Logo ───────────────────────────────────────────────────
function renderLogo(): string {
  try {
    return figlet.textSync('QiLing', { font: 'Slant', horizontalLayout: 'default' })
  } catch {
    // ANSI Shadow 内嵌备用 — QiLing 的视觉表达
    return [
      '  ██████╗ ██╗██╗     ██╗███╗   ██╗  ██████╗ ',
      ' ██╔═══██╗██║██║     ██║████╗  ██║ ██╔════╝ ',
      ' ██║   ██║██║██║     ██║██╔██╗ ██║ ██║  ███╗',
      ' ██║▄▄ ██║██║██║     ██║██║╚██╗██║ ██║   ██║',
      ' ╚██████╔╝██║███████╗██║██║ ╚████║ ╚██████╔╝',
      '  ╚══▀▀═╝ ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝  ╚═════╝',
    ].join('\n')
  }
}

const RAW_LOGO = renderLogo()

function applyLogoGradient(text: string): string[] {
  try {
    return logoGrad(text).split('\n')
  } catch {
    return text.split('\n')
  }
}

// ── Animated Reveal ─────────────────────────────────────────────────────────
// 逐帧展开的春日启动仪式：边框 → logo → 信息 → 提示
const FRAMES = [
  'border',
  'logo',
  'info',
  'hints',
  'done',
] as const
type Frame = typeof FRAMES[number]

const FRAME_DELAY_MS = 70   // 每帧间隔（毫秒）

// ── Decorative Symbols ──────────────────────────────────────────────────────
const SYM = {
  SPROUT:  '✦',
  FLOWER:  '❀',
  DOT:     '⬡',
  ARROW:   '›',
  DASH:    '┄',
  THICK:   '━',
  SEMI:    '▸',
}

const BOX_W = 64   // 横向宽度（字符数）

interface Props {
  version: string
  provider: ProviderConfig
  workingDir: string
}

export function StartupBanner({ version, provider, workingDir }: Props) {
  const [frameIdx, setFrameIdx] = useState(0)
  const [logoLines, setLogoLines] = useState<string[]>([])

  // 应用渐变色（在第一次渲染后异步处理，避免阻塞）
  useEffect(() => {
    setLogoLines(applyLogoGradient(RAW_LOGO))
  }, [])

  // 逐帧展开动画
  useEffect(() => {
    if (frameIdx >= FRAMES.length - 1) return
    const t = setTimeout(() => setFrameIdx(i => i + 1), FRAME_DELAY_MS)
    return () => clearTimeout(t)
  }, [frameIdx])

  const frame: Frame = FRAMES[Math.min(frameIdx, FRAMES.length - 1)] ?? 'done'

  const showLogo  = frame !== 'border'
  const showInfo  = frame === 'info' || frame === 'hints' || frame === 'done'
  const showHints = frame === 'hints' || frame === 'done'

  const shortDir = workingDir.length > 50
    ? '…' + workingDir.slice(-49)
    : workingDir

  // 春日分隔线
  const dashLine = SYM.DASH.repeat(BOX_W)
  const thickLine = SYM.THICK.repeat(BOX_W)

  return (
    <Box flexDirection="column" marginBottom={1}>

      {/* ╔═ 顶部渐变横条 (Hermes 风格实心块) ══════════════════╗ */}
      <Text>{accentGrad('▄'.repeat(BOX_W + 4))}</Text>

      <Box flexDirection="column" paddingLeft={2} paddingRight={2}>

        {/* ── 春日题词 ── */}
        <Box marginTop={1} justifyContent="center">
          <Text color={SPRING_COLORS.mint}>
            {'  '}
            {SYM.SPROUT}{'  '}
            <Text color={SPRING_COLORS.sprout}>启 灵</Text>
            {'  '}
            {SYM.FLOWER}{'  '}
            <Text bold>春 意 盎 然 · 灵 感 迸 发</Text>
            {'  '}
            {SYM.FLOWER}{'  '}
            <Text color={SPRING_COLORS.sprout}>启 灵</Text>
            {'  '}
            {SYM.SPROUT}
          </Text>
        </Box>

        {/* ── ASCII 大 Logo（春绿渐变）── */}
        {showLogo && logoLines.length > 0 && (
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            {logoLines.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </Box>
        )}

        {/* ── 副标题 ── */}
        {showLogo && (
          <Box marginTop={1} justifyContent="center" gap={1}>
            <Text color={SPRING_COLORS.forest}>{SYM.FLOWER}</Text>
            <Text color={SPRING_COLORS.mint}>终 端 AI 编 程 代 理</Text>
            <Text color={SPRING_COLORS.dim}>  ·  </Text>
            <Text color="white">AI Programming Agent</Text>
            <Text color={SPRING_COLORS.dim}>  ·  </Text>
            <Text color={SPRING_COLORS.vivid}>v{version}</Text>
            <Text color={SPRING_COLORS.forest}>{SYM.FLOWER}</Text>
          </Box>
        )}

        {/* ── 分隔线 ── */}
        {showInfo && (
          <Box marginTop={1}>
            <Text color={SPRING_COLORS.deep} dimColor>{dashLine}</Text>
          </Box>
        )}

        {/* ── 会话信息 (Hermes 风格带圆点图标) ── */}
        {showInfo && (
          <Box flexDirection="column" marginTop={1} paddingLeft={1} gap={0}>
            {[
              { label: 'Provider', value: provider.displayName },
              { label: 'Model   ', value: provider.model },
              { label: 'Working ', value: shortDir },
            ].map(({ label, value }) => (
              <Box key={label} gap={1}>
                <Text color={SPRING_COLORS.vivid}>{SYM.DOT}</Text>
                <Text color={SPRING_COLORS.mint}>{label}</Text>
                <Text color={SPRING_COLORS.deep}>{SYM.ARROW}</Text>
                <Text color="white">{value}</Text>
              </Box>
            ))}
          </Box>
        )}

        {/* ── 命令提示 ── */}
        {showHints && (
          <>
            <Box marginTop={1}>
              <Text color={SPRING_COLORS.deep} dimColor>{dashLine}</Text>
            </Box>
            <Box marginTop={1} paddingLeft={1} gap={2} flexWrap="wrap">
              {[
                '/help', '/commit', '/review', '/memory',
                '/compact', '/cost', '/fast', '/clear',
              ].map(cmd => (
                <Box key={cmd} gap={0}>
                  <Text color={SPRING_COLORS.vivid}>{SYM.SEMI} </Text>
                  <Text color={SPRING_COLORS.mint}>{cmd}</Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={0} paddingLeft={1}>
              <Text color={SPRING_COLORS.dim} dimColor>
                {'Tab 补全  ·  Esc Vim  ·  ! Shell  ·  /help 查看全部  ·  ✦ 万物皆可启灵'}
              </Text>
            </Box>
          </>
        )}

      </Box>

      {/* ╚═ 底部渐变横条 ════════════════════════════════════╝ */}
      <Box marginTop={1}>
        <Text>{springGrad('▀'.repeat(BOX_W + 4))}</Text>
      </Box>

    </Box>
  )
}
