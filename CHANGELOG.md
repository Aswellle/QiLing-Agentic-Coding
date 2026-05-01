# 启灵 (QiLing) 更新日志

> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式  
> 版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)

---

## [Unreleased]

### 待开发
- 键位自定义 (`~/.qiling/keybindings.json`)
- Vim 键位模式
- 语音输入支持
- 团队记忆共享

---

## [0.2.0] - 2026-05-01

### 重大新增

**AI 扩展能力**
- Anthropic 提示词缓存 — system prompt + 前 2 条 user 消息注入 `cache_control: ephemeral`，缓存命中时成本降低 80-90%
- 扩展思考 (`--thinking <tokens>`) — Claude Opus/Sonnet-4 支持 extended thinking
- RepoMap 自动注入 — 启动时异步生成仓库符号索引注入 system prompt（`--no-repo-map` 禁用）

**新工具**
- `LspDiagnostics` — 语言服务器诊断工具：TypeScript (typescript-language-server)、Python (pylsp/pyright)、Go (gopls)、Rust (rust-analyzer)

**Hooks 系统**
- PreToolUse / PostToolUse / Stop 三种钩子
- 环境变量注入：QILING_TOOL_NAME, QILING_FILE_PATH, QILING_BASH_COMMAND, QILING_TOOL_RESULT
- 典型用途：FileEdit 后自动 prettier，任务完成后桌面通知

**Skills 系统**
- 加载 `.qiling/skills/*.md` 和 `.claude/skills/*.md`（兼容 Claude Code）
- `/skills` 命令列出所有可用 skill
- 使用 `/<skill-name>` 调用

**@mention 上下文注入**
- `@file src/auth.ts` — 注入文件内容
- `@folder src/` — 注入目录树
- `@url https://...` — 抓取并注入网页
- `@code functionName` — 搜索并注入函数定义
- `@git` — 注入 git status + diff
- `@repomap [path]` — 注入仓库索引

**会话管理**
- `--resume` / `--resume <id>` — 恢复上次/指定会话
- `/resume`、`/history` 命令
- 对话历史自动持久化到 `~/.qiling/history/<session>.jsonl`

**Provider 扩展**
- AWS Bedrock（需 `@anthropic-ai/bedrock-sdk`）
- Google Cloud Vertex AI
- 共支持 12 个 provider

**MCP 完整化**
- SSE transport 支持（HTTP server-sent events）
- `/mcp` 管理命令：list/status/add/remove

**Plan/Act 模式**
- `/plan` — 只读探索（FileRead/Glob/Grep）
- `/act` — 恢复全部工具
- StatusBar 显示 `[PLAN]` 徽章

**Agent 增强**
- `isolation: "worktree"` — git worktree 隔离执行
- 并行工具执行 — 只读工具 (FileRead/Glob/Grep/RepoMap) 并发执行
- 子代理深度限制防递归

**其他**
- 输入历史 ↑↓ 回溯（100条）
- `/test` 命令 — 测试-修复-重试循环
- `/repomap` 命令
- `/doctor` 环境诊断
- 生产级错误信息（401/429/529/网络故障分类提示）
- 启动性能优化（系统提示同步快速返回，RepoMap 后台加载）

### 新增测试
100 个单元测试，0 失败，覆盖：hooks、skills、session、planMode、compact、permissions、tools、settings、query

[0.2.0]: https://github.com/Aswellle/QiLing-Agentic-Coding/releases/tag/v0.2.0

---

## [0.1.0] - 2026-05-01

### 新增
- 完整终端 TUI（Ink 5.x + React 18），ASCII 艺术字启动画面
- AI Provider 支持：
  - Anthropic Claude（官方 SDK）
  - MiniMax（MiniMax-Text-01 / abab6.5s）
  - 阿里云通义千问（qwen-max / qwen-plus / qwen2.5-coder-32b）
  - 字节跳动豆包（doubao-pro-128k / doubao-1.5-pro-256k）
  - 智谱 GLM（glm-4-plus / glm-4-flash / codegeex-4）
  - OpenAI GPT（gpt-4o / gpt-4o-mini）
  - Google Gemini（gemini-2.0-flash）
  - 本地 Ollama（llama3.1 / qwen2.5-coder / deepseek-r1）
- 工具集（11 个）：
  - FileRead（支持图片、Jupyter notebooks）
  - FileEdit（精确字符串替换，LCS diff 展示）
  - FileWrite（自动建父目录）
  - Glob（尊重 .gitignore）
  - Grep（ripgrep 优先，内置 fallback）
  - Bash（23 种风险分类）
  - PowerShell（Windows 原生）
  - Agent（递归子代理，深度限制）
  - WebFetch（HTML 自动剥离）
  - TodoWrite（任务追踪）
  - NotebookRead（Jupyter .ipynb 完整渲染）
- 斜杠命令系统（10 个）：
  - /help, /commit, /review, /init, /memory, /pr, /doctor, /model, /config, /compact, /clear, /exit, /cost
- 权限系统：glob 规则匹配，四档决策（once/session/project/global），YOLO/只读模式
- API 重试机制：指数退避，429/529/503/网络错误自动重试
- Ctrl+C 中断：流式输出中断而非退出进程
- 上下文压缩：工具调用历史保留，AI 摘要生成
- 成本追踪：实时显示 ¥ 成本 + token 用量 + ctx 使用率
- MCP 基础支持：stdio JSON-RPC 客户端
- 对话历史持久化：JSONL 格式（`~/.qiling/history/`）
- 设置系统：4 层优先级（CLI > 项目 > 全局 > 默认值）
- 记忆文件自动注入（QILING.md / CLAUDE.md，向上查找）
- 单元测试：72 个测试，84% 覆盖率
- 多平台单二进制构建（Linux/macOS/Windows，x64/arm64）

### 技术文档
- [PRD](docs/01-PRD.md)、[竞品分析](docs/02-COMPETITIVE-ANALYSIS.md)
- [差距分析](docs/03-GAP-ANALYSIS.md)、[技术架构](docs/04-ARCHITECTURE.md)
- [开发路线图](docs/05-DEVELOPMENT-ROADMAP.md)
- [安全模型](docs/06-SECURITY-MODEL.md)、[测试策略](docs/07-TESTING-STRATEGY.md)

[Unreleased]: https://github.com/Aswellle/QiLing-Agentic-Coding/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Aswellle/QiLing-Agentic-Coding/releases/tag/v0.1.0
