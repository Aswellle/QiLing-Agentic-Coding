/**
 * Spinner verbs for loading animation — ported from CC's constants/spinnerVerbs.ts
 * Randomly selected verb shown while AI is processing.
 */

import { getInitialSettings } from "../utils/settings/settings.js";

export const SPINNER_VERBS = [
  "思考中",
  "分析中",
  "处理中",
  "计算中",
  "研究中",
  "探索中",
  // CC-style whimsical verbs (translated + original mix)
  "Architecting",
  "Brewing",
  "Calculating",
  "Cogitating",
  "Computing",
  "Crafting",
  "Deliberating",
  "Engineering",
  "Formulating",
  "Generating",
  "Imagining",
  "Innovating",
  "Investigating",
  "Meditating",
  "Modeling",
  "Orchestrating",
  "Pondering",
  "Processing",
  "Reasoning",
  "Reflecting",
  "Synthesizing",
  "Thinking",
  "Transmuting",
  "Unraveling",
  "Weaving",
  // Whimsical ones from CC
  "Beboppin'",
  "Boondoggling",
  "Bootstrapping",
  "Canoodling",
  "Caramelizing",
  "Cascading",
  "Channeling",
  "Choreographing",
  "Cogitating",
  "Concocting",
  "Contemplating",
  "Deliberating",
  "Discombobulating",
  "Elucidating",
  "Filibustering",
  "Flourishing",
  "Gallivanting",
  "Gesticulating",
  "Hypothesizing",
  "Illuminating",
  "Incubating",
  "Interpolating",
  "Jiggering",
  "Juxtaposing",
  "Levitating",
  "Machinating",
  "Manifesting",
  "Marinating",
  "Metamorphosing",
  "Navigating",
  "Oscillating",
  "Percolating",
  "Philosophizing",
  "Postulating",
  "Propagating",
  "Ruminating",
  "Scintillating",
  "Serenading",
  "Simmering",
  "Spatulating",
  "Speculating",
  "Symphonizing",
  "Tinkering",
  "Triangulating",
  "Vacillating",
  "Vigorously working",
  "Waxing",
  "Zigzagging",
] as const;

/** Get a random spinner verb. */
export function getRandomSpinnerVerb(): string {
  return SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)]!;
}

// FROM CC: getSpinnerVerbs — settings-aware verb list (spinnerVerbs config
// supports 'replace' and 'append' modes)
export function getSpinnerVerbs(): string[] {
  const settings = getInitialSettings();
  const config = settings.spinnerVerbs;
  if (!config) {
    return [...SPINNER_VERBS];
  }
  if (config.mode === "replace") {
    return config.verbs.length > 0 ? config.verbs : [...SPINNER_VERBS];
  }
  return [...SPINNER_VERBS, ...config.verbs];
}
