# 启灵 (QiLing) — 开发路线图

> **版本**: v1.0 | **日期**: 2026-05-01

---

## 总览

```
v0.1 ──────── v0.2 ──────────── v0.3 ──────────────── v1.0
已完成        2026 Q2           2026 Q3                2027 Q1
骨架+基础    生产可靠性         功能完整               GA发布
```

---

## v0.2 — Production Baseline（约 3-4 周）

**目标**: 解决所有 P0 Blocker，让 QiLing 在真实项目中可靠运行

### Sprint 1（第 1-2 周）: 可靠性基础

**S1-1: API 重试机制（3天）**
- [ ] 实现 `src/retry/withRetry.ts`
  - 429（rate limit）: 指数退避，最大等待 5 分钟
  - 529（overloaded）: 同 429
  - 503（service unavailable）: 重试 3 次
  - 网络超时：重试 3 次
  - 非重试错误（400/401/404）：直接失败，清晰错误信息
- [ ] 在 `query.ts` 中包装 provider.stream() 调用
- [ ] UI 层展示重试状态："正在重试 (2/3)..."
- [ ] `--no-retry` 标志禁用重试（调试用）

**S1-2: 流式中断（2天）**
- [ ] REPL 中 Ctrl+C 触发 AbortController.abort()
- [ ] query.ts 检查 signal 状态，在每个 tool_use 前检查
- [ ] 中断时保存已接收内容到消息历史
- [ ] 中断后 isStreaming 正确复位

**S1-3: max_tokens 续传（2天）**
- [ ] 检测 stop_reason === 'max_tokens'
- [ ] 自动发送 "Please continue" 继续获取输出
- [ ] 最多续传 3 次
- [ ] 续传计入 token 使用统计

### Sprint 2（第 2-3 周）: 核心功能修复

**S2-1: Compact 引擎修复（3天）**
- [ ] 压缩时保留工具调用摘要（不丢失操作历史）
  ```
  [压缩前]: user→assistant(工具调用 FileRead/FileEdit x5)→user→...
  [压缩后]: 摘要 + 工具操作记录: FileRead(auth.ts), FileEdit(auth.ts: validateToken)...
  ```
- [ ] microcompact: 仅压缩工具调用输出，保留完整对话
- [ ] 自定义压缩指令：`/compact 保留 auth 相关修改记录`
- [ ] 压缩进度显示：`压缩中... (原 45 轮 → 预计 3 轮)`

**S2-2: Bash 安全检查完善（2天）**
- [ ] 补全 23 种风险检测（对应 Claude Code bashSecurity.ts）
  - 危险文件操作: `rm -rf`, `truncate`, `dd if=/dev/zero`
  - git 破坏性操作: `git reset --hard`, `git push --force`
  - 特权操作: `sudo`, `su`, `chmod 777`
  - 网络操作: `curl | bash`, `wget | sh`
  - 数据库破坏: `DROP TABLE`, `DELETE FROM ... WHERE 1=1`
- [ ] 危险命令展示详细警告信息（说明风险）
- [ ] `--yolo` 模式跳过所有确认

**S2-3: FileEdit Diff 可视化（1天）**
- [ ] 实现 `src/components/DiffView.tsx`
- [ ] FileEdit 成功后展示 unified diff
- [ ] 使用 chalk: 删除行红色 `- `, 新增行绿色 `+ `
- [ ] 超过 20 行折叠，显示 `[展开 +N 行]`

**S2-4: .gitignore 支持（1天）**
- [ ] GlobTool 读取项目 .gitignore（向上查找）
- [ ] 将忽略规则传入 fast-glob 的 `ignore` 选项
- [ ] 同时忽略常见目录：`node_modules`, `.git`, `dist`, `.next`, `__pycache__`

**S2-5: 成本追踪（1天）**
- [ ] 实现 `src/utils/tokens.ts` 精确成本计算
  ```
  MiniMax: input $0.02/1M, output $0.04/1M (参考定价)
  Anthropic Sonnet: input $3/1M, output $15/1M
  OpenAI GPT-4o: input $2.5/1M, output $10/1M
  ```
- [ ] StatusBar 显示本轮成本 `~¥0.08 | 12.4k tokens`
- [ ] `/cost` 命令显示累计成本

### Sprint 3（第 3-4 周）: 测试 + 分发

**S3-1: 核心单元测试（5天）**
- [ ] `tests/unit/permissions/rules.test.ts` - glob 规则匹配
- [ ] `tests/unit/tools/FileEditTool.test.ts` - 唯一性检查、替换
- [ ] `tests/unit/tools/GlobTool.test.ts` - 文件匹配、.gitignore
- [ ] `tests/unit/query.test.ts` - 重试逻辑、tool loop
- [ ] `tests/unit/settings/loader.test.ts` - 配置优先级合并
- 目标：核心模块覆盖率 ≥ 80%

**S3-2: Plan/Act 模式（3天）**
- [ ] 实现 `/plan` 命令，进入只读模式
  - Plan 模式：只允许 FileRead、Glob、Grep、Agent（只读）
  - Act 模式：恢复完整工具集
- [ ] StatusBar 显示当前模式：`[PLAN MODE]` / `[ACT MODE]`
- [ ] `/act` 命令退出 Plan 模式并进入执行

**S3-3: 打包分发（3天）**
- [ ] `bun build --compile` 生成各平台二进制
- [ ] GitHub Actions CI: 构建 + 测试 + 打包
- [ ] GitHub Releases 自动上传二进制
- [ ] 安装脚本 `install.sh` / `install.ps1`
- [ ] PATH 设置引导（首次运行检测并提示）

---

## v0.3 — Feature Complete（约 6-8 周）

### 国产模型生态

- [ ] **阿里云通义千问 (Qwen)**: `src/providers/qwen.ts`
  - API: `https://dashscope.aliyuncs.com/compatible-mode/v1`
  - 模型: qwen-max, qwen-plus, qwen-turbo
  - 环境变量: `DASHSCOPE_API_KEY`

- [ ] **字节跳动 Doubao**: `src/providers/doubao.ts`
  - API: `https://ark.cn-beijing.volces.com/api/v3`
  - 环境变量: `ARK_API_KEY`

- [ ] **智谱 GLM**: `src/providers/glm.ts`
  - API: `https://open.bigmodel.cn/api/paas/v4`
  - 模型: glm-4-plus, glm-4-flash
  - 环境变量: `ZHIPUAI_API_KEY`

- [ ] **本地 Ollama**: `src/providers/ollama.ts`
  - 连接: `http://localhost:11434/api/chat`
  - 自动检测本地模型列表

### MCP 生态完整化

- [ ] SSE transport 实现
- [ ] MCP 官方注册表浏览（`/mcp install`）
- [ ] MCP 服务器热插拔（不重启）
- [ ] `/mcp` 管理命令：list/add/remove/status
- [ ] OAuth 2.0 授权流（browser-based）

### 高级功能

- [ ] **repo-map 轻量仓库索引**（借鉴 Aider）
  - 用 fast-glob + treesitter 提取项目符号
  - 默认 2k tokens，按 budget 动态缩放
  - 自动注入到系统提示

- [ ] **test-fix-commit 工作流**
  - `/test` 命令：运行测试→失败时自动修复→重试→成功后提交
  - 最大重试 3 次，失败时报告详情

- [ ] **@mention 上下文注入**
  - `@file` 注入文件内容
  - `@folder` 注入目录结构
  - `@url` 注入网页内容
  - 在 PromptInput 中支持 Tab 补全

- [ ] **Bedrock / Vertex AI**（企业用户）

---

## v1.0 — GA（约 12-16 周）

- [ ] 自动更新机制
- [ ] 完整用户文档站点
- [ ] VSCode 扩展（基于 QiLing Core）
- [ ] QiLing SDK（开放 Agent 构建接口）
- [ ] 团队记忆（共享 QILING.md 协作）
- [ ] 插件市场（社区扩展）

---

## 优先级决策矩阵

```
当前阶段应聚焦:
1. 先让 v0.1 稳定可靠（重试 + 中断 + compact修复）→ v0.2
2. 补测试，不能在无测试覆盖下继续叠功能
3. 国产模型（Qwen/Doubao）是目标用户最需要的差异化功能
4. 之后才是 Plan/Act、repo-map 等进阶功能
```
