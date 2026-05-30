// FROM CC: utils/plugins/schemas.ts (adapt-new stub)
// Full port deferred — complex marketplace/plugin schema definitions
import { z } from 'zod/v4'
import { lazySchema } from '../lazySchema.js'

export const MarketplaceSourceSchema = lazySchema(() => z.discriminatedUnion('source', [
  z.object({ source: z.literal('url'), url: z.string() }),
  z.object({ source: z.literal('github'), repo: z.string() }),
  z.object({ source: z.literal('git'), url: z.string() }),
  z.object({ source: z.literal('npm'), package: z.string() }),
  z.object({ source: z.literal('file'), path: z.string() }),
  z.object({ source: z.literal('directory'), path: z.string() }),
  z.object({ source: z.literal('skills-dir') }),
  z.object({ source: z.literal('hostPattern'), hostPattern: z.string() }),
  z.object({ source: z.literal('pathPattern'), pathPattern: z.string() }),
  z.object({ source: z.literal('settings'), name: z.string(), plugins: z.array(z.unknown()) }),
]))

export type MarketplaceSource = z.infer<ReturnType<typeof MarketplaceSourceSchema>>
