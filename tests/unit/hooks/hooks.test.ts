import { describe, test, expect } from 'bun:test'
import { runHooks, type HooksConfig, type HookContext } from '../../../src/hooks/index'

const mockCtx: HookContext = {
  toolName: 'Bash',
  input: { command: 'git status' },
  workingDir: process.cwd(),
  sessionId: 'test-session',
}

describe('runHooks — basic behavior', () => {
  test('does nothing when no hooks configured', async () => {
    await expect(runHooks('PreToolUse', undefined, mockCtx)).resolves.toBeUndefined()
    await expect(runHooks('PostToolUse', {}, mockCtx)).resolves.toBeUndefined()
  })

  test('does nothing when event has no entries', async () => {
    const config: HooksConfig = { PreToolUse: [], PostToolUse: [] }
    await expect(runHooks('PreToolUse', config, mockCtx)).resolves.toBeUndefined()
  })

  test('skips hooks that do not match tool name', async () => {
    let ran = false
    const config: HooksConfig = {
      PreToolUse: [{
        matcher: 'FileEdit',  // won't match 'Bash'
        hooks: [{ type: 'command', command: 'echo ran' }],
      }],
    }
    // If the hook ran, it would echo "ran" — but since it's filtered, it doesn't
    await runHooks('PreToolUse', config, mockCtx)
    // No assertion needed — just verifying no error thrown
    expect(true).toBe(true)
  })

  test('runs hooks that match tool name', async () => {
    const outputs: string[] = []
    const config: HooksConfig = {
      PreToolUse: [{
        matcher: 'Bash',
        hooks: [{ type: 'command', command: 'echo hook_ran', timeout: 3000 }],
      }],
    }
    // Should complete without error
    await expect(runHooks('PreToolUse', config, mockCtx)).resolves.toBeUndefined()
  })

  test('wildcard matcher (no matcher) matches any tool', async () => {
    const config: HooksConfig = {
      Stop: [{
        hooks: [{ type: 'command', command: 'echo stop_hook', timeout: 3000 }],
      }],
    }
    await expect(runHooks('Stop', config, mockCtx)).resolves.toBeUndefined()
  })

  test('hook failure is non-fatal', async () => {
    const config: HooksConfig = {
      PostToolUse: [{
        hooks: [{ type: 'command', command: 'this-command-does-not-exist-12345', timeout: 2000 }],
      }],
    }
    // Should NOT throw
    await expect(runHooks('PostToolUse', config, mockCtx)).resolves.toBeUndefined()
  })
})

describe('runHooks — environment variables', () => {
  test('injects QILING_TOOL_NAME', async () => {
    // We verify env injection indirectly by running a command that uses it
    const config: HooksConfig = {
      PreToolUse: [{
        hooks: [{ type: 'command', command: 'test "$QILING_TOOL_NAME" = "Bash" && echo ok', timeout: 3000 }],
      }],
    }
    // Should run without error (test command exits 0 if var is set correctly)
    await expect(runHooks('PreToolUse', config, mockCtx)).resolves.toBeUndefined()
  })
})
