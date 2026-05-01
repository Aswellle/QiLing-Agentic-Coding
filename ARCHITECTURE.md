# 启灵 (QiLing) — 技术架构文档

> 版本：0.1.0 | 技术栈：Bun + TypeScript + Ink (React) | 日期：2026-05-01

---

## 1. 技术栈决策

| 层次 | 选型 | 理由 |
|---|---|---|
| **运行时** | Bun 1.x | 原生 TypeScript、单二进制编译（`bun build --compile`）、4x 快于 Node、内置 test runner |
| **TUI 框架** | Ink 5.x + React 18 | Claude Code 已验证可行、组件化、丰富的终端渲染 API |
| **ASCII 艺术** | figlet + gradient-string | figlet 字体多且成熟；gradient-string 提供终端颜色渐变 |
| **AI SDK** | @anthropic-ai/sdk（主）+ 适配器 | 官方 SDK 质量高；适配器抽象支持多 Provider |
| **CLI 解析** | commander | 成熟稳定，与 Claude Code 同款 |
| **Schema 校验** | zod | 运行时类型安全，与 TypeScript 类型推断完美集成 |
| **Shell 执行** | Bun.spawn() | Bun 原生 API，无需 execa |
| **文件操作** | Bun.file() + Node fs API | Bun 原生 + Node 兼容层 |
| **配置存储** | JSON 文件（手动管理） | 简单透明，用户可直接编辑 |
| **代码搜索** | 内置 ripgrep（via PATH）| 与 Claude Code 一致，性能最优 |

---

## 2. 系统架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    qiling (CLI entry)                   │
│                      main.tsx                           │
│           Commander.js argument parsing                 │
└───────────────────────┬─────────────────────────────────┘
                        │
           ┌────────────┼────────────┐
           │            │            │
    ┌──────▼─────┐ ┌────▼────┐ ┌────▼──────┐
    │  REPL Mode │ │SDK Mode │ │ MCP Mode  │
    │ (default)  │ │ (--sdk) │ │ (--mcp)   │
    └──────┬─────┘ └─────────┘ └───────────┘
           │
    ┌──────▼──────────────────────────────────────┐
    │              Ink TUI (React)                │
    │   App.tsx → REPL.tsx → PromptInput.tsx      │
    │   StartupBanner + Messages + ToolCalls      │
    └──────┬──────────────────────────────────────┘
           │ user input
    ┌──────▼──────────────────────────────────────┐
    │           Query Engine (query.ts)           │
    │  ┌──────────────────────────────────────┐   │
    │  │  streaming API call → tool loop      │   │
    │  │  → auto-compact → token budget       │   │
    │  └──────────────────────────────────────┘   │
    └──────┬───────────────────────┬──────────────┘
           │                       │
    ┌──────▼───────┐      ┌────────▼──────────┐
    │  AI Provider │      │   Tool Executor   │
    │  (providers/)│      │   (tools.ts)      │
    │  ┌─────────┐ │      │  ┌─────────────┐  │
    │  │Anthropic│ │      │  │ FileRead    │  │
    │  │OpenAI   │ │      │  │ FileWrite   │  │
    │  │Gemini   │ │      │  │ FileEdit    │  │
    │  │Ollama   │ │      │  │ Glob/Grep   │  │
    │  └─────────┘ │      │  │ Bash/PS     │  │
    └──────────────┘      │  │ Agent       │  │
                          │  │ WebFetch    │  │
                          │  └─────────────┘  │
                          └───────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │ Permission System  │
                          │  (permissions/)   │
                          │  rules + classifier│
                          └───────────────────┘
```

---

## 3. 目录结构

```
qiling/
├── src/
│   ├── main.tsx                 # CLI 入口，Commander 解析
│   ├── repl.tsx                 # REPL 模式启动器（Ink render）
│   ├── query.ts                 # AI 查询引擎（核心循环）
│   ├── tools.ts                 # 工具注册表
│   ├── commands.ts              # 斜杠命令注册表
│   │
│   ├── types/
│   │   ├── message.ts           # Message、Role、ContentBlock 类型
│   │   ├── tool.ts              # Tool 接口和基础类型
│   │   ├── provider.ts          # Provider 接口类型
│   │   └── index.ts             # 统一导出
│   │
│   ├── components/
│   │   ├── App.tsx              # 根组件，状态管理
│   │   ├── StartupBanner.tsx    # ASCII 艺术字 + Provider 信息
│   │   ├── REPL.tsx             # 主 REPL 组件
│   │   ├── PromptInput.tsx      # 输入框 + 斜杠命令提示
│   │   ├── Message.tsx          # 消息渲染（用户/助手）
│   │   ├── ToolCallDisplay.tsx  # 工具调用状态展示
│   │   ├── PermissionDialog.tsx # 权限确认弹窗
│   │   ├── StatusBar.tsx        # 底部状态栏（token、model）
│   │   └── CommandMenu.tsx      # / 命令下拉菜单
│   │
│   ├── providers/
│   │   ├── interface.ts         # Provider 抽象接口
│   │   ├── anthropic.ts         # Anthropic Claude
│   │   ├── openai.ts            # OpenAI GPT（P1）
│   │   ├── gemini.ts            # Google Gemini（P1）
│   │   ├── ollama.ts            # Local Ollama（P2）
│   │   └── index.ts             # Provider 工厂
│   │
│   ├── tools/
│   │   ├── FileReadTool.ts
│   │   ├── FileWriteTool.ts
│   │   ├── FileEditTool.ts
│   │   ├── GlobTool.ts
│   │   ├── GrepTool.ts
│   │   ├── BashTool.ts          # Unix shell
│   │   ├── PowerShellTool.ts    # Windows PowerShell
│   │   ├── AgentTool.ts         # 子代理
│   │   ├── TodoWriteTool.ts     # 任务追踪
│   │   └── WebFetchTool.ts      # HTTP 获取
│   │
│   ├── commands/
│   │   ├── help.ts
│   │   ├── clear.ts
│   │   ├── exit.ts
│   │   ├── model.ts
│   │   ├── compact.ts
│   │   ├── config.ts
│   │   └── memory.ts
│   │
│   ├── permissions/
│   │   ├── manager.ts           # 权限决策管理器
│   │   ├── rules.ts             # 规则解析和匹配（glob 模式）
│   │   └── classifier.ts       # Bash 命令风险分类
│   │
│   ├── settings/
│   │   ├── schema.ts            # Zod schema 定义
│   │   ├── loader.ts            # 配置加载（优先级合并）
│   │   └── index.ts             # 导出
│   │
│   ├── history/
│   │   └── manager.ts           # 对话历史持久化（JSONL）
│   │
│   └── utils/
│       ├── tokens.ts            # Token 计数和预算
│       ├── format.ts            # 输出格式化工具
│       ├── git.ts               # Git 操作辅助
│       ├── platform.ts          # 平台检测（Windows/Unix）
│       └── env.ts               # 环境变量工具
│
├── docs/
│   ├── DESIGN.md                # 产品设计文档
│   └── ARCHITECTURE.md         # 技术架构文档（本文件）
│
├── package.json
├── tsconfig.json
├── bunfig.toml
└── .gitignore
```

---

## 4. 核心模块详解

### 4.1 Query Engine (`src/query.ts`)

这是整个系统的核心，驱动 AI 对话循环：

```
queryAI(messages, tools, options):
  1. 调用 Provider.stream(messages, tools)
  2. 逐 chunk 处理流式响应
     - text delta → 追加到当前 assistant 消息
     - tool_use block → 收集完整 input
  3. 收集所有 tool_use 调用
  4. 对每个 tool_use：
     a. checkPermissions(tool, input)
     b. 如需用户确认 → 暂停流，展示 PermissionDialog
     c. 执行 tool.call(input)
     d. 将 tool_result 加入 messages
  5. 如有 tool_use → 递归调用 queryAI（继续对话）
  6. stop_reason === 'end_turn' → 返回最终结果
  7. 检查 token 使用率 → 如超 80% 触发 compact
```

**关键设计决策：**
- 工具调用采用递归而非循环，保持调用栈清晰
- 流式响应通过 AsyncGenerator 传递给 TUI 组件
- 每轮开始前注入系统提示（记忆文件、上下文）

### 4.2 Provider 抽象 (`src/providers/interface.ts`)

```typescript
interface Provider {
  name: string
  model: string
  
  // 流式对话
  stream(
    messages: Message[],
    tools: ToolDefinition[],
    options: StreamOptions
  ): AsyncGenerator<StreamChunk>
  
  // 计算 token 数量（估算）
  countTokens(messages: Message[]): number
  
  // 获取模型上下文窗口大小
  getContextWindow(): number
}
```

Anthropic Provider 直接使用 `@anthropic-ai/sdk`，其他 Provider 通过统一接口适配。

### 4.3 Permission System (`src/permissions/`)

权限规则支持 glob 模式：
```
Bash(git *)           → 允许所有 git 命令
Bash(npm run *)       → 允许 npm run 前缀的命令
FileEdit(src/*.ts)    → 允许编辑 src/ 下的 ts 文件
*                     → 匹配任意工具调用
```

决策记录支持三种作用域：
- **session** — 仅当前会话有效（默认）
- **project** — 写入项目 `.qiling/settings.json`
- **global** — 写入 `~/.qiling/settings.json`

### 4.4 TUI 状态管理 (`src/components/App.tsx`)

使用 React 状态管理（`useState` + `useReducer`），不引入 Zustand 等外部状态库：

```typescript
interface AppState {
  messages: Message[]           // 对话历史
  toolCalls: ToolCallRecord[]   // 当前轮工具调用
  streamingText: string         // 正在流式输出的文本
  isStreaming: boolean          // 是否在流式输出
  pendingPermission: PermissionRequest | null  // 待确认权限
  inputMode: 'normal' | 'command'  // 输入模式
  commandFilter: string         // 斜杠命令过滤
  provider: ProviderInfo        // 当前 Provider 信息
  tokenUsage: TokenUsage        // token 使用统计
  error: string | null          // 错误信息
}
```

### 4.5 History Manager (`src/history/manager.ts`)

对话历史存储为 JSONL 格式（每行一条记录）：
- 位置：`~/.qiling/history/<session-id>.jsonl`
- 每条记录：`{ role, content, timestamp, toolCalls }`
- 压缩后存储 compacted 版本
- 重启时恢复最近的 session

---

## 5. 数据流

### 5.1 用户输入 → AI 响应

```
用户输入文本
  → PromptInput.onSubmit(text)
  → App.handleSubmit(text)
  → messages.push({ role: 'user', content: text })
  → query.ts: queryAI(messages, tools)
    → Provider.stream(...)
      → StreamChunk{type: 'text_delta', text: '...'} → UI 实时更新
      → StreamChunk{type: 'tool_use', name, input} → ToolCallDisplay
      → StreamChunk{type: 'stop', usage: {...}}
    → 如有 tool_use → PermissionCheck → Execute → Recurse
  → messages.push({ role: 'assistant', content: finalContent })
  → history.save(messages)
  → UI 更新（isStreaming: false）
```

### 5.2 工具执行流

```
tool_use block 收集完成
  → permissions.check(toolName, input)
    → 规则匹配 allow → 直接执行
    → 规则匹配 deny  → 返回错误给 AI
    → 无匹配规则     → App.showPermissionDialog()
                        用户按 Y/N/A/D
                        → 记录决策
                        → 继续执行或拒绝
  → tool.call(input, context)
    → 执行结果 ToolResult{content, isError}
  → messages.push({ role: 'user', content: [{ type: 'tool_result', ... }] })
  → 递归调用 queryAI
```

---

## 6. 构建和分发

### 开发模式
```bash
bun run src/main.tsx                  # 直接运行
bun run src/main.tsx --debug          # 调试模式
```

### 生产构建
```bash
# 当前平台单二进制
bun build src/main.tsx --compile --outfile dist/qiling

# Windows x64
bun build src/main.tsx --compile --target bun-windows-x64 --outfile dist/qiling.exe
```

### 全局安装（开发阶段）
```bash
bun link                    # 注册为全局命令 'qiling'
# 或
npm link                    # 通过 npm 全局注册
```

---

## 7. 扩展点

### 7.1 自定义工具
用户可以在 `.qiling/tools/` 目录下放置 TypeScript 文件，符合 `Tool` 接口即可自动加载（P2 功能）。

### 7.2 MCP 服务器
通过 `.qiling/settings.json` 配置 MCP 服务器，自动加载其提供的工具（P2 功能）。

### 7.3 Provider 插件
`src/providers/` 目录下实现 `Provider` 接口即可添加新的 AI 服务商。

---

## 8. 安全考虑

1. **命令注入防护** — Bash/PowerShell 工具使用 `Bun.spawn(args[])` 而非 `shell: true`，防止 shell 注入
2. **路径遍历防护** — FileRead/FileWrite/FileEdit 验证路径不包含 `../` 跳出工作目录
3. **API Key 安全** — API Key 只从环境变量或配置文件读取，不记录到历史或日志
4. **权限最小化** — 默认情况下，破坏性操作（文件写入、shell 命令）需要用户确认
5. **沙箱模式（P2）** — 支持只读模式，禁止所有写操作
