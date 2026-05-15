import React, { useEffect, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { loadStats } from '../services/stats'
import type { QiLingStats } from '../services/stats'

interface StatsProps {
  onClose: () => void
}

type DateRange = '7d' | '30d' | 'all'

export function Stats({ onClose }: StatsProps) {
  const [stats, setStats] = useState<QiLingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [tab, setTab] = useState<'overview' | 'models'>('overview')

  useEffect(() => {
    loadStats().then(s => {
      setStats(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useInput((input, key) => {
    if (key.escape || input === 'q') onClose()
    if (input === 'r') {
      setDateRange(d => d === '7d' ? '30d' : d === '30d' ? 'all' : '7d')
    }
    if (key.tab) {
      setTab(t => t === 'overview' ? 'models' : 'overview')
    }
  })

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">正在加载统计数据...</Text>
      </Box>
    )
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="gray">暂无会话数据。开始使用 QiLing 后再来查看！</Text>
        <Text color="gray" dimColor>按 ESC 或 q 关闭</Text>
      </Box>
    )
  }

  // Filter by date range
  const now = new Date()
  const cutoffDate = dateRange === '7d'
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : dateRange === '30d'
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : '0000-00-00'

  const filteredActivity = stats.dailyActivity.filter(d => d.date >= cutoffDate)
  const filteredSessions = filteredActivity.reduce((s, d) => s + d.sessions, 0)
  const filteredMessages = filteredActivity.reduce((s, d) => s + d.messages, 0)

  // Simple activity bar (last 14 days max)
  const activityBars = filteredActivity.slice(-14).map(d => {
    const maxMsgs = Math.max(...filteredActivity.map(a => a.messages), 1)
    const height = Math.round((d.messages / maxMsgs) * 5)
    return { date: d.date.slice(5), bar: '█'.repeat(height) || '▁', messages: d.messages }
  })

  const rangeLabel = dateRange === '7d' ? '近 7 天' : dateRange === '30d' ? '近 30 天' : '全部时间'

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">QiLing 使用统计</Text>
        <Text color="gray">{rangeLabel} · r=切换范围 Tab=切换视图 ESC=关闭</Text>
      </Box>

      {/* Tabs */}
      <Box marginBottom={1}>
        <Text color={tab === 'overview' ? 'cyan' : 'gray'}
          bold={tab === 'overview'}>[概览]</Text>
        <Text> </Text>
        <Text color={tab === 'models' ? 'cyan' : 'gray'}
          bold={tab === 'models'}>[模型使用]</Text>
      </Box>

      {tab === 'overview' && (
        <Box flexDirection="column" gap={1}>
          {/* Key metrics */}
          <Box gap={4}>
            <Box flexDirection="column">
              <Text color="yellow" bold>{filteredSessions}</Text>
              <Text color="gray">会话数</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="yellow" bold>{filteredMessages}</Text>
              <Text color="gray">消息数</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="yellow" bold>{stats.currentStreak}天</Text>
              <Text color="gray">当前连续</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="yellow" bold>{stats.longestStreak}天</Text>
              <Text color="gray">最长连续</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="yellow" bold>{stats.avgMessagesPerSession}</Text>
              <Text color="gray">均消息/会话</Text>
            </Box>
          </Box>

          {/* Activity chart */}
          {activityBars.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray" dimColor>活跃度（最近{activityBars.length}天）</Text>
              <Box gap={1} marginTop={0}>
                {activityBars.map(b => (
                  <Box key={b.date} flexDirection="column" alignItems="center">
                    <Text color="cyan">{b.bar}</Text>
                    <Text color="gray" dimColor>{b.date.slice(3)}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Date range info */}
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              {stats.firstSessionDate ? `首次使用: ${stats.firstSessionDate}` : ''}
              {stats.lastSessionDate ? `  最近使用: ${stats.lastSessionDate}` : ''}
            </Text>
          </Box>
        </Box>
      )}

      {tab === 'models' && (
        <Box flexDirection="column">
          {stats.modelUsage.length === 0 ? (
            <Text color="gray">暂无模型使用数据</Text>
          ) : (
            stats.modelUsage.slice(0, 8).map(m => (
              <Box key={m.model} gap={2} marginBottom={0}>
                <Text color="cyan" bold>{m.model.slice(0, 30).padEnd(30)}</Text>
                <Text color="yellow">{m.sessions.toString().padStart(4)} 次</Text>
                <Text color="gray" dimColor>
                  {(m.inputTokens / 1000).toFixed(1)}k in / {(m.outputTokens / 1000).toFixed(1)}k out
                </Text>
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  )
}
