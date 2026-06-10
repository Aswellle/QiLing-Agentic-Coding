# Auto-Loop Entry Point — copy & paste after `!claude /loop /prompt`

---

用 QiLing 项目的 CLAUDE.md Part B 复刻协议，持续执行 Phase B（增量对齐）编码任务，直到上下文耗尽或 5h 额度用光。每轮迭代一个文件或一个最小批次，三阶段执行：写入代码 → typecheck 修复 → 更新 tracker + commit + push。

## 工作基线

- **参考源**: `D:\Git-Clone\CC-SRC\claude-code-sourcemap\restored-src\src\`
- **目标**: `D:\Git-Clone\QiLing\src\`
- **Tracker**: `D:\Git-Clone\QiLing\docs\replication\ALIGNMENT_TRACKER.md`
- **Batch Plan**: `D:\Git-Clone\QiLing\docs\replication\BATCH_PLAN.md`
- **Command**: `bun run typecheck` (在 `D:\Git-Clone\QiLing` 目录下)

## 每轮循环步骤

### 步骤 0: 读取 tracker 顶部 + BATCH_PLAN 找到下一个要做的东西

Read ALIGNMENT_TRACKER.md 前 3 行 + BATCH_PLAN.md。判断：
- 如果某批次有状态为 PENDING 且文件清单中 Status=UNTOUCHED 的 → 处理该批次第一个未做文件
- 否则 grep "MISSING.*high.*UNTOUCHED" ALIGNMENT_TRACKER.md → 找 Op 为 copy/adapt-new 的文件
- 按优先级: T0 > T1 > T6 > T3 > T7 > T5 > T2 > T4

### 步骤 1: 复制/写入

- 对于 `copy` / `adapt-new` 文件: 从参考源 cp 对应路径到目标
- 对于 `copy-block` (PARTIAL): 从参考源摘对应函数粘贴进入 QiLing 已有文件
- 添加必填标记: `// LOC:`(UI字符串), `// NAME:`(品牌), `// FROM CC:`, `// QILING-IDENTITY:`

### 步骤 2: typecheck 修复

```bash
cd D:\Git-Clone\QiLing && bun run typecheck
```

- 修 import 路径 (`AppState.js` → `AppStateStore.js`, `state/state.js` → `state/AppStateStore.js`, `src/` → `../../`)
- 修 `ToolPermissionContext` 差异 (cast via `as never` 或 `as unknown as`)
- 修 `Message` 形状 (`msg.type` → `msg.role`, `msg.message.content` → `msg.content`)
- 缺模块 → 写 stub（最小导出，`// FROM CC: ... — STUB` 标记）
- `bun-bundle` 缺 → 已有 `.d.ts`；`lodash-es/*` 缺 → 已有
- 依赖不可修复的 → BLOCKED 标记写 tracker Notes
- 所有修复必须做 `git add` 后再 typecheck 确认

### 步骤 3: 更新 tracker + commit + push

- 改 ALIGNMENT_TRACKER.md 中对应文件行的 Status 为 ALIGNED + Target Path 填入
- 更新顶部 Last Updated 和 Active Batch
- commit:
  ```
  B-<batch>: <file> (<op>)
  - <key adaptation notes>
  ```
- `git push origin main`

### 步骤 4: 循环继续

- 回到步骤 0
- 如果当前文件无法修复（BLOCKED），跳到下一个
- 如果该批次全部完成，把 BATCH_PLAN 中对应批次改为 ✅ DONE
- 如果 MISSING 文件数为 0 或上下文使用 ≥ 70%，输出总结并结束循环

## 关键类型适配速查

| CC 表达式 | QiLing 表达式 |
|-----------|---------------|
| `import type { AppState } from '../../state/AppState.js'` | `import type { AppState } from '../../state/AppStateStore.js'` |
| `m.role === 'assistant'` | (same — QiLing Message 已变平) |
| `m.type !== 'assistant'` | `m.role !== 'assistant'` |
| `lastAssistantMessage.message.content` | `lastAssistantMessage.content` (加 `Array.isArray` 守卫) |
| `lastAssistantMessage.message.usage` | `lastAssistantMessage.usage` |
| `lastAssistantMessage.requestId` | `lastAssistantMessage.uuid` |
| `ToolPermissionContext` (Tool.ts) | `ToolPermissionContext` (AppStateStore) — cast via `as never` |
| `bun-bundle` / `feature('X')` | `false as boolean` / 已有 `.d.ts` |
| `from 'src/...'` | `from '../../...'` 加 `.js` |
| `getTaskByType(task.type)` | 已做 `tasks.ts` router |

## 目标判定

- ⛔ 当 MISSING 文件数为 0 或本轮无任何代码写入 → 终止循环
- ⛔ 当连续 2 轮同一个文件 BLOCKED → 跳过后终止
- ⛔ 当 `bun test` 测试失败 > 5 个（超出预存范围）→ 终止检查
- ✅ 否则一直循环直到上下文耗尽
