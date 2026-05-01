import type { Provider, ProviderConfig, StreamChunkType } from '../../src/types/provider'
import type { PermissionManager } from '../../src/types/tool'
import type { Message, TokenUsage } from '../../src/types/message'
import type { Settings } from '../../src/settings/schema'

export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

export function mockConfig(overrides?: Partial<ProviderConfig>): ProviderConfig {
  return {
    name: 'mock',
    displayName: 'Mock Provider',
    model: 'mock-model',
    ...overrides,
  }
}

/** Create a mock provider that yields the given chunk sequences on each call */
export function mockProvider(responses: StreamChunkType[][]): Provider {
  let callIndex = 0
  return {
    config: mockConfig(),
    async *stream(): AsyncGenerator<StreamChunkType> {
      const chunks = responses[callIndex++ % responses.length]
      for (const chunk of chunks) yield chunk
    },
    countTokens: () => 100,
    getContextWindow: () => 200_000,
  }
}

/** Provider that fails N times, then succeeds */
export function failThenSucceedProvider(failCount: number, errorMsg = '429 Rate limit'): Provider {
  let calls = 0
  return {
    config: mockConfig(),
    async *stream(): AsyncGenerator<StreamChunkType> {
      calls++
      if (calls <= failCount) {
        yield { type: 'error', error: errorMsg }
        return
      }
      yield { type: 'text_delta', text: 'success' }
      yield { type: 'stop', stopReason: 'end_turn', usage: emptyUsage() }
    },
    countTokens: () => 0,
    getContextWindow: () => 200_000,
  }
}

export function mockPermissions(defaultDecision: 'allow' | 'deny' = 'allow'): PermissionManager {
  return {
    check: async () => ({ type: defaultDecision }),
    recordDecision: () => {},
  }
}

export function textResponse(text: string): StreamChunkType[] {
  return [
    { type: 'text_delta', text },
    { type: 'stop', stopReason: 'end_turn', usage: emptyUsage() },
  ]
}

export function toolUseResponse(
  id: string,
  name: string,
  input: Record<string, unknown>,
  text = ''
): StreamChunkType[] {
  const inputJson = JSON.stringify(input)
  return [
    ...(text ? [{ type: 'text_delta' as const, text }] : []),
    { type: 'tool_use_start', id, name },
    { type: 'tool_use_delta', id, inputDelta: inputJson },
    { type: 'tool_use_stop', id },
    { type: 'stop', stopReason: 'tool_use', usage: emptyUsage() },
  ]
}

export const MOCK_USER_MSG: Message = { role: 'user', content: 'test message' }
