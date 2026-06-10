/**
 * Task output formatting — adapted from CC's utils/task/outputFormatting.ts
 *
 * Formats background task output for API consumption.
 * Truncates large outputs with a header pointing to the full file.
 */

export const TASK_MAX_OUTPUT_UPPER_LIMIT = 160_000;
export const TASK_MAX_OUTPUT_DEFAULT = 32_000;

export function getMaxTaskOutputLength(): number {
  const envVal = process.env.TASK_MAX_OUTPUT_LENGTH;
  if (!envVal) return TASK_MAX_OUTPUT_DEFAULT;
  const parsed = Number.parseInt(envVal, 10);
  if (isNaN(parsed) || parsed <= 0) return TASK_MAX_OUTPUT_DEFAULT;
  return Math.min(parsed, TASK_MAX_OUTPUT_UPPER_LIMIT);
}

/**
 * Format task output for API consumption, truncating if too large.
 * When truncated, the last N characters that fit are returned
 * with a header showing the full output file path.
 */
export function formatTaskOutput(
  output: string,
  taskId: string,
): { content: string; wasTruncated: boolean } {
  const maxLen = getMaxTaskOutputLength();

  if (output.length <= maxLen) {
    return { content: output, wasTruncated: false };
  }

  const header = `[截断。任务 ${taskId} 完整输出已超出限制]\n\n`;
  const availableSpace = maxLen - header.length;
  const truncated = output.slice(-availableSpace);

  return { content: header + truncated, wasTruncated: true };
}
