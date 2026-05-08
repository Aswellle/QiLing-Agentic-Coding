/**
 * Crypto indirection — ported from CC's utils/crypto.ts
 * Provides randomUUID with correct binding under Bun's bytecode compiler.
 */
import { randomUUID } from 'crypto'
export { randomUUID }
