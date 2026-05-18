/**
 * Computer Use — adapted from CC's utils/computerUse/
 *
 * CC uses native macOS Swift modules (@ant/computer-use-swift) for
 * screenshots and @ant/computer-use-input (Rust/enigo) for mouse/keyboard.
 *
 * QiLing provides a cross-platform implementation using:
 *   - Screenshots: scrot (Linux), screencapture (macOS), PowerShell (Windows)
 *   - Mouse/Keyboard: xdotool (Linux), cliclick (macOS), nircmd (Windows)
 *
 * Enable via MCP with the @anthropic-ai/computer-use-mcp server, or via
 * QILING_COMPUTER_USE=1 for direct integration.
 */

export const COMPUTER_USE_MCP_SERVER_NAME = 'computer-use'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScreenshotResult = {
  /** Base64-encoded PNG/JPEG image data */
  data: string
  mimeType: 'image/png' | 'image/jpeg'
  width: number
  height: number
}

export type DisplayGeometry = {
  width: number
  height: number
  x: number
  y: number
  scaleFactor: number
}

export type MouseButton = 'left' | 'right' | 'middle'

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta' | 'super'

// ─── Platform detection ────────────────────────────────────────────────────────

function hasCommand(cmd: string): boolean {
  try {
    const proc = Bun.spawnSync(['which', cmd], { stdout: 'pipe', stderr: 'pipe' })
    return proc.exitCode === 0
  } catch { return false }
}

export function isComputerUseAvailable(): boolean {
  if (process.env.QILING_COMPUTER_USE !== '1') return false
  switch (process.platform) {
    case 'linux': return hasCommand('xdotool') || hasCommand('ydotool')
    case 'darwin': return true  // screencapture + cliclick
    case 'win32': return true   // PowerShell built-in
    default: return false
  }
}

export function getComputerUseUnavailableReason(): string | null {
  if (process.env.QILING_COMPUTER_USE !== '1') {
    return 'Computer Use disabled. Set QILING_COMPUTER_USE=1 to enable.'
  }
  switch (process.platform) {
    case 'linux':
      if (!hasCommand('xdotool') && !hasCommand('ydotool')) {
        return 'xdotool or ydotool required on Linux (apt install xdotool)'
      }
      return null
    case 'darwin':
      return null  // macOS has built-in tools
    case 'win32':
      return null  // PowerShell handles it
    default:
      return `Unsupported platform: ${process.platform}`
  }
}

// ─── Screenshot ───────────────────────────────────────────────────────────────

/**
 * Capture the entire screen or a region.
 * Returns base64-encoded PNG data.
 */
export async function takeScreenshot(options?: {
  x?: number; y?: number; width?: number; height?: number
}): Promise<ScreenshotResult> {
  const tmpPath = `/tmp/qiling-screenshot-${Date.now()}.png`

  try {
    switch (process.platform) {
      case 'darwin': {
        const args = ['-x', tmpPath]
        if (options?.x !== undefined) {
          args.push('-R', `${options.x},${options.y},${options.width},${options.height}`)
        }
        const proc = Bun.spawn(['screencapture', ...args], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
        break
      }
      case 'linux': {
        if (hasCommand('scrot')) {
          const args = [tmpPath]
          if (options?.x !== undefined) {
            args.push('-a', `${options.x},${options.y},${options.width},${options.height}`)
          }
          const proc = Bun.spawn(['scrot', ...args], { stdout: 'pipe', stderr: 'pipe' })
          await proc.exited
        } else if (hasCommand('import')) {
          const proc = Bun.spawn(['import', '-window', 'root', tmpPath], { stdout: 'pipe', stderr: 'pipe' })
          await proc.exited
        } else {
          throw new Error('No screenshot tool found. Install scrot: apt install scrot')
        }
        break
      }
      case 'win32': {
        const psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds | % { $bmp = New-Object System.Drawing.Bitmap($_.Width, $_.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(0, 0, 0, 0, $bmp.Size); $bmp.Save('${tmpPath}') }`
        const proc = Bun.spawn(['powershell', '-Command', psScript], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
        break
      }
      default:
        throw new Error(`Unsupported platform: ${process.platform}`)
    }

    const data = await Bun.file(tmpPath).arrayBuffer()
    const base64 = Buffer.from(data).toString('base64')
    return { data: base64, mimeType: 'image/png', width: 0, height: 0 }
  } finally {
    try { Bun.spawnSync(['rm', '-f', tmpPath]) } catch { /* ignore */ }
  }
}

// ─── Mouse control ─────────────────────────────────────────────────────────────

/**
 * Move mouse to absolute screen coordinates.
 */
export async function moveMouse(x: number, y: number): Promise<void> {
  switch (process.platform) {
    case 'linux':
      if (hasCommand('xdotool')) {
        const proc = Bun.spawn(['xdotool', 'mousemove', String(x), String(y)], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
    case 'darwin':
      if (hasCommand('cliclick')) {
        const proc = Bun.spawn(['cliclick', `m:${x},${y}`], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
    case 'win32': {
      const ps = `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`
      const proc = Bun.spawn(['powershell', '-Command', ps], { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      break
    }
  }
}

/**
 * Click mouse at current position or specified coordinates.
 */
export async function clickMouse(
  x?: number, y?: number,
  button: MouseButton = 'left',
  doubleClick = false,
): Promise<void> {
  if (x !== undefined && y !== undefined) await moveMouse(x, y)

  const btnNum = button === 'left' ? 1 : button === 'middle' ? 2 : 3
  const clickCount = doubleClick ? 2 : 1

  switch (process.platform) {
    case 'linux':
      if (hasCommand('xdotool')) {
        const args = ['click', '--clearmodifiers']
        if (doubleClick) args.push('--repeat', '2')
        args.push(String(btnNum))
        const proc = Bun.spawn(['xdotool', ...args], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
    case 'darwin':
      if (hasCommand('cliclick')) {
        const action = button === 'right' ? 'rc' : doubleClick ? 'dc' : 'c'
        const proc = Bun.spawn(['cliclick', `${action}:.`], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
  }
}

// ─── Keyboard control ─────────────────────────────────────────────────────────

/**
 * Type text (inserts characters at current cursor position).
 */
export async function typeText(text: string): Promise<void> {
  switch (process.platform) {
    case 'linux':
      if (hasCommand('xdotool')) {
        const proc = Bun.spawn(['xdotool', 'type', '--clearmodifiers', text], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
    case 'darwin':
      if (hasCommand('cliclick')) {
        const proc = Bun.spawn(['cliclick', `t:${text}`], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
  }
}

/**
 * Press a key combination (e.g., 'ctrl+c', 'Return', 'F5').
 */
export async function pressKey(key: string, modifiers: KeyModifier[] = []): Promise<void> {
  const combo = [...modifiers, key].join('+')

  switch (process.platform) {
    case 'linux':
      if (hasCommand('xdotool')) {
        const proc = Bun.spawn(['xdotool', 'key', '--clearmodifiers', combo], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
    case 'darwin':
      if (hasCommand('cliclick')) {
        const keyStr = modifiers.length ? `kd:${modifiers.join(',')} k:${key} ku:${modifiers.join(',')}` : `k:${key}`
        const proc = Bun.spawn(['cliclick', keyStr], { stdout: 'pipe', stderr: 'pipe' })
        await proc.exited
      }
      break
  }
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

export async function getClipboardText(): Promise<string> {
  switch (process.platform) {
    case 'darwin': {
      const proc = Bun.spawn(['pbpaste'], { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      return new Response(proc.stdout).text()
    }
    case 'linux': {
      const cmd = hasCommand('xclip') ? ['xclip', '-selection', 'clipboard', '-o']
        : hasCommand('xsel') ? ['xsel', '--clipboard', '--output'] : null
      if (!cmd) return ''
      const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      return new Response(proc.stdout).text()
    }
    case 'win32': {
      const proc = Bun.spawn(['powershell', '-Command', 'Get-Clipboard'], { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      return new Response(proc.stdout).text()
    }
    default: return ''
  }
}

export async function setClipboardText(text: string): Promise<void> {
  switch (process.platform) {
    case 'darwin': {
      const proc = Bun.spawn(['pbcopy'], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' })
      proc.stdin.write(text)
      await proc.stdin.end()
      await proc.exited
      break
    }
    case 'linux': {
      const cmd = hasCommand('xclip') ? ['xclip', '-selection', 'clipboard']
        : hasCommand('xsel') ? ['xsel', '--clipboard', '--input'] : null
      if (!cmd) return
      const proc = Bun.spawn(cmd, { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' })
      proc.stdin.write(text)
      await proc.stdin.end()
      await proc.exited
      break
    }
    case 'win32': {
      const proc = Bun.spawn(['powershell', '-Command', `Set-Clipboard -Value '${text.replace(/'/g, "''")}'`], { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      break
    }
  }
}
