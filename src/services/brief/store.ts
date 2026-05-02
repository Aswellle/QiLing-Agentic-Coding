// Session-level brief store. The brief is injected into the system prompt
// and survives context compression (it's prepended fresh each round).

let _brief: string | null = null

export function getBrief(): string | null { return _brief }
export function setBrief(text: string): void { _brief = text.trim() || null }
export function clearBrief(): void { _brief = null }
