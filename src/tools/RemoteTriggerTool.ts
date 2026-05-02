import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import {
  createTrigger, getTrigger, listTriggers, updateTrigger, deleteTrigger,
  type RemoteTrigger,
} from '../services/triggers/store'

const inputSchema = z.object({
  action: z.enum(['list', 'get', 'create', 'update', 'run', 'delete']).describe(
    'list=show all, get=inspect one, create=register, update=modify, run=fire, delete=remove'
  ),
  trigger_id: z.string().optional().describe(
    'Trigger ID or name. Required for get/update/run/delete.'
  ),
  body: z.object({
    name: z.string().optional(),
    url: z.string().url().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).optional(),
    headers: z.record(z.string()).optional(),
    default_payload: z.record(z.unknown()).optional(),
    description: z.string().optional(),
  }).optional().describe(
    'For create/update: trigger configuration. For run: overrides to merge into default payload.'
  ),
  payload: z.record(z.unknown()).optional().describe(
    'For run: ad-hoc payload to send (merged with default_payload, overrides win).'
  ),
})

type Input = z.infer<typeof inputSchema>

// ─── HTTP executor ────────────────────────────────────────────────────────────

async function fireTrigger(
  trigger: RemoteTrigger,
  payloadOverrides?: Record<string, unknown>
): Promise<{ status: number; body: string }> {
  const payload = { ...(trigger.defaultPayload ?? {}), ...(payloadOverrides ?? {}) }
  const isGet = trigger.method === 'GET'

  const url = isGet && Object.keys(payload).length > 0
    ? `${trigger.url}?${new URLSearchParams(Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, String(v)])
      )).toString()}`
    : trigger.url

  const res = await fetch(url, {
    method: trigger.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'QiLing/0.2 (AI Agent Remote Trigger)',
      ...(trigger.headers ?? {}),
    },
    ...(isGet ? {} : { body: JSON.stringify(payload) }),
    signal: AbortSignal.timeout(20_000),
  })

  const body = await res.text()
  return { status: res.status, body }
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const RemoteTriggerTool: Tool<Input> = {
  name: 'RemoteTrigger',

  description:
    'Manage and fire remote webhook triggers. ' +
    'Register HTTP endpoints (webhooks, CI/CD APIs, GitHub Actions, custom APIs) ' +
    'and fire them by name with optional payload overrides. ' +
    'Supports Bearer tokens via the headers field. ' +
    'Triggers are session-scoped (use create at session start to register recurring ones). ' +
    'Actions: list / get / create / update / run / delete.',

  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    if (input.action === 'list' || input.action === 'get') return { type: 'allow' }
    if (input.action === 'run') {
      const t = input.trigger_id ? getTrigger(input.trigger_id) : null
      return {
        type: 'ask',
        description: t
          ? `Fire webhook: ${t.method} ${t.url}`
          : `Fire remote trigger: ${input.trigger_id ?? 'unknown'}`,
      }
    }
    return { type: 'allow' }
  },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    switch (input.action) {

      // ── list ──────────────────────────────────────────────────────────────
      case 'list': {
        const all = listTriggers()
        if (all.length === 0) {
          return { content: [{ type: 'text', text: 'No triggers registered. Use RemoteTrigger(action="create") to add one.' }] }
        }
        const lines = all.map(t =>
          `${t.id}  [${t.method}]  ${t.name}  →  ${t.url}` +
          (t.lastRunAt ? `  (last run: ${new Date(t.lastRunAt).toLocaleString()}, status: ${t.lastStatus ?? '?'})` : '')
        )
        return { content: [{ type: 'text', text: lines.join('\n') + '\n\n' + JSON.stringify({ triggers: all }) }] }
      }

      // ── get ───────────────────────────────────────────────────────────────
      case 'get': {
        if (!input.trigger_id) {
          return { content: [{ type: 'text', text: 'Error: trigger_id required for get' }], isError: true }
        }
        const t = getTrigger(input.trigger_id)
        if (!t) {
          return { content: [{ type: 'text', text: `Error: trigger '${input.trigger_id}' not found` }], isError: true }
        }
        return { content: [{ type: 'text', text: JSON.stringify(t, null, 2) }] }
      }

      // ── create ────────────────────────────────────────────────────────────
      case 'create': {
        const b = input.body
        if (!b?.url || !b.name) {
          return {
            content: [{ type: 'text', text: 'Error: body.name and body.url are required for create' }],
            isError: true,
          }
        }
        const t = createTrigger(b.name, b.url, b.method ?? 'POST', b.headers, b.default_payload as Record<string, unknown>, b.description)
        return { content: [{ type: 'text', text: `Trigger created.\n${JSON.stringify({ id: t.id, name: t.name, url: t.url })}` }] }
      }

      // ── update ────────────────────────────────────────────────────────────
      case 'update': {
        if (!input.trigger_id) {
          return { content: [{ type: 'text', text: 'Error: trigger_id required for update' }], isError: true }
        }
        const ok = updateTrigger(input.trigger_id, {
          name: input.body?.name,
          url: input.body?.url,
          method: input.body?.method,
          headers: input.body?.headers,
          defaultPayload: input.body?.default_payload as Record<string, unknown>,
          description: input.body?.description,
        })
        if (!ok) return { content: [{ type: 'text', text: `Error: trigger '${input.trigger_id}' not found` }], isError: true }
        return { content: [{ type: 'text', text: `Trigger '${input.trigger_id}' updated.` }] }
      }

      // ── run ───────────────────────────────────────────────────────────────
      case 'run': {
        if (!input.trigger_id) {
          return { content: [{ type: 'text', text: 'Error: trigger_id required for run' }], isError: true }
        }
        const t = getTrigger(input.trigger_id)
        if (!t) {
          return { content: [{ type: 'text', text: `Error: trigger '${input.trigger_id}' not found` }], isError: true }
        }
        let result: { status: number; body: string }
        try {
          result = await fireTrigger(t, input.payload)
        } catch (err) {
          return { content: [{ type: 'text', text: `HTTP error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
        }
        updateTrigger(t.id, { lastRunAt: Date.now(), lastStatus: result.status })
        const lines = result.body.split('\n').length
        const preview = result.body.length > 2000 ? result.body.slice(0, 2000) + '\n…' : result.body
        return {
          content: [{ type: 'text', text: `HTTP ${result.status} (${lines} lines)\n\n${preview}` }],
          isError: result.status >= 400,
        }
      }

      // ── delete ────────────────────────────────────────────────────────────
      case 'delete': {
        if (!input.trigger_id) {
          return { content: [{ type: 'text', text: 'Error: trigger_id required for delete' }], isError: true }
        }
        const ok = deleteTrigger(input.trigger_id)
        if (!ok) return { content: [{ type: 'text', text: `Error: trigger '${input.trigger_id}' not found` }], isError: true }
        return { content: [{ type: 'text', text: `Trigger '${input.trigger_id}' deleted.` }] }
      }
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['list', 'get', 'create', 'update', 'run', 'delete'] },
          trigger_id: { type: 'string', description: 'Trigger ID or name' },
          body: {
            type: 'object',
            description: 'Config for create/update, or payload override for run',
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH'] },
              headers: { type: 'object' },
              default_payload: { type: 'object' },
              description: { type: 'string' },
            },
          },
          payload: { type: 'object', description: 'Ad-hoc payload for run action' },
        },
        required: ['action'],
      },
    }
  },
}
