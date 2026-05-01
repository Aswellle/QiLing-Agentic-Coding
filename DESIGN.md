# 启灵 (QiLing) — 项目概览

> 企业级终端编程代理工具 · 中文优先 · 多模型支持 · 完全开源

---

## 快速导航

| 文档 | 内容 |
|---|---|
| [docs/01-PRD.md](docs/01-PRD.md) | **产品需求文档** — 功能需求、版本规划、成功指标 |
| [docs/02-COMPETITIVE-ANALYSIS.md](docs/02-COMPETITIVE-ANALYSIS.md) | **竞品分析** — Aider/Cline/Codex CLI/Goose/Cursor 深度对比 |
| [docs/03-GAP-ANALYSIS.md](docs/03-GAP-ANALYSIS.md) | **差距分析** — v0.1 现状与生产可用的距离 |
| [docs/04-ARCHITECTURE.md](docs/04-ARCHITECTURE.md) | **技术架构** — 分层设计、数据流、ADR |
| [docs/05-DEVELOPMENT-ROADMAP.md](docs/05-DEVELOPMENT-ROADMAP.md) | **开发路线图** — v0.2/v0.3/v1.0 Sprint 计划 |
| [docs/06-SECURITY-MODEL.md](docs/06-SECURITY-MODEL.md) | **安全模型** — 威胁模型、防御层次、操作模式 |
| [docs/07-TESTING-STRATEGY.md](docs/07-TESTING-STRATEGY.md) | **测试策略** — 单元/集成/E2E，代码示例 |

---

## 项目定位

**启灵是面向中国开发者生态的开源终端编程代理工具。**

具备 Claude Code 的全部代理能力，同时深度适配国产 AI 服务（MiniMax、Qwen、Doubao、GLM）和中文开发环境。

```
qiling        # 在当前目录启动
```

---

## 当前状态

**v0.1.0** — 骨架完成，约 35% 功能覆盖。可运行，但距生产可用还需 3-4 周（见 docs/03-GAP-ANALYSIS.md）。

下一步重点：API 重试机制、Compact 引擎修复、单元测试覆盖、国产模型扩展。
