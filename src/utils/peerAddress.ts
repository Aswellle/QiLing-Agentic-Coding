/**
 * Peer address parsing — direct port of CC's utils/peerAddress.ts
 *
 * Kept separate so SendMessageTool can import parseAddress without pulling in
 * the UDS (fs, net) or bridge (axios) modules at tool-enumeration time.
 *
 * Scheme routing:
 *   uds:    → Unix domain socket (local teammate process)
 *   bridge: → VS Code / desktop bridge
 *   /...    → bare socket path (legacy UDS sender — route through uds)
 *   other   → teammate name (routed by coordinator name lookup)
 */

export function parseAddress(to: string): {
  scheme: 'uds' | 'bridge' | 'other'
  target: string
} {
  if (to.startsWith('uds:')) return { scheme: 'uds', target: to.slice(4) }
  if (to.startsWith('bridge:')) return { scheme: 'bridge', target: to.slice(7) }
  // Legacy bare socket paths — route through UDS so replies aren't dropped
  if (to.startsWith('/')) return { scheme: 'uds', target: to }
  return { scheme: 'other', target: to }
}
