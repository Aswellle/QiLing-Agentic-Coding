/**
 * In-process message bus for inter-agent communication.
 * Agents send messages to named inboxes; recipients read on next activation.
 */

export interface BusMessage {
  id: string
  from: string
  to: string
  content: string
  sentAt: number
  read: boolean
}

// inbox: agentName → queue of messages
const inboxes = new Map<string, BusMessage[]>()

function msgId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function sendMessage(to: string, from: string, content: string): BusMessage {
  const msg: BusMessage = { id: msgId(), from, to, content, sentAt: Date.now(), read: false }
  if (!inboxes.has(to)) inboxes.set(to, [])
  inboxes.get(to)!.push(msg)
  return msg
}

export function broadcast(
  from: string,
  content: string,
  recipients: string[]
): BusMessage[] {
  return recipients.filter(r => r !== from).map(r => sendMessage(r, from, content))
}

export function readInbox(agentName: string, markRead = true): BusMessage[] {
  const msgs = inboxes.get(agentName) ?? []
  if (markRead) msgs.forEach(m => { m.read = true })
  return msgs
}

export function unreadCount(agentName: string): number {
  return (inboxes.get(agentName) ?? []).filter(m => !m.read).length
}

export function clearInbox(agentName: string): void {
  inboxes.delete(agentName)
}

export function listRegisteredAgents(): string[] {
  return Array.from(inboxes.keys())
}
