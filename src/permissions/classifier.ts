/** Risk levels for shell commands */
export type RiskLevel = 'high' | 'medium' | 'low' | 'safe'

export interface ClassificationResult {
  level: RiskLevel
  reason: string
  checkId: number
}

/**
 * 23-category bash command risk classifier (adapted from Claude Code bashSecurity.ts).
 * Returns the highest-risk classification found, or 'safe' if none match.
 */
export function classifyBashCommand(command: string): ClassificationResult {
  const lower = command.toLowerCase()

  // ─── HIGH RISK — Always warn prominently ──────────────────────────────────

  if (/rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\s+[/~]/.test(command) ||
      /rm\s+-rf\s*\//.test(command) ||
      /rm\s+-rf\s*~/.test(command)) {
    return { level: 'high', reason: '删除根目录或家目录 (rm -rf / 或 rm -rf ~)', checkId: 1 }
  }

  if (/\b(mkfs|fdisk|dd\s+if=\/dev\/zero|dd\s+if=\/dev\/urandom)\b/.test(lower)) {
    return { level: 'high', reason: '磁盘格式化或破坏性磁盘操作', checkId: 2 }
  }

  if (/\|\s*(bash|sh|zsh|fish|dash)\b/.test(command) ||
      /curl\s+.*\|\s*(bash|sh)/.test(lower) ||
      /wget\s+.*\|\s*(bash|sh)/.test(lower)) {
    return { level: 'high', reason: '从网络下载并直接执行脚本 (curl/wget | bash)', checkId: 3 }
  }

  if (/\bdrop\s+table\b/i.test(command) ||
      /\bdrop\s+database\b/i.test(command) ||
      /\bdelete\s+from\b.*\bwhere\s+1\s*=\s*1\b/i.test(command) ||
      /\btruncate\s+table\b/i.test(command)) {
    return { level: 'high', reason: '数据库破坏性操作 (DROP TABLE/DATABASE, DELETE WHERE 1=1)', checkId: 4 }
  }

  if (/git\s+push\s+.*--force\b/.test(command) ||
      /git\s+push\s+-f\b/.test(command)) {
    return { level: 'high', reason: 'git force push — 可能覆盖远端历史', checkId: 5 }
  }

  if (/git\s+reset\s+--hard\b/.test(command)) {
    return { level: 'high', reason: 'git reset --hard — 丢弃所有未提交变更', checkId: 6 }
  }

  if (/git\s+clean\s+.*-f/.test(command)) {
    return { level: 'high', reason: 'git clean -f — 永久删除未跟踪文件', checkId: 7 }
  }

  if (/\bchmod\s+(777|a\+rwx)\b/.test(command)) {
    return { level: 'high', reason: 'chmod 777 — 全局可写权限，安全隐患', checkId: 8 }
  }

  if (/\bsudo\s+(rm|chmod|chown|dd|mkfs)\b/.test(lower)) {
    return { level: 'high', reason: '以 root 权限执行破坏性命令', checkId: 9 }
  }

  // ─── MEDIUM RISK — Warn and confirm ──────────────────────────────────────

  if (/\brm\s+.*(-[a-z]*r|-r[a-z]*)/.test(command) && !command.includes('/dev/null')) {
    return { level: 'medium', reason: '递归删除目录 (rm -r)', checkId: 10 }
  }

  if (/\bgit\s+push\b/.test(command) && !/git push --dry-run/.test(command)) {
    return { level: 'medium', reason: 'git push — 推送到远端仓库', checkId: 11 }
  }

  if (/\bnpm\s+publish\b/.test(lower) || /\bbun\s+publish\b/.test(lower)) {
    return { level: 'medium', reason: '发布包到 npm 注册表', checkId: 12 }
  }

  if (/\bdocker\s+(rm|rmi|volume rm|container rm)\b/.test(lower)) {
    return { level: 'medium', reason: '删除 Docker 容器/镜像/卷', checkId: 13 }
  }

  if (/\bkill\s+(-9|-SIGKILL)\b/.test(command) ||
      /\bkillall\b/.test(lower)) {
    return { level: 'medium', reason: '强制终止进程', checkId: 14 }
  }

  if (/\bpkill\b/.test(lower) || /\bkill\s+-\d/.test(command)) {
    return { level: 'medium', reason: '发送信号给进程', checkId: 15 }
  }

  if (/\bsystemctl\s+(stop|disable|kill|mask)\b/.test(lower) ||
      /\bservice\s+\w+\s+stop\b/.test(lower)) {
    return { level: 'medium', reason: '停止系统服务', checkId: 16 }
  }

  if (/\bsudo\b/.test(lower)) {
    return { level: 'medium', reason: '以 sudo (root) 权限执行命令', checkId: 17 }
  }

  if (/\b(aws|gcloud|az)\s+.*\s+(delete|destroy|terminate|remove)\b/i.test(command)) {
    return { level: 'medium', reason: '云服务删除/销毁操作', checkId: 18 }
  }

  if (/\bterraform\s+(destroy|apply)\b/.test(lower)) {
    return { level: 'medium', reason: 'Terraform destroy/apply — 变更基础设施', checkId: 19 }
  }

  if (/\bheroku\s+.*delete\b/.test(lower) ||
      /\bfly\s+.*destroy\b/.test(lower)) {
    return { level: 'medium', reason: '删除云应用', checkId: 20 }
  }

  // ─── LOW RISK — Informational warning only ───────────────────────────────

  if (/\bgit\s+commit\b/.test(command)) {
    return { level: 'low', reason: 'git commit — 创建提交', checkId: 21 }
  }

  if (/\bnpm\s+install\b|\bbun\s+install\b|\bpip\s+install\b/.test(lower)) {
    return { level: 'low', reason: '安装包依赖', checkId: 22 }
  }

  if (/\brm\s/.test(command) && !command.includes('-r')) {
    return { level: 'low', reason: '删除文件 (rm，非递归)', checkId: 23 }
  }

  return { level: 'safe', reason: '', checkId: 0 }
}

/** Convenience: return true if the command is high or medium risk */
export function isDestructive(command: string): boolean {
  const { level } = classifyBashCommand(command)
  return level === 'high' || level === 'medium'
}
