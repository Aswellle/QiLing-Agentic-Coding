/**
 * Buddy (宠物伙伴) 类型定义 — 完整移植自 CC's buddy/types.ts，并扩展了植物系宠物
 */

export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;
export type Rarity = (typeof RARITIES)[number];

// CC 原有 18 种 + QiLing 新增 5 种植物宠物 (sprout, fern, sunflower, chrysanthemum, peony)
export const SPECIES = [
  "duck",
  "goose",
  "blob",
  "cat",
  "dragon",
  "octopus",
  "owl",
  "penguin",
  "turtle",
  "snail",
  "ghost",
  "axolotl",
  "capybara",
  "cactus",
  "robot",
  "rabbit",
  "mushroom",
  "chonk",
  // QiLing 原创植物系
  "sprout",
  "fern",
  "sunflower",
  "chrysanthemum",
  "peony",
] as const;
export type Species = (typeof SPECIES)[number];

export const EYES = ["·", "✦", "×", "◉", "@", "°"] as const;
export type Eye = (typeof EYES)[number];

export const HATS = [
  "none",
  "crown",
  "tophat",
  "propeller",
  "halo",
  "wizard",
  "beanie",
  "tinyduck",
] as const;
export type Hat = (typeof HATS)[number];

export const STAT_NAMES = [
  "DEBUGGING",
  "PATIENCE",
  "CHAOS",
  "WISDOM",
  "SNARK",
] as const;
export type StatName = (typeof STAT_NAMES)[number];

// 决定论部分 — 由 hash(userId) 派生
export type CompanionBones = {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Record<StatName, number>;
};

// AI 生成的灵魂 — 孵化后持久存储
export type CompanionSoul = {
  name: string;
  personality: string;
};

export type Companion = CompanionBones &
  CompanionSoul & {
    hatchedAt: number;
  };

// 实际持久化的内容。骨骼每次从 hash(userId) 重新生成，灵魂存储在配置中。
export type StoredCompanion = CompanionSoul & { hatchedAt: number };

export const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
} as const satisfies Record<Rarity, number>;

export const RARITY_STARS = {
  common: "★",
  uncommon: "★★",
  rare: "★★★",
  epic: "★★★★",
  legendary: "★★★★★",
} as const satisfies Record<Rarity, string>;

// 对应 QiLing theme token 名
export const RARITY_COLORS: Record<Rarity, string> = {
  common: "inactive",
  uncommon: "success",
  rare: "permission",
  epic: "autoAccept",
  legendary: "warning",
};

// 植物系宠物特殊颜色提示（渲染时使用绿色/花色）
export const PLANT_SPECIES: Set<Species> = new Set([
  "sprout",
  "fern",
  "cactus",
  "mushroom",
  "sunflower",
  "chrysanthemum",
  "peony",
]);

export function isPlantSpecies(s: Species): boolean {
  return PLANT_SPECIES.has(s);
}
