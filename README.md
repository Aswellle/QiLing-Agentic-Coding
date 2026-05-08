<div align="center">

```
  ✦  启 灵  ✦  春 意 盎 然 · 灵 感 迸 发  ✦  启 灵  ✦
```

```
    ____  _ _      _
   / __ \(_) |    (_)_ __   __ _
  | |  | | | |    | | '_ \ / _` |
  | |__| | | |___ | | | | | (_| |
   \___\_\_|_____|_|_| |_|\__, |
                             __/ |
  ❀  v0.3.0  ·  AI Coding Agent  |___/  ❀
```

**启灵 (QiLing)** — 面向中国开发者的开源终端 AI 编程代理

*灵感在春意盎然、朝气蓬勃的绿色中迸发*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Runtime-Bun%201.x-green)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-green)](https://www.typescriptlang.org)

</div>

---

## 什么是启灵

启灵是一个**完全开源**的终端 AI 编程代理，深度对标 Claude Code 的完整能力集，同时原生支持国产大模型。它运行在你的终端里，能够理解代码库、编辑文件、执行命令，以及完成复杂的多步骤编程任务。

```
启 (qǐ) = 开启、唤醒   ·   灵 (líng) = 灵感、灵魂
```

启灵是你的 AI 结对程序员——理解你、执行你、陪你在代码的世界里穿行。

---

## ✦ 核心能力

### 模型支持

| Provider | 推荐模型 | 环境变量 | 特色 |
|---|---|---|---|
| **Anthropic** | claude-sonnet-4-6 | `ANTHROPIC_API_KEY` | 默认，能力最强 |
| **MiniMax** | MiniMax-Text-01 | `MINIMAX_API_KEY` | 百万上下文 |
| **通义千问** | qwen-plus / qwen2.5-coder-32b | `DASHSCOPE_API_KEY` | 编程专项 |
| **豆包** | doubao-1.5-pro-256k | `ARK_API_KEY` | 低成本高效 |
| **智谱 GLM** | glm-4-plus / codegeex-4 | `ZHIPUAI_API_KEY` | 代码生成 |
| **OpenAI** | gpt-4o / o1 | `OPENAI_API_KEY` | 兼容 |
| **Google Gemini** | gemini-2.0-flash | `GEMINI_API_KEY` | 多模态 |
| **AWS Bedrock** | claude-sonnet-4-6 | AWS 凭证 | 企业私有云 |
| **Google Vertex** | claude-sonnet-4-6 | GCP 凭证 | 企业私有云 |
| **Ollama** | llama3.1 / deepseek-r1 | 无需密钥 | 本地离线 |

### 工具系统（42 个工具）

**文件操作**
- `FileRead` — 读取文件（含 PDF、Jupyter、图片）
- `FileEdit` — 精确字符串替换，支持 replace_all
- `FileWrite` — 写入完整文件内容
- `NotebookEdit` / `NotebookRead` — Jupyter Notebook 支持

**搜索与导航**
- `Glob` — 文件名模式匹配（含 head_limit / offset 分页）
- `Grep` — ripgrep 驱动的内容搜索（多行模式、context 行）
- `RepoMap` — 智能代码库地图生成
- `ToolSearch` — 延迟加载工具查询

**Shell 执行**
- `Bash` — Unix/macOS/WSL，600s 超时，`run_in_background` 后台
- `PowerShell` — Windows，完整 PS 支持

**代理与协作**
- `Agent` — 递归子代理（含深度限制、worktree 隔离模式）
- `SendMessage` — 跨代理通信
- `TeamCreate` / `TeamDelete` — 多代理团队管理

**任务管理**
- `TodoWrite` — 结构化任务列表（含 `activeForm` 实时状态）
- `TaskCreate/Get/List/Output/Stop/Update` — 后台任务生命周期

**时间与调度**
- `Sleep` — 轻量等待（不占用 Shell 进程）
- `CronCreate/Delete/List` — 定时任务调度

**LSP 智能**
- `Lsp` — Language Server Protocol 诊断

**MCP 集成**
- `McpTool` / `McpAuth` — MCP 工具代理与鉴权
- `ListMcpResources` / `ReadMcpResource` — MCP 资源访问

**Web**
- `WebFetch` — 抓取 URL，AI 提炼关键信息
- `WebSearch` — 网络搜索（Anthropic API）

**其他**
- `BriefTool` — 结构化用户消息
- `AskUserQuestion` — 交互式提问
- `SkillTool` — Skills 技能调用
- `RemoteTrigger` — 远程触发器
- `EnterPlanMode` / `ExitPlanMode` — 计划/行动模式切换
- `EnterWorktree` / `ExitWorktree` — Git Worktree 隔离

### 斜杠命令（20 个）

| 命令 | 功能 |
|---|---|
| `/help` | 显示所有命令和键盘快捷键 |
| `/commit` | AI 辅助生成 git commit（含安全规则） |
| `/review [PR#]` | GitHub PR 代码审查（用 gh CLI） |
| `/init` | 分析代码库，生成 QILING.md 项目记忆 |
| `/memory` | 查看当前记忆文件内容 |
| `/compact` | 智能压缩上下文（CC BASE_COMPACT_PROMPT） |
| `/cost` | 会话 Token 用量与费用统计 |
| `/fast` | 切换快速模式（claude-opus-4-6） |
| `/diff` | 显示当前工作区 git 变更统计 |
| `/restore` | 恢复文件到会话开始前的状态 |
| `/doctor` | 诊断运行环境（Runtime/API Key/外部工具） |
| `/plan` | 进入只读计划模式（防止意外写入） |
| `/act` | 退出计划模式，回到执行模式 |
| `/test` | AI 辅助运行测试并分析失败原因 |
| `/repomap` | 显示代码库结构地图 |
| `/open [file]` | 在 VS Code / Cursor / vim 中打开文件 |
| `/pr` | 创建 / 查看 GitHub Pull Request |
| `/bg` | 后台代理列表管理 |
| `/plugins` | 插件管理 |
| `/setup` | 初始化配置向导 |

另有 REPL 内置命令：`/model`  `/config`  `/skills`  `/resume`  `/history`  `/clear`  `/exit`  `! <cmd>`（直接执行 Shell）

### CLI 选项

```
qiling [prompt] [选项]

核心
  -p, --print              非交互输出模式（适合管道、脚本）
  -m, --model <model>      指定模型（如 sonnet, opus, haiku 或完整名称）
  --provider <name>        指定 Provider（anthropic/minimax/qwen/doubao/glm/openai/gemini/ollama/bedrock/vertex）
  --effort <level>         思考力度：low / medium / high / max（映射到 thinking budget）
  --thinking <tokens>      直接指定 extended thinking token 预算

会话
  -c, --continue           继续最近的对话
  -r, --resume [id]        恢复指定会话（不加 id 则交互选择）
  --session-id <uuid>      指定会话 ID
  -n, --name <name>        为会话设置显示名称

权限
  --yolo                   跳过所有权限确认（危险！仅受信任环境）
  --dangerously-skip-permissions  同上，CC 兼容别名
  --readonly               只读模式，禁用所有写入/执行工具

上下文
  --system-prompt <text>   替换默认系统提示
  --append-system-prompt <text>  追加到默认系统提示
  --add-dir <dirs...>      加载额外目录的 QILING.md
  --proactive              主动模式：AI 自主探索执行，响应 tick 周期检查

输出
  --output-format <fmt>    text（默认）/ json / stream-json
  --max-turns <n>          最大代理轮数（-p 模式）
  --max-budget-usd <amt>   最大费用上限（-p 模式）
  --verbose                详细输出（工具名称、耗时）

工具过滤
  --allowed-tools <tools>  只允许指定工具（逗号分隔）
  --disallowed-tools <tools>  禁止指定工具

MCP
  --mcp-config <json|file>  加载 MCP 服务器配置
  --settings <file|json>   额外设置文件或 JSON 字符串

子命令
  qiling mcp list          列出已配置的 MCP 服务器
  qiling mcp add <n> <cmd> 添加 MCP 服务器到 settings.json
  qiling mcp remove <n>    删除 MCP 服务器
  qiling auth status       显示 API Key 配置状态
  qiling auth set-key <p> <key>  保存 API Key 到配置文件
  qiling doctor            运行环境诊断
  qiling version           显示版本和运行时信息
```

---

## 快速开始

### 安装

**从源码运行（推荐开发者）：**
```bash
git clone https://github.com/Aswellle/QiLing-Agentic-Coding
cd QiLing-Agentic-Coding
bun install
bun run dev
```

**构建可执行文件：**
```bash
bun run build:windows   # Windows .exe
bun run build           # 当前平台
bun run build:all       # 全平台
```

### 配置

```bash
# 设置 API Key（选一个或多个）
export ANTHROPIC_API_KEY=sk-ant-...     # Anthropic Claude
export DASHSCOPE_API_KEY=sk-...         # 通义千问
export ARK_API_KEY=...                  # 豆包
export ZHIPUAI_API_KEY=...              # 智谱 GLM
export MINIMAX_API_KEY=...              # MiniMax
export OPENAI_API_KEY=sk-...            # OpenAI
export GEMINI_API_KEY=...               # Google Gemini

# 或者通过 CLI 配置
qiling auth set-key anthropic sk-ant-...
```

### 启动

```bash
# 交互模式
qiling

# 切换 Provider 和模型
qiling --provider qwen --model qwen2.5-coder-32b
qiling --provider ollama --model deepseek-r1  # 本地，无需 Key

# 非交互（脚本/管道）
qiling -p "解释这个函数的作用" < src/main.ts
echo "修复这个 bug" | qiling -p --output-format stream-json

# 思考模式（需要 Claude Sonnet 4.6+ / Opus）
qiling --thinking 16384
qiling --effort high       # 等价于 thinking=16384
qiling --effort max        # thinking=32768

# 主动模式（AI 自主工作）
qiling --proactive

# 恢复上次会话
qiling -c
qiling -r                  # 交互式选择历史会话
```

---

## 项目配置

### settings.json

在 `~/.qiling/settings.json`（全局）或 `.qiling/settings.json`（项目）中配置：

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "thinkingBudget": 8192,
  "ui": {
    "language": "zh-CN",
    "theme": "dark",
    "vimMode": false
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
    }
  },
  "hooks": {
    "PreToolUse": [{ "type": "command", "command": "echo 'tool: $TOOL_NAME'" }],
    "PostToolUse": [],
    "Stop": []
  }
}
```

### 记忆文件（Memory）

启灵自动加载以下位置的 Markdown 记忆文件，注入为系统提示上下文：

```
~/.qiling/QILING.md    ← 全局个人偏好、工作方式
./QILING.md            ← 项目级架构和规范
./CLAUDE.md            ← 兼容 Claude Code（自动识别）
./.qiling/QILING.md    ← 项目私有配置（不提交 git）
```

运行 `/init` 让 AI 自动分析项目并生成 `QILING.md`。

---

## 架构概览

```
main.tsx (CLI 入口, Commander.js)
  ↓ 加载配置 (CLI > .qiling/ > ~/.qiling/ > 默认)
  ↓ createProvider(settings)     // src/providers/index.ts
  ↓ buildToolRegistry(settings)  // src/tools/index.ts
  ↓ 加载 MCP 工具 + Skills
  ↓ 渲染 Ink REPL (src/components/REPL.tsx)
        PromptInput → runQuery() → Provider.stream()
             → 收集 tool_use 块
             → PermissionManager.check()
             → 执行工具（只读工具并发）
             → 递归直到无 tool_use
             → 自动压缩（token 用量 > 80%）
```

**技术栈**

| 层 | 技术 |
|---|---|
| Runtime / Build | Bun 1.x，单二进制编译 |
| TUI | Ink 5.x + React 18 |
| AI | `@anthropic-ai/sdk` + `openai` SDK（兼容适配器） |
| CLI | Commander.js |
| 验证 | Zod |
| Lint | Biome（Rust，替代 ESLint + Prettier） |

**关键模块**

| 路径 | 职责 |
|---|---|
| `src/query.ts` | `runQuery()` — 完整代理循环 |
| `src/providers/index.ts` | 10+ AI Provider 工厂 |
| `src/tools/index.ts` | `buildToolRegistry()` — 42 个工具 |
| `src/permissions/manager.ts` | 权限检查 + 决策记录 |
| `src/permissions/classifier.ts` | Bash 命令风险分类（高/中/低） |
| `src/compact/engine.ts` | 上下文压缩引擎（CC BASE_COMPACT_PROMPT） |
| `src/hooks/index.ts` | PreToolUse / PostToolUse / Stop 生命周期钩子 |
| `src/context.ts` | 用户上下文注入（CLAUDE.md + git 状态） |
| `src/vim/` | 完整 Vim 模式栈（operators, motions, textObjects） |

---

## 开发

```bash
# 开发模式
bun run dev
bun run dev:debug        # QILING_DEBUG=1

# 测试
bun test
bun test --grep "MEDIUM RISK"
bun test --coverage

# 类型检查 & Lint
bun run typecheck        # tsc --noEmit
bunx @biomejs/biome check src/
bunx @biomejs/biome check --write src/

# 构建
bun run build            # 当前平台
bun run build:windows    # Windows .exe
bun run build:all        # 全平台
```

测试使用 Bun 原生测试运行器（从 `bun:test` 导入，非 Jest/Vitest）。

---

## 贡献

欢迎 PR！请先阅读：
- [`docs/04-ARCHITECTURE.md`](docs/04-ARCHITECTURE.md) — 技术架构设计
- [`docs/06-SECURITY-MODEL.md`](docs/06-SECURITY-MODEL.md) — 安全模型
- [`docs/07-TESTING-STRATEGY.md`](docs/07-TESTING-STRATEGY.md) — 测试策略
- [`CLAUDE.md`](CLAUDE.md) — 项目开发规范

---

## 许可证

MIT © 2026 QiLing Contributors

---

<div align="center">

*✦ 春风送暖入屠苏 · 万象更新启灵途 ✦*

**[GitHub](https://github.com/Aswellle/QiLing-Agentic-Coding)** · **[Issues](https://github.com/Aswellle/QiLing-Agentic-Coding/issues)** · **[Discussions](https://github.com/Aswellle/QiLing-Agentic-Coding/discussions)**

</div>
