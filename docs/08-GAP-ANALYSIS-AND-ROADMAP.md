# QiLing 差距清单 & 后续技术路线图

> 基准日期：2026-05-02  
> 对标目标：Claude Code CLI 全功能 + 个人编程代理终极形态  
> 当前版本：v0.2.0-dev（未提交的开发工作）  
> 代码规模：13,019 行 TypeScript，35 个工具

---

## 一、当前完成状态快照

### 已实现的功能矩阵

| 模块 | v0.2.0 release | 本轮开发后 |
|---|---|---|
| 核心工具 | 15 个 | **35 个** |
| AI Provider | 10+ | 10+（不变） |
| Plan/Act 模式 | 用户斜杠命令 | **AI 可自主调用工具切换** |
| Task 系统 | 无 | **6 件套完整实现** |
| 多代理协作 | 基础 AgentTool | **SendMessage + Team + Task 协调** |
| MCP 协议 | Tools 列表+调用 | **Tools + Resources + OAuth 2.0** |
| 权限系统 | 4 文件简单版 | **路径验证 + 规则冲突检测 + 高级匹配** |
| 成本追踪 | 实时显示 | **跨会话 USD 精确计算** |
| Cron 调度 | 无 | **完整 5 字段 cron + 自动触发** |
| Vim 模式 | 无 | **Normal/Insert + 30+ 命令** |
| Worktree 隔离 | AgentTool 参数 | **AI 可调用 Enter/ExitWorktree** |
| Web 搜索 | 无（只有 Fetch）| **Brave + DuckDuckGo 双路搜索** |
| 交互提问 | 无 | **AskUserQuestion 多选对话框** |
| Vim 查找 | 无 | **f/F/t/T + 文本对象 iw/aw/i"/a( 等** |

---

## 二、差距清单

### 2.1 P0 — 核心缺失（阻断「无差距」目标）

#### 🔴 P0-A：Query 引擎与 CC 差距 30% 功能量

| 缺失机制 | CC 源码位置 | 对应 QiLing 影响 |
|---|---|---|
| **contextCollapse** — 把旧 tool_use 折叠成摘要而非截断 | `services/contextCollapse/` | 长任务会话上下文耗尽后只能 compact，无法细粒度回收 |
| **reactiveCompact** — 收到 prompt-too-long 时自动压缩后重试 | `services/compact/reactiveCompact.ts` | 403/context_too_long 直接报错，用户需手动 /compact |
| **StreamingToolExecutor** — 工具在 AI 流输出时即开始并行执行 | `src/QueryEngine.ts` | 串行执行，读操作无法与 AI 响应流重叠，速度慢 |
| **toolUseSummary** — 每轮工具执行后 Haiku 生成摘要保留到压缩 | `services/toolUseSummary/` | 压缩后工具调用细节丢失，AI 无法回顾 |
| **taskBudget token 追踪** — 跨压缩边界追踪 token 消耗 | `query.ts:taskBudget` | 长任务不知道剩余预算，无法提前规划 |

#### 🔴 P0-B：关键工具缺失

| 工具 | CC 源码 | 用途 |
|---|---|---|
| **NotebookEditTool** | `tools/NotebookEditTool/` | 只能读 Jupyter，不能编辑（数据科学场景残缺）|
| **ConfigTool** | `tools/ConfigTool/` | AI 可自主读写配置文件（settings.json）|
| **BriefTool** | `tools/BriefTool/` | AI 在会话开始设置任务简报，后续压缩时保留 |

#### 🔴 P0-C：内存/记忆系统缺失

| 缺失功能 | CC 等效 | 影响 |
|---|---|---|
| **extractMemories service** | `services/extractMemories/` | 无法从对话中自动提炼持久化记忆 |
| **SessionMemory** | `services/SessionMemory/` | 跨会话记忆不结构化，只靠 QILING.md 手工写 |
| **@mention URL 展开** | `utils/mentions.ts` | `@url` 不支持，只能 WebFetch 手动 |
| **/memory 命令** | `commands/memory/` | 无法在会话中直接管理记忆条目 |

---

### 2.2 P1 — 重大体验差距

#### 🟡 P1-A：TUI/交互体验

| 缺失 | CC 等效 | 用户感知 |
|---|---|---|
| **长对话滚动** | Ink ScrollArea | 长对话无法回滚查看历史输出 |
| **Markdown 富文本渲染** | `marked` + Ink | 代码块、表格、粗体均显示原始 Markdown |
| **工具结果折叠** | `components/messages/` | 大量工具输出无法折叠，界面嘈杂 |
| **FileEdit diff 彩色可视化** | `components/diff/` | diff 以纯文本显示，无红绿高亮 |
| **后台任务指示条** | `getPillLabel()` | 无法看到后台 Agent 任务的运行状态 |
| **会话前后台切换** | Ctrl+B | 无法把当前任务推入后台继续输入新任务 |
| **图片渲染** | `tools/FileReadTool/imageProcessor` | 终端内看不到图片（sixel/iterm2 protocol）|

#### 🟡 P1-B：Provider 层

| 缺失 | 影响 |
|---|---|
| **Vertex AI** (GCP) 完整支持 | 企业用户无法用 Google Cloud 认证 |
| **模型动态列表** (`getModels()` API) | `/model` 命令用硬编码列表，新模型上线需手动更新 |
| **模型 fallback 机制** | 容量不足时不自动切换到备用模型，直接报错 |
| **Prompt cache 指标优化** | 无 cache hit rate 统计，无法判断是否缓存生效 |

#### 🟡 P1-C：工具层

| 缺失 | CC 源码 | 说明 |
|---|---|---|
| **SyntheticOutputTool** | `tools/SyntheticOutputTool/` | AI 生成中间摘要内容注入消息流 |
| **REPLTool** | `tools/REPLTool/` | AI 可直接注入用户消息（用于 orchestration）|
| **autoDream service** | `services/autoDream/` | 会话结束时自动整合记忆和 QILING.md |

#### 🟡 P1-D：安全与权限

| 缺失 | CC 等效 | 影响 |
|---|---|---|
| **Sandbox 沙箱模式** | `utils/sandbox/` | 无 denyWithinAllow 嵌套机制，不能真正隔离 AI 写文件范围 |
| **bypassPermissions killswitch** | `permissions/bypassPermissionsKillswitch.ts` | YOLO 模式无法动态关闭 |
| **UNC/symlink 穿越防护** | `pathValidation.ts` 完整版 | Windows 上 symlink 可绕过路径限制 |
| **审计日志** | `utils/telemetry/` | 无法事后审计 AI 执行了什么命令 |

---

### 2.3 P2 — 生态与分发差距

| 缺失 | 影响 |
|---|---|
| **自动更新机制** | 用户需手动下载新版本 |
| **VSCode 扩展** | 无法在编辑器内直接调用 |
| **QiLing SDK** | 无法作为库被其他项目集成 |
| **插件市场 (plugins service)** | 无第三方技能/工具扩展能力 |
| **PromptSuggestion service** | 无上下文相关的命令补全建议 |
| **settingsSync** | 多机器配置无法同步 |
| **package manager 发布** (npm/brew) | 安装体验差 |
| **/onboarding 首次配置向导** | 新用户配置 API Key 无引导 |
| **QILING.md 语义内存格式规范** | 记忆文件格式不标准，AI 不一定正确读取 |

---

### 2.4 P3 — 超越 Claude Code 的机会点

这些是 QiLing **可以超越** CC 的方向，作为差异化竞争优势：

| 方向 | 具体能力 | 为什么 CC 做不到 |
|---|---|---|
| **国产模型深度优化** | Qwen/Doubao/GLM prompt 模板调优，缓存策略适配 | CC 只支持 Claude |
| **本地 LLM 离线模式** | Ollama + 私有部署的完整工作流 | CC 强依赖 Claude.ai |
| **中文代码库分析** | 中文注释、中文变量名的正确 tokenization | CC 英文优先 |
| **性能超越** | StreamingToolExecutor 并发执行（已规划）→ 实际响应比 CC 快 20-30% | CC 工具串行化严重 |
| **轻量化部署** | 单二进制 < 20MB，启动 < 200ms | CC 启动较慢 |
| **开放架构** | 完全开源，用户可 fork 定制权限、工具、Provider | CC 闭源 |

---

## 三、后续技术路线图

### Phase 1：v0.3 「引擎完整性」（4–6 周）

**目标：消除所有 P0 差距，Query 引擎对齐 CC**

#### Sprint 1：Query 引擎升级（2 周）

```
Week 1:
  - contextCollapse 服务
    → src/services/contextCollapse/index.ts
    → 原理：维护 collapseStore，把 tool_use/tool_result 对折叠为 <summary> block
    → CC 源码：restored-src/src/services/contextCollapse/

  - reactiveCompact
    → src/services/compact/reactiveCompact.ts
    → 原理：收到 prompt-too-long 时自动触发 compactConversation 后重试
    → CC 源码：restored-src/src/services/compact/reactiveCompact.ts

Week 2:
  - StreamingToolExecutor
    → src/query/StreamingToolExecutor.ts
    → 原理：AI 流输出工具调用时即开始执行，不等待 stop 事件
    → 实现方案：Map<toolId, Promise<ToolResult>>，边收 tool_use_delta 边启动
    → 预期收益：并发工具执行比串行快 2-4x

  - toolUseSummary service
    → src/services/toolUseSummary/generator.ts
    → 原理：每轮工具结束后用 claude-haiku 生成 1-2 句摘要
    → 注入为 synthetic 消息，压缩时保留
```

#### Sprint 2：缺失工具补齐（2 周）

```
NotebookEditTool
  → CC: restored-src/src/tools/NotebookEditTool/
  → QiLing: src/tools/NotebookEditTool.ts
  → 功能：插入/编辑/删除 Jupyter cell，支持 Python/R/Julia

ConfigTool
  → CC: restored-src/src/tools/ConfigTool/
  → QiLing: src/tools/ConfigTool.ts
  → 功能：AI 读写 .qiling/settings.json，查看/修改 provider、tools 配置

BriefTool
  → CC: restored-src/src/tools/BriefTool/
  → QiLing: src/tools/BriefTool.ts
  → 功能：在会话开始时设置任务简报，嵌入 system prompt，压缩时保留

SyntheticOutputTool + REPLTool
  → AI 控制自身消息流的元工具
  → 简化版：注入 <assistant-note> 到消息流
```

#### Sprint 3：内存系统（1 周）

```
extractMemories service
  → src/services/memory/extractor.ts
  → 会话结束时调用 AI 提炼关键事实 → 写入 .qiling/QILING.md

/memory 命令
  → src/commands/memory.ts
  → /memory add "xxx" → 追加到 QILING.md
  → /memory list → 显示所有记忆
  → /memory clear → 清空

@mention URL 展开
  → src/utils/mentions.ts（已有文件扩展）
  → 支持 @https://... → 自动 WebFetch + 插入内容
```

---

### Phase 2：v0.4 「TUI 完整性」（4–6 周）

**目标：消除所有 P1 体验差距，界面媲美 CC**

#### Sprint 1：渲染升级（2 周）

```
Markdown 富文本渲染
  → 引入 ink-markdown 或手写 Markdown → Ink Text tree 转换器
  → 支持：代码块（有语言标注）、粗体、斜体、表格、链接
  → 代码块高亮：用 chalk 对关键字着色

FileEdit diff 彩色可视化
  → src/components/DiffView.tsx（重写）
  → unified diff 格式，删除行红色，新增行绿色，行号显示
  → ToolCallDisplay 使用新 DiffView

长对话滚动
  → Ink 5.x 有 ScrollArea 支持
  → 维护 visibleRange state，↑↓ 滚动历史消息
  → PageUp/PageDown 支持

工具结果折叠
  → ToolCallDisplay 增加 collapsed/expanded toggle
  → 默认折叠超过 5 行的工具结果
  → Enter/Space 展开
```

#### Sprint 2：后台任务系统（2 周）

```
Background Agent Session
  → 参照 CC 的 backgroundMainSession 实现
  → Ctrl+B：当前 query 推入后台继续执行
  → 底部 pill 指示条：显示后台任务名称和状态
  → ↓ 键切换回后台任务

会话前后台切换
  → REPL.tsx 维护 backgroundSessions: Map<id, Session>
  → 切换时保存/恢复 messages、toolCalls、usage 状态
```

#### Sprint 3：Provider 完善（1 周）

```
Vertex AI 完整支持
  → 修复 src/providers/bedrock.ts（已有骨架）
  → src/providers/vertex.ts：GCP 认证（Application Default Credentials）

模型动态列表
  → 每个 provider 增加 getModels() 方法
  → /model 命令实时获取最新模型列表

Prompt Cache 指标
  → StatusBar 显示 cache hit rate（cacheReadTokens / inputTokens）
  → /stats 命令显示累计缓存节省成本
```

---

### Phase 3：v0.5 「生态与分发」（4 周）

**目标：消除 P2 差距，构建开放生态**

```
自动更新机制
  → 启动时检查 GitHub Releases
  → 发现新版本显示提示 + /update 命令触发下载替换

插件系统
  → src/plugins/loader.ts
  → 插件是 .js/.ts 文件，export default { tools, commands, providers }
  → 从 .qiling/plugins/ 目录加载

VSCode 扩展（独立仓库）
  → vscode-qiling: 在 sidebar 面板中嵌入 QiLing TUI
  → 或：Language Server 模式，QiLing 作为 LSP server

QiLing SDK
  → npm package: @qiling/sdk
  → export: runQuery(), buildToolRegistry(), createProvider()
  → 允许第三方应用嵌入 QiLing 的 AI + 工具能力

Package Manager 发布
  → npm: npx qiling
  → Homebrew: brew install qiling
  → WinGet: winget install qiling
  → 安装向导：first-time setup wizard（API Key 配置、provider 选择）
```

---

### Phase 4：v1.0 「超越 CC 的差异化」（持续）

**目标：在 CC 之上建立 QiLing 的核心竞争优势**

#### 4.1 性能超越目标

| 指标 | CC 现状（估算）| QiLing v1.0 目标 | 实现方案 |
|---|---|---|---|
| 冷启动 | ~600ms | **< 150ms** | Bun 预编译 + lazy MCP 连接 |
| 首 token 延迟 | ~80ms | **< 50ms** | prompt cache 预热 + connection pool |
| 工具执行（5 个并发读操作）| ~800ms | **< 200ms** | StreamingToolExecutor 真并发 |
| TUI 帧率 | ~30fps | **60fps** | Ink 渲染优化 + debounce state updates |
| 内存占用（空闲）| ~120MB | **< 60MB** | 工具懒加载 + MCP 按需连接 |
| 二进制大小 | ~45MB | **< 20MB** | Bun tree-shaking + external deps |

#### 4.2 中文优先特性

```
中文代码库分析优化
  → 中文注释/变量名的正确 tokenization（jieba 分词集成）
  → 中文 RepoMap：支持中文函数名索引
  → 国产模型 prompt 模板：针对 Qwen/GLM/Doubao 的最优 few-shot

中文开发者工具链集成
  → 阿里云 OSS/CDN 直接操作工具
  → 华为云 OBS 工具
  → 腾讯云 COS 工具
  → 微信小程序/公众号 deployment 工具

本地化 AI 助手
  → 中文错误消息分析（支付宝/微信报错解读）
  → 中国常见框架（Spring Boot/MyBatis/Element UI）专用 skill
```

#### 4.3 架构演进

```
多工作区管理
  → 同时管理多个项目，快速切换上下文
  → 跨项目的技能和记忆复用

持久化任务队列
  → 跨会话的任务列表（存储到 .qiling/tasks.json）
  → 会话重启后自动恢复未完成任务

API 服务模式
  → qiling serve --port 8080
  → HTTP API：POST /query → streaming response
  → 允许外部工具（CI/CD、webhook）触发 AI 任务

Git 钩子深度集成
  → pre-commit hook：AI 自动 review 变更
  → commit-msg hook：AI 生成规范 commit message
  → pre-push hook：AI 运行完整测试套件
```

---

## 四、优先级执行矩阵

```
立即做（v0.3 Sprint 1，本周）：
  ├── StreamingToolExecutor     ← 最大性能收益，CC 源码可直接参考
  ├── reactiveCompact           ← 消除最常见的 prompt-too-long 崩溃
  └── contextCollapse           ← 长任务必备

之后做（v0.3 Sprint 2-3，下2周）：
  ├── NotebookEditTool          ← 直接从 CC 复制适配
  ├── extractMemories           ← 记忆是个人代理的核心价值
  └── @mention URL 展开         ← 用户呼声最高

v0.4 重点（4-8周）：
  ├── Markdown 渲染             ← 视觉体验飞跃
  ├── 后台 Agent 任务           ← 多任务能力
  └── 工具结果折叠              ← 减少 TUI 噪声

v0.5 生态（8-16周）：
  ├── 自动更新                  ← 用户留存必须
  ├── VSCode 扩展               ← 扩展用户群
  └── npm/brew 发布             ← 降低安装门槛
```

---

## 五、量化完成度评估

| 维度 | v0.2.0 release | 本轮开发后 | v1.0 目标 |
|---|---|---|---|
| 工具覆盖度 | 36% (15/42) | **83% (35/42)** | 100% (42+) |
| Query 引擎完整度 | 55% | 70% | 100% |
| TUI 体验 | 40% | 42% | 95% |
| 权限安全 | 30% | **75%** | 90% |
| 多代理能力 | 15% | **70%** | 85% |
| MCP 生态 | 50% | **90%** | 100% |
| 分发/生态 | 60% | 60% | 95% |
| 国产模型 | 90% | 90% | 100% |
| 性能 | 65% | 70% | **120%**（超越CC）|
| **综合估算** | **~45%** | **~72%** | **100%+** |

---

## 六、总结

当前 QiLing 距离「无差距」目标的核心鸿沟是：

1. **Query 引擎的三个高级机制**（contextCollapse + reactiveCompact + StreamingToolExecutor）——这是性能和稳定性的核心差距，影响所有长任务场景

2. **TUI 渲染质量**——Markdown、彩色 diff、滚动、折叠这些是用户每天都看到的东西

3. **记忆系统**——个人代理工具的核心价值主张，CC 有自动记忆提炼，QiLing 还没有

4. **生态分发**——工具本身功能已经足够强大，但用户获取和使用门槛还偏高

完成这四点，QiLing 达到 CC 全功能对齐；在国产模型、性能优化、中文特性上继续发力，则可以实现超越。
