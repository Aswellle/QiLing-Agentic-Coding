# 启灵 (QiLing)

> **面向中国开发者的开源终端 AI 编程代理** — 具备 Claude Code 的全部能力，深度支持国产 AI 模型

```
   ____  _ _     _
  / __ \(_) |   (_)_ __   __ _
 | |  | | | |   | | '_ \ / _` |
 | |__| | | |___| | | | | (_| |
  \___\_\_|_____|_|_| |_|\__, |
                            __/ |
                           |___/

  启 灵 编 程 代 理  ·  QiLing Programming Agent  v0.1.0

  Provider › MiniMax
  Model    › MiniMax-Text-01
  Endpoint › https://api.minimax.io/v1
```

## 特性

- 🇨🇳 **国产模型原生支持** — MiniMax、通义千问、豆包、智谱 GLM、Ollama 本地模型
- 🖥️ **终端 TUI** — 基于 Ink/React，流式输出、工具调用可视化
- 🔧 **完整工具系统** — 11 个工具：文件读写编辑、Glob/Grep 搜索、Shell 执行、子代理、WebFetch
- 🛡️ **智能权限系统** — 23 种 Bash 风险分类，四档权限决策，YOLO/只读模式
- 🔄 **生产可靠** — 429/529/503 自动重试，Ctrl+C 中断流式，上下文智能压缩
- 💰 **成本透明** — 实时显示 token 用量和 ¥ 成本
- 🧩 **MCP 支持** — 连接外部 MCP 服务器扩展工具能力
- 📝 **记忆系统** — 自动加载 QILING.md / CLAUDE.md

## 安装

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_USER/qiling/main/scripts/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/YOUR_GITHUB_USER/qiling/main/scripts/install.ps1 | iex
```

**从源码运行 (需要 Bun 1.x):**
```bash
git clone https://github.com/YOUR_GITHUB_USER/qiling
cd qiling
bun install
bun run dev
```

## 快速开始

```bash
# 设置 API Key (选择一个)
export MINIMAX_API_KEY=your-key       # MiniMax
export DASHSCOPE_API_KEY=your-key     # 通义千问
export ARK_API_KEY=your-key           # 豆包
export ZHIPUAI_API_KEY=your-key       # 智谱 GLM
export ANTHROPIC_API_KEY=your-key     # Anthropic Claude

# 启动
qiling

# 切换模型
qiling --provider minimax --model MiniMax-Text-01
qiling --provider qwen --model qwen-max
qiling --provider ollama --model llama3.1   # 本地，无需 API Key
```

## 斜杠命令

| 命令 | 说明 |
|---|---|
| `/help` | 显示帮助 |
| `/commit` | AI 辅助创建 git commit |
| `/review [PR#]` | 代码审查 |
| `/init` | 分析代码库，创建 QILING.md |
| `/memory` | 查看记忆文件 |
| `/model` | 切换 AI 模型 |
| `/compact` | 压缩上下文（保留工具操作历史）|
| `/doctor` | 诊断环境配置 |
| `/cost` | token 成本统计 |

## Provider 支持

| Provider | 推荐模型 | 环境变量 |
|---|---|---|
| MiniMax | MiniMax-Text-01 (1M ctx) | `MINIMAX_API_KEY` |
| 通义千问 | qwen-plus / qwen2.5-coder-32b | `DASHSCOPE_API_KEY` |
| 豆包 | doubao-1.5-pro-256k | `ARK_API_KEY` |
| 智谱 GLM | glm-4-plus / codegeex-4 | `ZHIPUAI_API_KEY` |
| Anthropic | claude-sonnet-4-6 | `ANTHROPIC_API_KEY` |
| OpenAI | gpt-4o | `OPENAI_API_KEY` |
| Google | gemini-2.0-flash | `GEMINI_API_KEY` |
| Ollama | llama3.1 / deepseek-r1 | 无需 |

## MCP 配置

在 `~/.qiling/settings.json` 或 `.qiling/settings.json` 中：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

## 记忆文件

启灵自动加载以下位置的记忆文件（Markdown 格式）：

```
~/.qiling/QILING.md    ← 全局个人偏好
./QILING.md            ← 项目级记忆
./CLAUDE.md            ← 兼容 Claude Code
```

运行 `/init` 让 AI 自动分析项目并生成记忆文件。

## 构建

```bash
bun run build:linux-x64    # Linux x64
bun run build:macos-arm64  # macOS Apple Silicon
bun run build:windows      # Windows x64
bun run build:all          # 全平台
```

## 贡献

欢迎 PR！请先阅读 [技术架构文档](docs/04-ARCHITECTURE.md) 和 [开发路线图](docs/05-DEVELOPMENT-ROADMAP.md)。

```bash
bun test          # 运行测试
bun run typecheck # 类型检查
```

## 许可证

MIT © 2026 QiLing Contributors
