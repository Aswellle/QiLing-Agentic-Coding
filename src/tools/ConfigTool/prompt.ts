// FROM CC: tools/ConfigTool/prompt.ts
import {
  getOptionsForSetting,
  SUPPORTED_SETTINGS,
} from './supportedSettings.js'

// LOC: config.tool.description
export const DESCRIPTION = 'Get or set configuration settings.'

/**
 * Generate the prompt documentation from the registry
 */
export function generatePrompt(): string {
  const globalSettings: string[] = []
  const projectSettings: string[] = []

  for (const [key, config] of Object.entries(SUPPORTED_SETTINGS)) {
    // Skip model - it gets its own section with dynamic options
    if (key === 'model') continue

    const options = getOptionsForSetting(key)
    let line = `- ${key}`

    if (options) {
      line += `: ${options.map(o => `"${o}"`).join(', ')}`
    } else if (config.type === 'boolean') {
      line += `: true/false`
    }

    line += ` - ${config.description}`

    if (config.source === 'global') {
      globalSettings.push(line)
    } else {
      projectSettings.push(line)
    }
  }

  const modelSection = generateModelSection()

  // LOC: config.tool.prompt
  return `Get or set configuration settings.

  View or change settings. Use when the user requests configuration changes, asks about current settings, or when adjusting a setting would benefit them.


## Usage
- **Get current value:** Omit the "value" parameter
- **Set new value:** Include the "value" parameter

## Configurable settings list
The following settings are available for you to change:

### Global Settings (stored in ~/.qiling/settings.json)
${globalSettings.join('\n')}

### Project Settings (stored in settings.json)
${projectSettings.join('\n')}

${modelSection}
## Examples
- Get theme: { "setting": "theme" }
- Set dark theme: { "setting": "theme", "value": "dark" }
- Enable vim mode: { "setting": "editorMode", "value": "vim" }
- Enable verbose: { "setting": "verbose", "value": true }
- Change model: { "setting": "model", "value": "opus" }
- Change permission mode: { "setting": "permissions.defaultMode", "value": "plan" }
`
}

function generateModelSection(): string {
  const options = ['sonnet', 'opus', 'haiku']
  const lines = options.map(o => `  - "${o}": ${o} model`)
  return `## Model
- model - Override the default model. Available options:
${lines.join('\n')}`
}
