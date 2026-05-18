/**
 * execFile wrapper that always resolves (never throws) — ported from CC's utils/execFileNoThrow.ts
 *
 * Provides consistent error handling and cross-platform compatibility.
 * QiLing adaptation: uses Bun.spawn instead of execa to avoid the dependency.
 */

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000  // 10 minutes
const MAX_BUFFER = 1_000_000  // ~1MB

export type ExecResult = {
  stdout: string
  stderr: string
  code: number
  error?: string
}

type ExecOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  preserveOutputOnError?: boolean
  cwd?: string
  env?: Record<string, string | undefined>
  stdin?: 'ignore' | 'inherit' | 'pipe'
  input?: string
}

/**
 * Run a command and always resolve — never throws.
 * On non-zero exit: returns { stdout, stderr, code, error }.
 * On timeout or abort: returns { stdout: '', stderr: '', code: 1, error }.
 */
export async function execFileNoThrow(
  file: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    preserveOutputOnError = true,
    cwd,
    env,
    input,
  } = options

  try {
    const proc = Bun.spawn([file, ...args], {
      cwd: cwd ?? process.cwd(),
      env: env as Record<string, string> | undefined,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: input !== undefined ? 'pipe' : 'ignore',
    })

    if (input !== undefined && proc.stdin) {
      proc.stdin.write(input)
      await proc.stdin.end()
    }

    // Apply timeout
    let timedOut = false
    const timer = timeout > 0
      ? setTimeout(() => { timedOut = true; proc.kill() }, timeout)
      : null

    const [stdoutText, stderrText, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    if (timer) clearTimeout(timer)

    if (timedOut) {
      return { stdout: '', stderr: '', code: 1, error: `Command timed out after ${timeout}ms` }
    }

    if (options.abortSignal?.aborted) {
      return { stdout: '', stderr: '', code: 1, error: 'Aborted' }
    }

    const code = exitCode ?? 0
    if (code !== 0 && !preserveOutputOnError) {
      return { stdout: '', stderr: '', code, error: `Exit code ${code}` }
    }

    return {
      stdout: stdoutText,
      stderr: stderrText,
      code,
      ...(code !== 0 ? { error: `Exit code ${code}` } : {}),
    }
  } catch (err) {
    return {
      stdout: '',
      stderr: '',
      code: 1,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/** Convenience alias matching CC's execFileNoThrowWithCwd */
export const execFileNoThrowWithCwd = execFileNoThrow
