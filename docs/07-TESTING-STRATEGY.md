# 启灵 (QiLing) — 测试策略文档

> **版本**: v1.0 | **日期**: 2026-05-01  
> **测试框架**: Bun Test（内置，无需额外安装）

---

## 1. 测试目标

| 层次 | 覆盖率目标 | 优先级 |
|---|---|---|
| 核心业务逻辑（query、permissions、settings）| ≥ 80% | P0 |
| 工具实现（File*, Glob, Grep）| ≥ 70% | P0 |
| Provider 层（Anthropic, OpenAI-compat）| ≥ 60% | P1 |
| TUI 组件（REPL, Message）| ≥ 30%（快照测试）| P2 |

---

## 2. 测试层次

### 2.1 单元测试（优先实现）

**权限规则引擎** — `tests/unit/permissions/rules.test.ts`

```typescript
import { describe, test, expect } from 'bun:test'
import { evaluateRules, checkRules } from '../../../src/permissions/rules'

describe('glob rule matching', () => {
  test('exact tool name match', () => {
    expect(evaluateRules(['Bash'], 'Bash', 'git status')).toBe(true)
    expect(evaluateRules(['Bash'], 'FileRead', 'test.ts')).toBe(false)
  })

  test('wildcard arg match', () => {
    expect(evaluateRules(['Bash(git *)'], 'Bash', 'git commit -m "fix"')).toBe(true)
    expect(evaluateRules(['Bash(git *)'], 'Bash', 'rm -rf /')).toBe(false)
  })

  test('deny rules take priority over allow', () => {
    const result = checkRules(
      ['Bash(git *)'],
      ['Bash(git push --force*)'],
      'Bash',
      'git push --force origin main'
    )
    expect(result?.type).toBe('deny')
  })

  test('file path glob matching', () => {
    expect(evaluateRules(['FileEdit(src/*.ts)'], 'FileEdit', 'src/auth.ts')).toBe(true)
    expect(evaluateRules(['FileEdit(src/*.ts)'], 'FileEdit', 'tests/auth.test.ts')).toBe(false)
  })
})
```

**FileEdit 工具** — `tests/unit/tools/FileEditTool.test.ts`

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { FileEditTool } from '../../../src/tools/FileEditTool'

const TEST_DIR = '/tmp/qiling-test'
const TEST_FILE = join(TEST_DIR, 'test.ts')

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
  writeFileSync(TEST_FILE, 'function hello() {\n  return "world"\n}\n')
})
afterEach(() => { try { unlinkSync(TEST_FILE) } catch {} })

const ctx = { workingDir: TEST_DIR, sessionId: 'test' }

test('successful single replacement', async () => {
  const result = await FileEditTool.call({
    file_path: 'test.ts',
    old_string: 'return "world"',
    new_string: 'return "qiling"',
    replace_all: false,
  }, ctx)
  expect(result.isError).toBeFalsy()
})

test('fails when old_string not found', async () => {
  const result = await FileEditTool.call({
    file_path: 'test.ts',
    old_string: 'does not exist',
    new_string: 'replacement',
    replace_all: false,
  }, ctx)
  expect(result.isError).toBe(true)
  expect(result.content[0].text).toContain('not found')
})

test('fails on duplicate old_string without replace_all', async () => {
  writeFileSync(TEST_FILE, 'a\na\n')
  const result = await FileEditTool.call({
    file_path: 'test.ts',
    old_string: 'a',
    new_string: 'b',
    replace_all: false,
  }, ctx)
  expect(result.isError).toBe(true)
  expect(result.content[0].text).toContain('2 occurrences')
})
```

**Settings 加载** — `tests/unit/settings/loader.test.ts`

```typescript
test('CLI overrides project config', () => {
  const settings = loadSettings('/test-dir', { model: 'gpt-4o' })
  expect(settings.model).toBe('gpt-4o')
})

test('project config overrides global', () => {
  // Write project settings, verify priority
})

test('env var MINIMAX_API_KEY sets apiKey', () => {
  process.env.MINIMAX_API_KEY = 'test-key'
  const settings = loadSettings('/test-dir')
  expect(settings.apiKey).toBe('test-key')
  delete process.env.MINIMAX_API_KEY
})
```

**Query Engine 重试逻辑** — `tests/unit/query.test.ts`

```typescript
test('retries on 429 with backoff', async () => {
  let callCount = 0
  const mockProvider = {
    async *stream() {
      callCount++
      if (callCount < 3) {
        yield { type: 'error', error: '429 Rate limit exceeded' }
        return
      }
      yield { type: 'text_delta', text: 'success' }
      yield { type: 'stop', stopReason: 'end_turn', usage: emptyUsage() }
    },
    countTokens: () => 0,
    getContextWindow: () => 200000,
    config: mockConfig(),
  }

  const result = await runQuery(
    [{ role: 'user', content: 'test' }],
    new Map(),
    mockProvider,
    mockPermissions(),
  )
  expect(callCount).toBe(3)
  expect(result.stopReason).toBe('end_turn')
})
```

### 2.2 集成测试

**Provider 接口合规** — `tests/integration/provider.test.ts`

```typescript
// 仅在 INTEGRATION_TEST=1 时运行（需要真实 API key）
const runIntegration = process.env.INTEGRATION_TEST === '1'

describe.if(runIntegration)('Anthropic provider integration', () => {
  test('streams text delta', async () => {
    const provider = new AnthropicProvider({...})
    const chunks: string[] = []
    for await (const chunk of provider.stream([{role:'user',content:'Say hi'}], [])) {
      if (chunk.type === 'text_delta') chunks.push(chunk.text)
    }
    expect(chunks.length).toBeGreaterThan(0)
  })
})
```

### 2.3 E2E 场景测试（P2，CI 级别）

```typescript
// tests/e2e/basic-workflow.test.ts
// 验证完整工作流：用户输入 → 工具调用 → 文件修改

test('can read and edit a file', async () => {
  // 创建临时项目目录
  // 启动 QiLing（headless 模式）
  // 发送 "读取 hello.ts 并在末尾添加一行注释"
  // 验证文件被正确修改
})
```

---

## 3. 测试运行

```bash
# 运行所有测试
bun test

# 运行特定文件
bun test tests/unit/permissions/

# 带覆盖率（目标输出）
bun test --coverage

# 只运行集成测试
INTEGRATION_TEST=1 bun test tests/integration/

# watch 模式（开发时）
bun test --watch src/ tests/
```

---

## 4. Mock 策略

```typescript
// tests/helpers/mocks.ts

export function mockProvider(responses: StreamChunk[][]): Provider {
  let callIndex = 0
  return {
    config: { name: 'mock', displayName: 'Mock', model: 'mock-model' },
    async *stream() {
      for (const chunk of responses[callIndex++ % responses.length]) {
        yield chunk
      }
    },
    countTokens: () => 100,
    getContextWindow: () => 200000,
  }
}

export function mockPermissions(defaultDecision: 'allow' | 'deny' = 'allow'): PermissionManager {
  return {
    check: async () => ({ type: defaultDecision }),
    recordDecision: () => {},
  }
}

export function textResponse(text: string): StreamChunk[] {
  return [
    { type: 'text_delta', text },
    { type: 'stop', stopReason: 'end_turn', usage: emptyUsage() },
  ]
}
```

---

## 5. CI/CD 流水线

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run typecheck
      - run: bun test --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - run: bun build src/main.tsx --compile --outfile dist/qiling
      - run: ./dist/qiling --version
```

---

## 6. 测试优先级执行顺序

按 gap-analysis 的 P0 Blocker 顺序：

```
Week 1:
  ✅ tests/unit/permissions/rules.test.ts   (核心安全)
  ✅ tests/unit/tools/FileEditTool.test.ts  (最常用工具)
  ✅ tests/unit/settings/loader.test.ts     (配置优先级)

Week 2:
  ✅ tests/unit/query.test.ts              (重试逻辑)
  ✅ tests/unit/tools/GlobTool.test.ts     (文件搜索)
  ✅ tests/unit/tools/FileReadTool.test.ts (文件读取)

Week 3:
  ✅ tests/integration/provider.test.ts   (API 接口合规)
  ✅ 补全覆盖率到 80%
```
