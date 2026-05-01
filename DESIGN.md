# 启灵 (QiLing) — 产品设计文档

> 版本：0.1.0 | 状态：设计冻结 | 日期：2026-05-01

---

## 1. 产品定位

**启灵 (QiLing)** 是一款面向开发者的终端编程代理工具。它在终端中运行，具备完整的 TUI 界面，通过 AI 模型理解代码库、编辑文件、执行命令，自主完成复杂的编程任务。

**核心理念：**
- **透明可控** — 每一个工具调用、每一次文件修改都明确展示，用户始终知道代理在做什么
- **多模型支持** — 不绑定单一 AI 服务商，支持 Anthropic、OpenAI、Google Gemini、本地 Ollama
- **终端原生** — 快速、轻量、键盘驱动，不依赖 GUI
- **中文友好** — 界面、文档、提示词均支持中文；同时完整支持英文
- **可扩展** — 支持 MCP 协议扩展工具能力

**对标参考：**
| 工具 | 优点参考 | 问题规避 |
|---|---|---|
| Claude Code | TUI 设计、工具系统、查询循环 | 锁定 Anthropic |
| Aider | Git 感知、diff 展示 | Python 生态隔离 |
| Cline | Plan & Act 模式 | 仅 VSCode 扩展 |
| Codex CLI | 沙箱执行、流式输出 | 锁定 OpenAI |
| Goose | Toolkit 扩展机制 | 启动慢 |

---

## 2. 功能范围（v0.1.0 MVP）

### 2.1 必须有（P0）
- [ ] 终端启动：`qiling` 命令在当前目录启动代理
- [ ] 启动画面：QiLing ASCII 艺术字 + Provider/Model/Endpoint 信息
- [ ] 对话循环：流式输出 AI 响应
- [ ] 文件工具：Read、Write、Edit（精确字符串替换）、Glob、Grep
- [ ] Shell 工具：Bash（Unix）/ PowerShell（Windows）
- [ ] 权限系统：工具执行前征求用户确认，支持 Allow/Deny/Always Allow
- [ ] 斜杠命令：/help、/clear、/exit、/model、/compact
- [ ] 设置系统：`~/.qiling/settings.json` + 项目级 `.qiling/settings.json`
- [ ] 对话历史：本地持久化，重启可恢复

### 2.2 应该有（P1）
- [ ] Agent 工具：启动子代理执行独立任务
- [ ] TodoWrite 工具：任务跟踪
- [ ] WebFetch 工具：获取网页内容
- [ ] /memory 命令：查看/编辑记忆文件
- [ ] /config 命令：修改配置
- [ ] 上下文压缩：自动 compact 长对话
- [ ] 多 Provider：OpenAI、Google Gemini 适配器
- [ ] Token 使用统计：实时显示 context 使用量

### 2.3 未来规划（P2）
- [ ] MCP 协议支持：连接外部 MCP 服务器
- [ ] Ollama 本地模型支持
- [ ] 计划模式（Plan Mode）：先规划再执行
- [ ] Vim 键位模式
- [ ] 语音输入
- [ ] 远程会话桥接

---

## 3. 用户体验设计

### 3.1 启动画面

```
╔══════════════════════════════════════════════════════════════╗

   ██████╗ ██╗██╗     ██╗███╗   ██╗ ██████╗
  ██╔═══██╗██║██║     ██║████╗  ██║██╔════╝
  ██║   ██║██║██║     ██║██╔██╗ ██║██║  ███╗
  ██║▄▄ ██║██║██║     ██║██║╚██╗██║██║   ██║
  ╚██████╔╝██║███████╗██║██║ ╚████║╚██████╔╝
   ╚══▀▀═╝ ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝

  启 灵 编 程 代 理  ·  QiLing Programming Agent  v0.1.0

  Provider ›  Anthropic Claude
  Model    ›  claude-sonnet-4-6
  Endpoint ›  https://api.anthropic.com

  /help  /model  /config  /memory  /compact  /clear  /exit

  当前目录: D:\MyProject
╚══════════════════════════════════════════════════════════════╝

> 
```

ASCII 艺术字使用 `figlet` 渲染，通过 `gradient-string` 应用青色→蓝色渐变。

### 3.2 对话界面

```
╭─ user ──────────────────────────────────────────╮
│ 帮我重构 src/auth.ts 中的 validateToken 函数      │
╰──────────────────────────────────────────────────╯

╭─ assistant ──────────────────────────────────────╮
│ 我来分析 validateToken 函数并重构它。             │
│                                                    │
│ ⟳ FileRead: src/auth.ts                           │
│   ✓ 读取完成 (342 行)                              │
│                                                    │
│ ⟳ FileEdit: src/auth.ts                           │
│   ✓ 已替换 validateToken 实现                      │
│                                                    │
│ 重构完成。主要变更：                               │
│ 1. 提取了 JWT 解析逻辑到独立函数                   │
│ 2. 添加了过期时间检查                              │
│ 3. 改善了错误消息                                  │
╰──────────────────────────────────────────────────╯

╭─ tool call ──────────────────────────────────────╮
│ ● FileEdit  src/auth.ts                           │
│   old: export function validateToken(token: str... │
│   new: export async function validateToken(toke... │
│   [展开查看完整 diff]                              │
╰──────────────────────────────────────────────────╯

[↑↓ 滚动] [Enter 发送] [Ctrl+C 退出] [/ 命令]
> █
```

### 3.3 工具执行展示

工具调用分三种状态显示：
- `⟳ ToolName: args...` — 执行中（黄色 spinner）
- `✓ ToolName: args...` — 成功（绿色）
- `✗ ToolName: args...` — 失败（红色）

需要权限确认时展示对话框：
```
╭─ 权限请求 ───────────────────────────────────────╮
│ ⚠  Bash 请求执行以下命令:                        │
│                                                    │
│   npm run build                                    │
│                                                    │
│  [Y] 允许  [N] 拒绝  [A] 始终允许  [D] 始终拒绝  │
╰──────────────────────────────────────────────────╯
```

### 3.4 斜杠命令提示

输入 `/` 时展示命令提示列表：

```
╭─ 命令 ───────────────────────────────────────────╮
│ /help    显示帮助信息                             │
│ /model   切换 AI 模型                             │
│ /config  查看/修改配置                            │
│ /memory  查看/编辑记忆文件                        │
│ /compact 压缩对话上下文                           │
│ /clear   清空当前对话                             │
│ /exit    退出                                     │
╰──────────────────────────────────────────────────╯
```

---

## 4. 工具系统设计

每个工具实现 `Tool` 接口，具备：
- `name`、`description`、`inputSchema`（Zod schema）
- `call(input, context)` — 异步执行，返回结果
- `checkPermissions(input)` — 返回 allow/deny/ask
- `renderToolUse(input)` — TUI 渲染（Ink 组件）
- `renderToolResult(result)` — 结果渲染

### 工具列表

| 工具 | 描述 | 权限级别 |
|---|---|---|
| FileRead | 读取文件内容（支持图片） | 自动允许 |
| FileWrite | 写入新文件 | 需确认 |
| FileEdit | 精确字符串替换编辑 | 需确认 |
| Glob | 文件模式匹配 | 自动允许 |
| Grep | 内容搜索（ripgrep） | 自动允许 |
| Bash | 执行 shell 命令（Unix） | 需确认 |
| PowerShell | 执行 PS 命令（Windows） | 需确认 |
| Agent | 启动子代理 | 需确认 |
| TodoWrite | 写入任务列表 | 自动允许 |
| WebFetch | 获取 URL 内容 | 需确认 |

---

## 5. 设置系统

配置优先级（高 → 低）：
1. 命令行参数（`--model`、`--api-key` 等）
2. 项目配置 `.qiling/settings.json`（当前目录向上查找）
3. 用户全局配置 `~/.qiling/settings.json`
4. 内置默认值

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "apiKey": "",
  "endpoint": "https://api.anthropic.com",
  "maxTokens": 8096,
  "permissions": {
    "allow": [],
    "deny": []
  },
  "tools": {
    "bash": { "enabled": true },
    "webFetch": { "enabled": true }
  },
  "ui": {
    "theme": "auto",
    "language": "zh-CN",
    "streamingOutput": true
  },
  "memory": {
    "enabled": true,
    "files": ["~/.qiling/memory/*.md", ".qiling/memory/*.md"]
  }
}
```

---

## 6. 权限系统

权限规则格式（与 Claude Code 兼容）：

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm run *)",
      "FileEdit(*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)"
    ]
  }
}
```

权限决策流程：
```
工具调用
  ↓
检查 deny 规则 → 匹配 → 拒绝（告知用户）
  ↓ 不匹配
检查 allow 规则 → 匹配 → 执行
  ↓ 不匹配
askPermission → 用户确认
  ↓
记录决策（session 内/永久）
```

---

## 7. 记忆系统

启灵支持层级记忆文件（Markdown 格式）：

1. **全局记忆** `~/.qiling/QILING.md` — 用户级指令、偏好
2. **项目记忆** `.qiling/QILING.md` — 项目特定上下文
3. **项目记忆** `CLAUDE.md` — 兼容 Claude Code 的项目记忆

每次对话开始时，自动读取并注入为 system prompt 的一部分。

---

## 8. 上下文压缩

当 token 使用率超过 80% 时，自动触发（或用户手动 `/compact`）：
1. 调用 AI 对历史对话进行摘要压缩
2. 保留最近 N 轮完整对话
3. 显示压缩比率和节省的 tokens
