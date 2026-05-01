import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { settingsSchema, type Settings } from './schema'

const SETTINGS_FILENAME = 'settings.json'
const CONFIG_DIR = '.qiling'
const GLOBAL_CONFIG_DIR = join(homedir(), '.qiling')

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideVal = override[key]
    const baseVal = base[key]
    if (
      overrideVal !== null &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, overrideVal as Record<string, unknown>) as T[typeof key]
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[typeof key]
    }
  }
  return result
}

function loadJsonFile(path: string): Record<string, unknown> {
  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

function findProjectConfig(startDir: string): string | null {
  let dir = startDir
  while (true) {
    const candidate = join(dir, CONFIG_DIR, SETTINGS_FILENAME)
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function loadSettings(workingDir: string, cliOverrides?: Partial<Settings>): Settings {
  // Layer 1: defaults (from schema)
  const defaults = settingsSchema.parse({})

  // Layer 2: global user config
  const globalConfigPath = join(GLOBAL_CONFIG_DIR, SETTINGS_FILENAME)
  const globalConfig = loadJsonFile(globalConfigPath)

  // Layer 3: project config (walk up from cwd)
  const projectConfigPath = findProjectConfig(workingDir)
  const projectConfig = projectConfigPath ? loadJsonFile(projectConfigPath) : {}

  // Layer 4: env vars
  const envConfig: Partial<Settings> = {}
  // API Key priority: CLI > Anthropic > MiniMax > Qwen > Doubao > GLM > OpenAI > Gemini
  if (process.env.ANTHROPIC_API_KEY) envConfig.apiKey = process.env.ANTHROPIC_API_KEY
  if (!envConfig.apiKey && process.env.MINIMAX_API_KEY) envConfig.apiKey = process.env.MINIMAX_API_KEY
  if (!envConfig.apiKey && (process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY)) {
    envConfig.apiKey = process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY
  }
  if (!envConfig.apiKey && (process.env.ARK_API_KEY ?? process.env.DOUBAO_API_KEY)) {
    envConfig.apiKey = process.env.ARK_API_KEY ?? process.env.DOUBAO_API_KEY
  }
  if (!envConfig.apiKey && (process.env.ZHIPUAI_API_KEY ?? process.env.GLM_API_KEY)) {
    envConfig.apiKey = process.env.ZHIPUAI_API_KEY ?? process.env.GLM_API_KEY
  }
  if (!envConfig.apiKey && process.env.OPENAI_API_KEY) envConfig.apiKey = process.env.OPENAI_API_KEY
  if (!envConfig.apiKey && process.env.GEMINI_API_KEY) envConfig.apiKey = process.env.GEMINI_API_KEY
  if (process.env.QILING_MODEL) envConfig.model = process.env.QILING_MODEL
  if (process.env.QILING_PROVIDER) envConfig.provider = process.env.QILING_PROVIDER as Settings['provider']

  // Merge in priority order (later wins)
  const merged = deepMerge(
    deepMerge(
      deepMerge(defaults, globalConfig as Partial<Settings>),
      projectConfig as Partial<Settings>
    ),
    { ...envConfig, ...(cliOverrides ?? {}) }
  )

  return settingsSchema.parse(merged)
}

export function saveGlobalSettings(settings: Partial<Settings>): void {
  mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true })
  const path = join(GLOBAL_CONFIG_DIR, SETTINGS_FILENAME)
  const existing = loadJsonFile(path)
  const merged = deepMerge(existing as Record<string, unknown>, settings as Record<string, unknown>)
  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
}

export function getGlobalSettingsPath(): string {
  return join(GLOBAL_CONFIG_DIR, SETTINGS_FILENAME)
}

export function getGlobalConfigDir(): string {
  return GLOBAL_CONFIG_DIR
}
