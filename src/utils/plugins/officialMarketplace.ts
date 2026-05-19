/**
 * Official plugin marketplace constants — adapted from CC's utils/plugins/officialMarketplace.ts
 *
 * QiLing adaptation: QiLing doesn't have an official marketplace yet,
 * but these constants provide the structure for future plugin distribution.
 */

export type MarketplaceSource = {
  source: 'github'
  repo: string
}

/** Source for the official Anthropic plugins marketplace */
export const OFFICIAL_MARKETPLACE_SOURCE: MarketplaceSource = {
  source: 'github',
  repo: 'anthropics/claude-plugins-official',
}

/** Display name for the official marketplace */
export const OFFICIAL_MARKETPLACE_NAME = 'claude-plugins-official'

/** QiLing's own plugin marketplace (future) */
export const QILING_MARKETPLACE_NAME = 'qiling-plugins'
