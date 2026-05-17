/**
 * MCP environment variable expansion — direct port of CC's services/mcp/envExpansion.ts
 *
 * Handles ${VAR} and ${VAR:-default} syntax in MCP server configurations.
 */

/**
 * Expand environment variables in a string value.
 * Supports:
 *   ${VAR}          — expand to process.env.VAR (error if missing)
 *   ${VAR:-default} — expand to process.env.VAR, fallback to "default"
 *
 * @returns Object with expanded string and list of missing variables
 */
export function expandEnvVarsInString(value: string): {
  expanded: string
  missingVars: string[]
} {
  const missingVars: string[] = []

  const expanded = value.replace(/\$\{([^}]+)\}/g, (match, varContent) => {
    const [varName, defaultValue] = varContent.split(':-', 2)
    const envValue = process.env[varName]
    if (envValue !== undefined) return envValue
    if (defaultValue !== undefined) return defaultValue
    missingVars.push(varName)
    return match
  })

  return { expanded, missingVars }
}

/**
 * Expand env vars in all string fields of an MCP server config.
 * Returns expanded config + list of all missing variable names.
 */
export function expandMcpServerConfig<
  T extends { command?: string; args?: string[]; url?: string; env?: Record<string, string> }
>(config: T): { config: T; missingVars: string[] } {
  const allMissingVars: string[] = []

  function expand(value: string): string {
    const { expanded, missingVars } = expandEnvVarsInString(value)
    allMissingVars.push(...missingVars)
    return expanded
  }

  return {
    config: {
      ...config,
      command: config.command ? expand(config.command) : config.command,
      args: config.args?.map(expand),
      url: config.url ? expand(config.url) : config.url,
      env: config.env
        ? Object.fromEntries(Object.entries(config.env).map(([k, v]) => [k, expand(v)]))
        : config.env,
    },
    missingVars: allMissingVars,
  }
}
