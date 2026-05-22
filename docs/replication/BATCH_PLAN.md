# BATCH_PLAN.md

> **Phase:** B — 增量对齐
> **策略:** T0 核心运行时优先，自底向上
> **生成时间:** 2026-05-22T12:29
> **T0 待处理:** 19 个文件 · 3 个批次

---

## 铁律回顾

- 每完成 1 个文件**立即**更新 ALIGNMENT_TRACKER.md
- PARTIAL 用**增量补丁**，严禁整文件覆盖
- 发现 QiLing 实现更优时，保留并在 Notes 标 `improved:<点>`
- 单批次完成后跑 `bun run typecheck`，失败项进 Notes

---

## T0 批次总览

| 批次 | 文件数 | 估算行数 | 状态 | 说明 |
|------|--------|---------|------|------|
| B-001 | 7 | ~2129 | ⏳ PENDING | migrations + bootstrap/state |
| B-002 | 7 | ~773 | ⏳ PENDING | query/* + state/selectors 等 |
| B-003 | 5 | ~1157 | ⏳ PENDING | state/AppState 重型文件 |

---

## B-001 · migrations + bootstrap/state.ts（低风险，逻辑简单）

> **文件数:** 7 · **估算行数:** ~2129 · **状态:** ⏳ PENDING

| # | 文件 | Op | CC行数 | 说明 |
|---|------|----|----|------|
| 1 | `migrations/migrateReplBridgeEnabledToRemoteControlAtStartu…` | `adapt-complete` | 50 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 2 | `bootstrap/state.ts` | `copy` | 1758 | CC的全局启动状态(cwd/mode/useCowork等)。QiLing用settings/loader.ts替代，可轻量实现。 |
| 3 | `migrations/migrateAutoUpdatesToSettings.ts` | `copy` | 61 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 4 | `migrations/migrateBypassPermissionsAcceptedToSettings.ts` | `copy` | 40 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 5 | `migrations/migrateEnableAllProjectMcpServersToSettings.ts` | `copy` | 118 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 6 | `migrations/migrateFennecToOpus.ts` | `copy` | 45 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 7 | `migrations/migrateLegacyOpusToCurrent.ts` | `copy` | 57 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |

### 执行步骤

```
# 1. migrations/migrateReplBridgeEnabledToRemoteControlAtStartu…
#    op=adapt-complete  verdict=PARTIAL  CC=50lines
# 2. bootstrap/state.ts
#    op=copy  verdict=MISSING  CC=1758lines
# 3. migrations/migrateAutoUpdatesToSettings.ts
#    op=copy  verdict=MISSING  CC=61lines
# 4. migrations/migrateBypassPermissionsAcceptedToSettings.ts
#    op=copy  verdict=MISSING  CC=40lines
# 5. migrations/migrateEnableAllProjectMcpServersToSettings.ts
#    op=copy  verdict=MISSING  CC=118lines
# 6. migrations/migrateFennecToOpus.ts
#    op=copy  verdict=MISSING  CC=45lines
# 7. migrations/migrateLegacyOpusToCurrent.ts
#    op=copy  verdict=MISSING  CC=57lines
```

**完成后：**
1. `bun run typecheck` → 失败项记入 Notes
2. 更新 ALIGNMENT_TRACKER.md 中以上 7 条的 Status
3. 将 B-001 状态改为 ✅ DONE

---

## B-002 · query/deps + query/stopHooks + state/selectors（中等复杂）

> **文件数:** 7 · **估算行数:** ~773 · **状态:** ⏳ PENDING

| # | 文件 | Op | CC行数 | 说明 |
|---|------|----|----|------|
| 1 | `migrations/migrateOpusToOpus1m.ts` | `copy` | 43 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 2 | `migrations/migrateSonnet1mToSonnet45.ts` | `copy` | 48 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 3 | `migrations/migrateSonnet45ToSonnet46.ts` | `copy` | 67 | CC配置迁移脚本。QiLing版只需简单stub(已有1个)，批量处理。 |
| 4 | `migrations/resetAutoModeOptInForDefaultOffer.ts` | `copy` | 51 | One-shot migration: clear skipAutoPermissionPrompt for users who accepte |
| 5 | `migrations/resetProToOpusDefault.ts` | `copy` | 51 | resetProToOpusDefault.ts |
| 6 | `query/deps.ts` | `copy` | 40 | QiLing已有query/StreamingToolExecutor.ts，deps.ts补充依赖注入类型即可。 |
| 7 | `query/stopHooks.ts` | `copy` | 473 | Stop hook执行器，配合hooks系统使用。 |

### 执行步骤

```
# 1. migrations/migrateOpusToOpus1m.ts
#    op=copy  verdict=MISSING  CC=43lines
# 2. migrations/migrateSonnet1mToSonnet45.ts
#    op=copy  verdict=MISSING  CC=48lines
# 3. migrations/migrateSonnet45ToSonnet46.ts
#    op=copy  verdict=MISSING  CC=67lines
# 4. migrations/resetAutoModeOptInForDefaultOffer.ts
#    op=copy  verdict=MISSING  CC=51lines
# 5. migrations/resetProToOpusDefault.ts
#    op=copy  verdict=MISSING  CC=51lines
# 6. query/deps.ts
#    op=copy  verdict=MISSING  CC=40lines
# 7. query/stopHooks.ts
#    op=copy  verdict=MISSING  CC=473lines
```

**完成后：**
1. `bun run typecheck` → 失败项记入 Notes
2. 更新 ALIGNMENT_TRACKER.md 中以上 7 条的 Status
3. 将 B-002 状态改为 ✅ DONE

---

## B-003 · state/AppState* 重型文件（高复杂，建议逐文件决策）

> **文件数:** 5 · **估算行数:** ~1157 · **状态:** ⏳ PENDING

| # | 文件 | Op | CC行数 | 说明 |
|---|------|----|----|------|
| 1 | `state/AppState.tsx` | `copy` | 200 | 重型！CC的完整应用状态(1000+行)。QiLing用简化版替代，建议adapt-new而非copy。 |
| 2 | `state/AppStateStore.ts` | `copy` | 569 | AppState的Store层，与AppState.tsx强耦合。 |
| 3 | `state/onChangeAppState.ts` | `copy` | 171 | 状态变更副作用(Bridge/SDK/Telemetry)，大部分不适用QiLing。 |
| 4 | `state/selectors.ts` | `copy` | 76 | 已有QL-only版本(PARTIAL)，补充缺失选择器即可。 |
| 5 | `state/teammateViewHelpers.ts` | `copy` | 141 | Teammate视图助手，依赖Swarm架构，低优先级。 |

### 执行步骤

```
# 1. state/AppState.tsx
#    op=copy  verdict=MISSING  CC=200lines
# 2. state/AppStateStore.ts
#    op=copy  verdict=MISSING  CC=569lines
# 3. state/onChangeAppState.ts
#    op=copy  verdict=MISSING  CC=171lines
# 4. state/selectors.ts
#    op=copy  verdict=MISSING  CC=76lines
# 5. state/teammateViewHelpers.ts
#    op=copy  verdict=MISSING  CC=141lines
```

**完成后：**
1. `bun run typecheck` → 失败项记入 Notes
2. 更新 ALIGNMENT_TRACKER.md 中以上 5 条的 Status
3. 将 B-003 状态改为 ✅ DONE

---

## 后续 T 层批次规划（待 T0 完成后展开）

| T 层 | MISSING | PARTIAL | 预估批次数 | 建议顺序 |
|------|---------|---------|-----------|----------|
| T4 Ink基础 | 38 | 34 | 10 | 第2优先（T0完成后，T2/T3依赖T4） |
| T7 类型/常量 | 13 | 5 | 3 | 第3优先（类型依赖少） |
| T3 Hooks层 | 78 | 5 | 12 | 第4优先 |
| T5 服务层 | 99 | 23 | 18 | 第5优先 |
| T1 工具层 | 110 | 52 | 23 | 第6优先 |
| T6 基础工具 | 342 | 141 | 60+ | 最大体量，分领域处理 |
| T2 UI层 | 299 | 25 | 40+ | 依赖T4/T6完成后处理 |
| EXT 外部集成 | 140+ | — | 按需 | Bridge/CLI按需对齐 |
