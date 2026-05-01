# 启灵 (QiLing) 更新日志

> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式  
> 版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)

---

## [Unreleased]

### 待开发
- Plan/Act 模式（只读探索 + 执行分离）
- MCP SSE transport 支持
- 对话历史搜索 (`/history`)
- 键位自定义 (`~/.qiling/keybindings.json`)

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

[Unreleased]: https://github.com/YOUR_GITHUB_USER/qiling/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YOUR_GITHUB_USER/qiling/releases/tag/v0.1.0
