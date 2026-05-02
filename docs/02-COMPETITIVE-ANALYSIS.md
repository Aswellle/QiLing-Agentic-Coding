# 启灵 (QiLing) — 竞品分析报告

> **文档版本**: v1.0 | **日期**: 2026-05-01  
> **调研范围**: Aider, Cline, Codex CLI, Goose, Amp, Open Interpreter, Continue.dev, Cursor

---

## 1. 市场格局

```
                    ┌──────────────────────────────────────────────────┐
                    │              编程代理工具市场地图                  │
                    │                                                    │
  IDE集成 ──────────┤  Cursor       Continue.dev    Cline              │
                    │  (全量IDE)    (VS Code+JB)    (VS Code扩展)       │
                    │                                                    │
  终端/CLI ─────────┤  Claude Code  Codex CLI       Aider     QiLing   │
                    │  (TUI+MCP)    (TUI/Rust)     (纯CLI)   (TUI/TS)  │
                    │                                                    │
  通用自动化 ────────┤  Goose        Open Interpreter   Amp             │
                    │  (Desktop)    (REPL/代码执行)  (企业级)            │
                    └──────────────────────────────────────────────────┘
```

---

## 2. 各工具详细分析

### 2.1 Aider ⭐ 29k

**定位**: git-first 终端编程代理  
**技术栈**: Python, 纯 CLI

**核心创新 — repo-map 机制**:
- 用 ctags 扫描整个 git 仓库，提取类/函数签名构建稀疏仓库索引
- 默认约 1k tokens，按 budget 动态缩放（无文件时 2x）
- 用户 `/add` 文件进入活跃上下文，其余仅在 repo-map 中
- **效果**: 在不完整加载所有文件的情况下，模型能"感知"整个仓库结构

**git 集成深度 — 行业第一**:
- 每次 AI 修改自动 `git commit` + `git diff` 展示
- `--watch-files` 模式：监听 IDE 中的 `AI?` 注释，自动执行
- 检测到测试失败后自动重跑→修复→提交（test-fix-commit 循环）
- dirty file 自动预提交，防止 AI 修改覆盖用户未提交的变更
- `--architect` 模式：分离规划（读写所有文件）与执行（写入少数文件）

**局限**:
- 无权限系统，任何操作都直接执行
- 无 TUI，纯命令行输出
- Python 生态，单文件 > 10MB 时性能下降
- 无 MCP 支持

**QiLing 借鉴点**: repo-map 轻量仓库索引 + test-fix-commit 工作流

---

### 2.2 Cline ⭐ 61k

**定位**: VSCode 插件编程代理（市场份额第一）  
**技术栈**: TypeScript, VS Code Extension API

**核心创新 — Plan/Act 双模式**:
- **Plan 模式**: 只读探索，可读取所有文件、分析架构，但不能修改
- **Act 模式**: 执行变更，每步操作需用户点击批准
- 模式间切换创造了安全的"先想清楚再动手"工作流

**权限系统最完备**:
- 文件变更、命令执行、浏览器操作、MCP 工具调用，每步都需确认
- 支持自创 MCP 工具（模型自举扩展能力）
- AST 分析控制上下文膨胀（只加载与任务相关的文件部分）

**成本可视化**:
- 每次请求后显示本次 token 消耗 + 累计花费
- 支持 token 用量预算设置，超限告警

**局限**:
- 重度依赖 VS Code，无独立 CLI
- 每步审批导致自主性较弱，长任务用户疲劳
- 模型切换成本高（provider 配置分散）

**QiLing 借鉴点**: Plan/Act 模式 + 成本可视化（每次请求 token 成本显示）

---

### 2.3 OpenAI Codex CLI ⭐ 开源 (4M 周活用户)

**定位**: 终端 AI 代理，OpenAI 官方出品  
**技术栈**: Rust, Apache-2.0

**架构特点**:

- Rust 实现带来极低内存占用和快速启动
- 2026 年引入多代理 v2 架构，子代理通过路径寻址（`/root/agent_a`）
- `~/.codex/config.toml` 管理 MCP 集成
- GPT-5.4 + 1M context window 实验性支持

**安全模型**:
- `--approval-policy` 三档：`always-allow`、`ask-on-change`（默认）、`full-sandbox`
- `full-sandbox` 下使用网络隔离容器执行命令

**局限**:
- 深度绑定 OpenAI 模型
- 开源但核心能力依赖闭源 API
- 中文支持弱

**QiLing 借鉴点**: `--approval-policy` 简洁的三档权限模型

---

### 2.4 Goose (Block/AAIF) ⭐ 29k

**定位**: 通用自动化代理，Linux Foundation 捐赠  
**技术栈**: Rust

**架构创新 — 真正模型无关**:
- UI 层/LLM 层/工具层三维独立可替换
- 15+ LLM provider 支持，无需重启切换
- 3000+ MCP 工具生态（利用现有 MCP 服务器）
- Docker 沙箱集成

**局限**:
- 面向通用自动化，编码专业性不如 Cline/Aider
- 发展路径不聚焦，功能较散

**QiLing 借鉴点**: provider registry 解耦设计，热切换无重启

---

### 2.5 Amp (Sourcegraph) 商业闭源

**定位**: 企业级代码智能代理  
**特点**:
- 基于 Sourcegraph 代码图谱，跨仓库语义理解
- ZDR（Zero Data Retention）满足企业合规
- 并联 subagents 处理跨文件大型重构
- Token uncapped（无硬性输出限制）

**局限**: 非开源，对个人开发者不友好，依赖 Sourcegraph 云基础设施

**QiLing 借鉴点**: 并联 subagent 大型重构策略

---

### 2.6 Cursor 商业闭源 $20/月

**定位**: AI-native IDE (VSCode fork)  
**技术特点**:
- 语义向量索引（连续扫描文件结构+类型定义+调用图）
- Background Agents：git worktree 隔离，Slack/Linear/GitHub 异步集成
- RL 强化减少幻觉，自我摘要跨会话连续性

**上下文管理最精密**:
- `@codebase` 语义向量搜索
- `@mentions` 系统（文件/文件夹/URL/文档显式注入）
- 1M token 窗口

**局限**: 闭源 $20/月，非 CLI 工具，无法私有部署

**QiLing 借鉴点**: @mention 上下文注入系统 + worktree 隔离并联任务

---

## 3. 综合竞品对比矩阵

| 维度 | Aider | Cline | Codex CLI | Goose | Cursor | **QiLing v0.1** | **QiLing v1.0 目标** |
|---|---|---|---|---|---|---|---|
| **UI** | CLI | VSCode 插件 | TUI/Rust | Desktop+CLI | 全量 IDE | TUI/Ink | TUI/Ink |
| **上下文策略** | repo-map+手动 | AST+@mention | 1M 滚动 | MCP 工具链 | 语义索引+RL | 基础对话历史 | repo-map + 语义搜索 |
| **权限系统** | 无 | 逐步审批 | 三档沙箱 | 工具级 | 粒度控制 | glob 规则+确认 | glob+四档+YOLO |
| **工具扩展** | 无 | MCP+自创 | MCP TOML | 3000+ MCP | 插件+SDK | 基础 MCP | MCP 完整生态 |
| **多模型** | 100+ | 多 provider | OpenAI 主 | 15+ | 多(偏闭源) | Anthropic/MiniMax/OpenAI | +国产模型 |
| **git 集成** | 最深(自动提交) | 基础 | 基础 | 基础 | worktree | /commit 命令 | 自动 commit + test 循环 |
| **中文支持** | 无 | 无 | 无 | 无 | 弱 | ✅ 原生 | ✅ 深度 |
| **国产模型** | 无 | 无 | 无 | 部分 | 无 | MiniMax ✅ | MiniMax+Qwen+Doubao+GLM |
| **开源** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **私有部署** | ✅ | 部分 | ✅ | ✅ | ❌ | ✅ | ✅ |
| **成本可视化** | 无 | ✅ | 无 | 部分 | 无 | 基础 token 统计 | 详细成本追踪 |
| **Plan/Act 模式** | `--architect` | ✅ | 无 | 无 | Composer | ❌ | ✅ v0.3 |
| **测试循环** | ✅ | 部分 | 无 | 无 | 部分 | ❌ | ✅ /test 命令 |

---

## 4. QiLing 差异化定位

基于以上分析，QiLing 的差异化战略：

### 4.1 独特价值主张

```
Claude Code 的能力 × 中国开发者生态的适配
────────────────────────────────────────────
1. 唯一深度支持国产模型的全功能终端代理
2. 唯一提供中文原生界面+中文错误信息的同类工具  
3. 开源可私有部署，无厂商锁定
4. repo-map 轻量仓库感知（借鉴 Aider，Claude Code 没有）
```

### 4.2 功能优先级矩阵

```
              高业务价值
                   │
      repo-map ────┼──── Plan/Act 模式
      国产模型     │     成本追踪
      MCP 完整     │     test-fix 循环
  ────────────────┼────────────────── 低实现成本
    worktree 隔离  │     @mention 注入   高实现成本
    Background     │     Background Agent
    Agent          │     JetBrains 支持
                   │
              低业务价值
```

**立即实现（高价值/低成本）**: 国产模型扩展（Qwen、Doubao）、成本追踪、Plan/Act 模式

**中期实现（高价值/高成本）**: repo-map、完整 MCP、test-fix 循环

**考虑实现（低价值/低成本）**: @mention 注入

**暂不实现**: Background Agent（需云基础设施）、JetBrains 支持（需大量工程量）

---

## 5. 市场空白识别

当前市场中没有任何工具同时满足：

1. ✅ 完整功能的终端 TUI（非 VSCode 插件）
2. ✅ 深度国产 AI 模型支持
3. ✅ 中文原生体验
4. ✅ 完全开源+私有部署
5. ✅ Claude Code 级别的工具系统

这正是 QiLing 的蓝海空间。
