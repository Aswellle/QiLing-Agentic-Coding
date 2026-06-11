/**
 * Attachment messages — STUB.
 * FROM CC: utils/attachments.js
 * CC wraps structured attachments (hook context, structured output) into
 * attachment-type messages. This stub carries the payload on a meta user
 * message until the attachment pipeline is ported.
 */
import type { Message } from "../types/message.js";

export function createAttachmentMessage(
  attachment: Record<string, unknown>,
): Message {
  return {
    role: "user",
    type: "attachment",
    content: "",
    isMeta: true,
    attachment,
  } as unknown as Message;
}
