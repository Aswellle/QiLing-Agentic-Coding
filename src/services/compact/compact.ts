/**
 * Compaction service — STUB at CC path.
 * FROM CC: services/compact/compact.js
 * QiLing's real compaction engine lives in src/compact/engine.ts with a
 * provider/permissions-based signature. CC-ported agent code (inProcessRunner)
 * calls this toolUseContext-based interface; bridging the two is pending the
 * query() runtime bridge decision (see query.ts). Until then this stub keeps
 * the ported stack compiling — the runtime path is unreachable (runAgent's
 * query() throws first).
 */
import type { Message } from "../../types/message.js";

export const ERROR_MESSAGE_USER_ABORT = "API Error: Request was aborted.";

export type CompactionResult = {
  boundaryMarker?: Message;
  summaryMessages?: Message[];
  messagesToKeep?: Message[];
  attachments?: Message[];
  hookResults?: Message[];
};

export async function compactConversation(
  _messages: Message[],
  _toolUseContext: unknown,
  _cacheSafeParams: unknown,
  _suppressFollowUpQuestions?: boolean,
  _customInstructions?: string,
  _isAutoCompact?: boolean,
): Promise<CompactionResult> {
  throw new Error(
    "CC-interface compactConversation is not yet bridged to src/compact/engine.ts",
  );
}

export function buildPostCompactMessages(result: CompactionResult): Message[] {
  return [
    ...(result.boundaryMarker ? [result.boundaryMarker] : []),
    ...(result.summaryMessages ?? []),
    ...(result.messagesToKeep ?? []),
    ...(result.attachments ?? []),
    ...(result.hookResults ?? []),
  ];
}
