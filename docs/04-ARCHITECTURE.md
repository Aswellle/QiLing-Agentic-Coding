# 启灵 (QiLing) — 技术架构文档

> **版本**: v1.1 | **日期**: 2026-05-01 | **状态**: 权威版本（替代根目录草稿）

---

## 1. 架构原则

1. **流式优先** — 所有 AI 响应通过 AsyncGenerator 流式传递，零等待感
2. **工具即插件** — 工具系统完全解耦，实现 `Tool<TInput>` 接口即可注册
3. **Provider 无关** — AI 服务通过统一 `Provider` 接口抽象，运行时可切换
4. **权限最小化** — 所有副作用操作（写文件、执行命令）默认需确认
5. **本地优先** — 无网络依赖的功能（设置、历史、工具调用）不需要 API Key
6. **可测试性** — 核心逻辑（query loop、permission rules、tool execution）与 UI 解耦

---

## 2. 系统分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      用户层 (User Layer)                         │
│   终端输入 → TUI 渲染 → 键盘事件 → 斜杠命令                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     应用层 (Application Layer)                   │
│                                                                   │
│  ┌────────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  REPL.tsx      │    │  Commands    │    │  StartupBanner   │  │
│  │  (主循环 UI)   │◄───│  (/commit    │    │  (ASCII 艺术字)  │  │
│  │                │    │  /review     │    └──────────────────┘  │
│  │  状态管理      │    │  /init ...)  │                           │
│  │  权限弹窗      │    └──────────────┘                           │
│  └────────┬───────┘                                               │
└───────────│─────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────┐
│                   业务层 (Business Layer)                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Query Engine (query.ts)                │    │
│  │                                                           │    │
│  │  stream() ──→ text_delta ──→ UI                          │    │
│  │           ──→ tool_use   ──→ PermissionCheck             │    │
│  │                                ──→ ToolExecutor          │    │
│  │                                ──→ tool_result           │    │
│  │           ──→ stop       ──→ usage tracking              │    │
│  │  max_turns: 20 | max_tokens recovery | retry backoff     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────┐  ┌───────────────┐  ┌─────────────────┐   │
│  │ Permission System│  │ Tool Registry │  │ History Manager │   │
│  │ (glob rules +    │  │ (Map<string,  │  │ (JSONL per      │   │
│  │  risk classify)  │  │  Tool>)       │  │  session)       │   │
│  └──────────────────┘  └───────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │                              │
┌───────────▼──────────┐    ┌─────────────▼─────────────────────┐
│   Provider Layer      │    │         Tool Layer                 │
│                       │    │                                    │
│  ┌──────────────────┐ │    │  FileRead  FileEdit  FileWrite     │
│  │ AnthropicProvider│ │    │  Glob      Grep      Bash          │
│  │ OpenAICompatProv │ │    │  PowerShell Agent    WebFetch      │
│  │  └─ MiniMax     │ │    │  TodoWrite NotebookRead McpTool    │
│  │  └─ OpenAI      │ │    │                                    │
│  │  └─ Gemini      │ │    │  [每个工具: name/desc/schema/      │
│  └──────────────────┘ │    │   call()/checkPerms()/toDef()]    │
└───────────────────────┘    └────────────────────────────────────┘
            │
┌───────────▼───────────────────────────────────────────────────┐
│                Infrastructure Layer                            │
│  Settings (JSON 文件)  |  System Prompt Builder               │
│  Memory Files (walk-up)|  MCP Client (stdio/SSE)              │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. 核心数据流

### 3.1 正常对话流程

```
用户输入 "帮我重构 auth.ts"
  │
  ▼
PromptInput.onSubmit(text)
  │
  ▼
REPL.handleSubmit(text)
  ├── push { role: 'user', content: text } → messages[]
  └── runAIQuery(newMessages)
        │
        ▼
      query.ts: runQuery(messages, tools, provider, permissions)
        │
        ├── provider.stream(messages, toolDefs, {systemPrompt})
        │     └── AsyncGenerator<StreamChunk>
        │           ├── {type:'text_delta', text} → onTextDelta → UI
        │           ├── {type:'tool_use_start', id, name} → onToolStart → UI
        │           ├── {type:'tool_use_delta', ...} → 累积 JSON
        │           ├── {type:'tool_use_stop'} → 解析完整 input
        │           └── {type:'stop', usage} → onUsageUpdate
        │
        ├── for each tool_use:
        │     ├── permissions.check(toolName, input)
        │     │     ├── AUTO_ALLOW → 直接执行
        │     │     ├── DENY → 返回错误给 AI
        │     │     └── ASK → onPermissionRequest → 等待用户
        │     │
        │     └── tool.call(input, context)
        │           └── ToolResult{content[], isError}
        │
        ├── push tool_results as user message
        └── 递归调用 (直到 stop_reason='end_turn' 或 maxRounds)
```

### 3.2 流式输出渲染时序

```
时间轴:
  t=0   │ [用户按 Enter]
  t=100ms│ API 请求发出
  t=300ms│ 首个 text_delta → streamingText 更新 → Ink re-render
  t=400ms│ tool_use_start(FileRead, ...) → toolCalls[] 新增
  t=500ms│ tool_use 累积 input JSON
  t=600ms│ tool_use_stop → 执行 FileRead → ✓ done
  t=700ms│ 继续 text_delta → 响应追加
  t=2000ms│ stop → isStreaming=false → 最终消息持久化到 messages[]
```

---

## 4. 关键模块设计

### 4.1 工具接口规范（完整版）

```typescript
interface Tool<TInput = Record<string, unknown>> {
  // 标识
  name: string                              // 唯一名，用于权限规则匹配
  description: string                       // 展示给 AI 的描述
  inputSchema: ZodType<TInput, ZodTypeDef, unknown>

  // 核心
  call(input: TInput, ctx: ToolContext): Promise<ToolResult>

  // 权限（可选，覆盖默认行为）
  checkPermissions?(input: TInput): PermissionDecision | Promise<PermissionDecision>

  // AI 接口定义
  toDefinition(): ToolDefinition

  // UI 渲染（可选，自定义工具调用展示）
  renderToolUse?(input: TInput): React.ReactNode
  renderToolResult?(result: ToolResult, input: TInput): React.ReactNode
}

interface ToolContext {
  workingDir: string      // 工具执行的基础目录
  sessionId: string       // 用于隔离 session 级状态（TodoWrite 等）
  onProgress?: (msg: string) => void  // 进度回调
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}
```

### 4.2 Provider 接口规范

```typescript
interface Provider {
  config: ProviderConfig

  // 流式对话（核心）
  stream(
    messages: Message[],
    tools: ToolDefinition[],
    options?: StreamOptions
  ): AsyncGenerator<StreamChunk>

  // 辅助
  countTokens(messages: Message[]): number      // 估算（不需精确）
  getContextWindow(): number                     // 模型上下文窗口大小
}

type StreamChunk =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; id: string; inputDelta: string }
  | { type: 'tool_use_stop'; id: string }
  | { type: 'stop'; stopReason: string; usage: TokenUsage }
  | { type: 'error'; error: string }
```

### 4.3 Query Engine 状态机（目标 v0.2）

```
状态: IDLE → REQUESTING → STREAMING → TOOL_EXECUTING → [PERMISSION_WAIT] → STREAMING
                                                    ↓
                                              ERROR (retry logic)
                                                    ↓
                              RETRY_WAIT (指数退避) → REQUESTING
                                                    ↓
                              MAX_RETRIES_EXCEEDED → ERROR → IDLE

关键状态转换:
  IDLE          → REQUESTING:    用户提交输入
  REQUESTING    → STREAMING:     API 首个 chunk 到达
  STREAMING     → TOOL_EXECUTING: tool_use_stop 触发
  TOOL_EXECUTING→ PERMISSION_WAIT: need_confirm 权限
  PERMISSION_WAIT→TOOL_EXECUTING: 用户选择后
  TOOL_EXECUTING→ STREAMING:      工具结果注入，继续流
  STREAMING     → IDLE:           stop_reason='end_turn'
  任意状态      → RETRY_WAIT:     429/529/503
  任意状态      → IDLE:           Ctrl+C 中断
```

---

## 5. 目录结构（目标状态）

```
qiling/
├── src/
│   ├── main.tsx                    # CLI 入口（commander）
│   │
│   ├── query.ts                    # 核心查询引擎（状态机 + 重试）
│   │
│   ├── types/                      # 共享 TypeScript 类型
│   │   ├── message.ts              # Message、ContentBlock、TokenUsage
│   │   ├── tool.ts                 # Tool 接口、PermissionDecision
│   │   ├── provider.ts             # Provider 接口、StreamChunk
│   │   └── index.ts
│   │
│   ├── components/                 # Ink TUI 组件
│   │   ├── App.tsx                 # 根组件（状态 + context）
│   │   ├── REPL.tsx                # 主 REPL（消息列表 + 输入 + 权限弹窗）
│   │   ├── StartupBanner.tsx       # ASCII 艺术字启动画面
│   │   ├── Message.tsx             # 消息气泡（含 markdown 渲染）
│   │   ├── ToolCallDisplay.tsx     # 工具调用状态（running/done/error）
│   │   ├── DiffView.tsx            # ★ FileEdit diff 可视化
│   │   ├── PermissionDialog.tsx    # 权限确认弹窗
│   │   ├── CostDisplay.tsx         # ★ token 成本实时展示
│   │   ├── PromptInput.tsx         # 输入框 + /命令补全
│   │   ├── StatusBar.tsx           # 底部状态栏
│   │   └── CommandMenu.tsx         # / 命令下拉菜单
│   │
│   ├── providers/                  # AI Provider 实现
│   │   ├── interface.ts            # Provider 抽象接口
│   │   ├── anthropic.ts            # Anthropic Claude（官方 SDK）
│   │   ├── openai-compat.ts        # OpenAI 兼容（MiniMax/OpenAI/Gemini）
│   │   ├── qwen.ts                 # ★ 阿里云通义千问
│   │   ├── doubao.ts               # ★ 字节跳动 Doubao
│   │   ├── glm.ts                  # ★ 智谱 GLM
│   │   ├── ollama.ts               # ★ 本地 Ollama
│   │   └── index.ts                # Provider 工厂
│   │
│   ├── tools/                      # 工具实现
│   │   ├── FileReadTool.ts
│   │   ├── FileEditTool.ts
│   │   ├── FileWriteTool.ts
│   │   ├── GlobTool.ts
│   │   ├── GrepTool.ts
│   │   ├── BashTool.ts
│   │   ├── PowerShellTool.ts
│   │   ├── AgentTool.ts
│   │   ├── WebFetchTool.ts
│   │   ├── TodoWriteTool.ts
│   │   ├── NotebookReadTool.ts
│   │   ├── McpTool.ts              # MCP 服务器桥接
│   │   ├── ★ LspTool.ts            # 语言服务器诊断（P1）
│   │   └── index.ts
│   │
│   ├── commands/                   # 斜杠命令
│   │   ├── index.ts                # 命令注册表 + CommandContext
│   │   ├── model.ts                # /model 模型列表和切换
│   │   └── ★ plan.ts               # /plan Plan/Act 模式（P1）
│   │
│   ├── permissions/                # 权限系统
│   │   ├── manager.ts              # PermissionsManager
│   │   ├── rules.ts                # glob 规则解析和评估
│   │   └── ★ classifier.ts         # Bash 命令风险分类（23种检查）
│   │
│   ├── settings/                   # 配置系统
│   │   ├── schema.ts               # Zod schema（含 mcpServers）
│   │   ├── loader.ts               # 4 层优先级合并
│   │   └── index.ts
│   │
│   ├── history/
│   │   └── manager.ts              # JSONL 对话历史
│   │
│   ├── compact/                    # ★ 上下文压缩引擎（P0）
│   │   ├── engine.ts               # 主压缩算法
│   │   ├── microcompact.ts         # 轻量级工具调用摘要
│   │   └── index.ts
│   │
│   ├── retry/                      # ★ API 重试机制（P0）
│   │   └── withRetry.ts            # 指数退避、错误分类
│   │
│   └── utils/
│       ├── systemPrompt.ts         # 系统提示构建（含记忆注入）
│       ├── markdown.ts             # 终端 Markdown 渲染
│       ├── git.ts                  # Git 操作辅助
│       ├── platform.ts             # 平台检测
│       ├── tokens.ts               # token 计数（含成本估算）
│       └── env.ts                  # 环境变量工具
│
├── tests/                          # ★ 测试（P0，目前缺失）
│   ├── unit/
│   │   ├── permissions/rules.test.ts
│   │   ├── tools/FileEditTool.test.ts
│   │   ├── query.test.ts
│   │   └── settings/loader.test.ts
│   └── integration/
│       └── provider.test.ts
│
├── docs/                           # 技术文档（本目录）
│   ├── 01-PRD.md
│   ├── 02-COMPETITIVE-ANALYSIS.md
│   ├── 03-GAP-ANALYSIS.md
│   ├── 04-ARCHITECTURE.md         # 本文件
│   ├── 05-DEVELOPMENT-ROADMAP.md
│   ├── 06-SECURITY-MODEL.md
│   └── 07-TESTING-STRATEGY.md
│
├── DESIGN.md                       # 产品设计概览（根目录入口文档）
├── ARCHITECTURE.md                 # 架构概览（指向 docs/04）
├── package.json
├── tsconfig.json
└── bunfig.toml
```

★ 标记 = 尚未实现

---

## 6. 技术栈决策记录（ADR）

### ADR-001: 运行时选择 Bun

**决策**: 使用 Bun 1.x 作为运行时和构建工具  
**理由**:
- `bun build --compile` 生成单二进制，零外部依赖安装
- 原生 TypeScript/TSX，无需 tsc+rollup 流水线
- Bun.spawn() 替代 execa，减少依赖
- 4x 快于 Node.js 启动时间（300ms → 80ms）
**权衡**: 与 Node.js 生态不完全兼容，个别 npm 包需要 polyfill

### ADR-002: TUI 框架 Ink 5.x

**决策**: 使用 Ink 5.x (React for terminal)  
**理由**:
- Claude Code 同款，已被行业验证
- 组件化开发，状态管理清晰
- React 生态（useState、useReducer、useEffect）
**权衡**: 相比 Blessed 上层封装更高，自定义复杂布局较困难

### ADR-003: AI 抽象层设计

**决策**: Provider 接口 + AsyncGenerator 流式  
**理由**:
- 统一接口屏蔽 Anthropic/OpenAI/国产模型差异
- AsyncGenerator 天然对应 SSE 流式响应
- 运行时 provider 切换无需重启
**权衡**: OpenAI 兼容层需要额外的消息格式转换（ContentBlock → OpenAI tool messages）

### ADR-004: 配置存储方案

**决策**: JSON 文件（`~/.qiling/settings.json` + `.qiling/settings.json`）  
**理由**:
- 用户可直接编辑，无需专用 CLI
- 与 Claude Code 配置文件格式兼容
- 无额外数据库依赖
**权衡**: 无法做热更新检测（需重启生效）

---

## 7. 性能设计目标

| 指标 | 目标值 | 当前状态 | 优化方向 |
|---|---|---|---|
| 冷启动时间 | < 500ms | ~800ms（含 figlet）| figlet 预渲染缓存 |
| 首个 token 延迟 | < 100ms (本地网络) | 取决于 API | — |
| TUI 渲染帧率 | ≥ 30fps | Ink 默认 | 减少不必要 re-render |
| 内存占用（空闲）| < 50MB | ~60MB | 延迟加载 |
| 内存占用（活跃）| < 200MB | — | 流式处理防堆积 |
| 单二进制大小 | < 30MB | 未构建 | tree-shaking |
