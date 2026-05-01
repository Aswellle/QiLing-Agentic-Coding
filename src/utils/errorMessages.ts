/**
 * 生产级错误信息映射
 * 将原始 API 错误转换为可操作的用户友好提示
 */

interface ErrorGuidance {
  title: string
  detail: string
  action?: string
}

export function getErrorGuidance(error: string, provider?: string): ErrorGuidance {
  const lower = error.toLowerCase()

  // ── Authentication ────────────────────────────────────────────────────────
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid api key') || lower.includes('authentication')) {
    const envVarMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      minimax: 'MINIMAX_API_KEY',
      qwen: 'DASHSCOPE_API_KEY',
      doubao: 'ARK_API_KEY',
      glm: 'ZHIPUAI_API_KEY',
      openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
    }
    const envVar = provider ? (envVarMap[provider] ?? 'API_KEY') : 'API_KEY'
    return {
      title: 'API Key 无效或未设置',
      detail: error,
      action: `请检查: ${envVar} 环境变量是否正确设置\n  运行: /doctor 诊断配置`,
    }
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return {
      title: '请求频率超限 (429)',
      detail: error,
      action: '正在自动重试（指数退避）...\n  如频繁出现，请考虑切换模型: /model',
    }
  }

  // ── Overloaded ────────────────────────────────────────────────────────────
  if (lower.includes('529') || lower.includes('overloaded')) {
    return {
      title: 'API 服务过载 (529)',
      detail: error,
      action: '正在自动重试，服务临时繁忙。如需立即响应，可切换到其他 provider: /model',
    }
  }

  // ── Quota/billing ─────────────────────────────────────────────────────────
  if (lower.includes('403') || lower.includes('forbidden') || lower.includes('quota') || lower.includes('billing')) {
    return {
      title: '访问被拒绝 (403)',
      detail: error,
      action: '可能是 API 额度已用完或账户未激活。请检查账户状态，或切换到其他 provider: /model',
    }
  }

  // ── Network ───────────────────────────────────────────────────────────────
  if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('network') ||
      lower.includes('etimedout') || lower.includes('socket hang up') || lower.includes('fetch failed')) {
    return {
      title: '网络连接失败',
      detail: error,
      action: '请检查网络连接。如使用代理，确保代理设置正确。\n  运行: /doctor 检查环境',
    }
  }

  // ── Context length ────────────────────────────────────────────────────────
  if (lower.includes('context length') || lower.includes('token') || lower.includes('too long')) {
    return {
      title: '上下文长度超限',
      detail: error,
      action: '运行 /compact 压缩对话历史，或 /clear 开始新会话',
    }
  }

  // ── Timeout ───────────────────────────────────────────────────────────────
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      title: '请求超时',
      detail: error,
      action: '可能是服务响应慢，正在重试。使用 --max-tokens 减少输出长度可缓解超时。',
    }
  }

  // ── Model not found ───────────────────────────────────────────────────────
  if (lower.includes('model') && (lower.includes('not found') || lower.includes('does not exist'))) {
    return {
      title: '模型不存在',
      detail: error,
      action: '运行 /model 查看可用模型列表并切换到有效的模型',
    }
  }

  // ── Generic ───────────────────────────────────────────────────────────────
  return {
    title: 'API 错误',
    detail: error,
    action: '运行 /doctor 进行环境诊断，或切换模型重试: /model',
  }
}

export function formatErrorMessage(error: string, provider?: string): string {
  const guidance = getErrorGuidance(error, provider)
  const parts = [`⚠ ${guidance.title}`]
  if (guidance.detail && guidance.detail !== guidance.title) {
    parts.push(`  ${guidance.detail.slice(0, 120)}`)
  }
  if (guidance.action) {
    parts.push(`  → ${guidance.action}`)
  }
  return parts.join('\n')
}
