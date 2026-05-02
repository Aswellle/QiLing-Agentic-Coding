/**
 * Plugin loader — scans .qiling/plugins/ for *.ts / *.js files and dynamically
 * imports them. Each file must export a default PluginManifest.
 *
 * Tool names are automatically prefixed: plugin__<pluginId>__<toolName>
 * This keeps plugin tools clearly labelled and avoids name collisions.
 *
 * Usage in main.tsx:
 *   const plugins = await loadPlugins(workingDir)
 *   for (const p of plugins) {
 *     for (const tool of p.tools) registry.set(tool.name, tool)
 *     BUILTIN_COMMANDS.push(...p.commands)
 *   }
 */

import { existsSync, readdirSync } from 'fs'
import { join, basename, extname } from 'path'
import { homedir } from 'os'
import type { LoadedPlugin, PluginManifest } from './types'
import type { Tool } from '../types/tool'

const PLUGIN_DIRS = [
  // Local project plugins (highest priority)
  '.qiling/plugins',
  // Global user plugins
  join(homedir(), '.qiling', 'plugins'),
]

function sanitiseId(filename: string): string {
  return basename(filename, extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
}

function prefixTool(tool: Tool, pluginId: string): Tool {
  const prefixedName = `plugin__${pluginId}__${tool.name}`
  return {
    ...tool,
    name: prefixedName,
    description: `[Plugin: ${pluginId}] ${tool.description}`,
    toDefinition: () => {
      const def = tool.toDefinition()
      return { ...def, name: prefixedName, description: `[Plugin: ${pluginId}] ${def.description}` }
    },
  }
}

export async function loadPlugins(workingDir: string): Promise<LoadedPlugin[]> {
  const loaded: LoadedPlugin[] = []
  const seen = new Set<string>()

  const searchDirs = [
    join(workingDir, '.qiling', 'plugins'),
    ...PLUGIN_DIRS.filter(d => !d.startsWith('.')),
  ]

  for (const dir of searchDirs) {
    const absDir = dir.startsWith('/') || dir.match(/^[A-Z]:/) ? dir : join(workingDir, dir)
    if (!existsSync(absDir)) continue

    let files: string[]
    try {
      files = readdirSync(absDir)
        .filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs'))
        .filter(f => !f.startsWith('_'))  // underscore = disabled
    } catch {
      continue
    }

    for (const file of files) {
      const fullPath = join(absDir, file)
      const id = sanitiseId(file)

      if (seen.has(id)) continue  // local plugin overrides global
      seen.add(id)

      const plugin: LoadedPlugin = {
        id,
        name: id,
        description: '',
        sourcePath: fullPath,
        toolCount: 0,
        commandCount: 0,
        tools: [],
        commands: [],
      }

      try {
        const mod = await import(fullPath) as { default?: PluginManifest }
        const manifest: PluginManifest = mod.default ?? {}

        plugin.name = manifest.name ?? id
        plugin.description = manifest.description ?? ''

        // Prefix all tool names to avoid collisions
        plugin.tools = (manifest.tools ?? []).map(t => prefixTool(t, id))
        plugin.commands = manifest.commands ?? []
        plugin.toolCount = plugin.tools.length
        plugin.commandCount = plugin.commands.length
      } catch (err) {
        plugin.error = err instanceof Error ? err.message : String(err)
        console.error(`[plugins] Failed to load ${file}: ${plugin.error}`)
      }

      loaded.push(plugin)
    }
  }

  return loaded
}

export function formatPluginList(plugins: LoadedPlugin[]): string {
  if (plugins.length === 0) {
    return [
      '没有已加载的插件。',
      '',
      '在以下目录创建 .ts 或 .js 文件来添加插件：',
      '  .qiling/plugins/       (项目级)',
      '  ~/.qiling/plugins/     (全局)',
      '',
      '插件示例 (.qiling/plugins/my-tool.ts):',
      '  export default {',
      '    name: "My Tool",',
      '    description: "做一些有趣的事",',
      '    tools: [/* Tool 对象数组 */],',
      '    commands: [/* Command 对象数组 */],',
      '  }',
    ].join('\n')
  }

  const lines = [`已加载 ${plugins.length} 个插件：\n`]
  for (const p of plugins) {
    const status = p.error ? '✗' : '✓'
    const color = p.error ? '' : ''
    lines.push(`${status} ${p.name} (${p.id})`)
    if (p.description) lines.push(`   ${p.description}`)
    if (p.toolCount > 0) lines.push(`   工具: ${p.tools.map(t => t.name).join(', ')}`)
    if (p.commandCount > 0) lines.push(`   命令: ${p.commands.map(c => c.name).join(', ')}`)
    if (p.error) lines.push(`   ✗ 加载错误: ${p.error}`)
    lines.push(`   来源: ${p.sourcePath}`)
    lines.push('')
  }
  return lines.join('\n')
}
