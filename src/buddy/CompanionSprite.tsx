/**
 * CompanionSprite — 宠物精灵 TUI 组件
 * 移植自 CC's buddy/CompanionSprite.tsx，适配 QiLing 的 Ink + ThemeContext 架构
 *
 * 功能：
 *  - 500ms 帧率动画（闲置序列：休息→扭动→眨眼→repeat）
 *  - 点击爱心效果（/buddy pet）
 *  - 语音气泡（reaction 文字）
 *  - 稀有度颜色标记
 *  - 发光(shiny)效果：名字彩虹色
 */

import { Box, Text } from "ink";
import React, { useEffect, useRef, useState } from "react";
import type { Theme } from "../utils/theme";
import { useTheme } from "../utils/themeContext";
import { renderFace, renderSprite, spriteFrameCount } from "./sprites";
import { RARITY_COLORS, RARITY_STARS } from "./types";
import type { Companion, Species } from "./types";

/** 每种植物宠物的专属体色，让花卉更形象 */
function getSpeciesColor(species: Species, theme: Theme): string {
  switch (species) {
    // 绿色系（茎叶）
    case "sprout":
    case "fern":
    case "cactus":
    case "mushroom":
      return theme.success;
    // 向日葵 — 明黄
    case "sunflower":
      return theme.warning;
    // 菊花 — 淡紫/建议色（菊花有白、黄、紫多色，这里取清雅紫调）
    case "chrysanthemum":
      return theme.suggestion;
    // 牡丹 — 富贵红
    case "peony":
      return theme.error;
    // 非植物系：用稀有度颜色
    default:
      return ""; // 空 = 调用方使用 rarityColor
  }
}

const TICK_MS = 500;
const BUBBLE_SHOW = 20; // ticks ≈ 10s
const FADE_WINDOW = 6; // 最后 3s 变暗

// 闲置序列：frame 0=休息（多次），frame 1=扭动，frame -1=眨眼（frame 0 + 闭眼）
const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0];

// 爱心漂浮动画帧
const HEARTS = [
  "  ♥    ♥  ",
  " ♥  ♥   ♥ ",
  "♥   ♥  ♥  ",
  "  ♥  ·   ♥",
  "·    ·   · ",
];

interface Props {
  companion: Companion;
  reaction?: string | null;
  petAt?: number;
  muted?: boolean;
}

function SpeechBubble({ text, fading }: { text: string; fading: boolean }) {
  const { theme } = useTheme();
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length + w.length + 1 > 22 && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={fading ? theme.inactive : theme.claude}
      paddingX={1}
      width={28}
    >
      {lines.map((l, i) => (
        <Text
          key={i}
          italic
          dimColor={fading}
          color={fading ? theme.inactive : undefined}
        >
          {l}
        </Text>
      ))}
    </Box>
  );
}

function ShinyName({ name, color }: { name: string; color: string }) {
  const COLORS = ["red", "yellow", "green", "cyan", "blue", "magenta"];
  return (
    <Text>
      {[...name].map((ch, i) => (
        <Text key={i} color={COLORS[i % COLORS.length]}>
          {ch}
        </Text>
      ))}
    </Text>
  );
}

export function CompanionSprite({ companion, reaction, petAt, muted }: Props) {
  const { theme } = useTheme();
  const [tick, setTick] = useState(0);
  const [bubbleTick, setBubbleTick] = useState(-1);
  const [bubbleText, setBubbleText] = useState("");
  const lastReactionRef = useRef<string | null | undefined>(null);
  const lastPetAt = useRef(0);
  const [petStartTick, setPetStartTick] = useState(0);
  const currentPetAt = petAt ?? 0;

  // 计时器：每 500ms 推进一帧
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // 监听 reaction 变化
  useEffect(() => {
    if (reaction && reaction !== lastReactionRef.current && !muted) {
      setBubbleText(reaction);
      setBubbleTick(0);
    }
    lastReactionRef.current = reaction;
  }, [reaction, muted]);

  // 监听宠物爱抚
  useEffect(() => {
    if (currentPetAt && currentPetAt !== lastPetAt.current) {
      lastPetAt.current = currentPetAt;
      setPetStartTick(tick);
    }
  }, [currentPetAt, tick]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick-driven counter; adding bubbleTick to deps causes cascading re-runs (increment→rerender→effect→increment loop)
  useEffect(() => {
    if (bubbleTick < 0) return;
    if (bubbleTick >= BUBBLE_SHOW) {
      setBubbleTick(-1);
      setBubbleText("");
      return;
    }
    setBubbleTick((t) => t + 1);
  }, [tick]); // eslint-disable-line

  // 帧选择
  const seqIdx = tick % IDLE_SEQUENCE.length;
  const frameIdx = IDLE_SEQUENCE[seqIdx] ?? 0;
  const actualFrame = frameIdx < 0 ? 0 : frameIdx; // -1 = 眨眼帧，用 frame 0 但替换眼睛
  const isBlinking = frameIdx < 0;

  // 渲染精灵行（眨眼时用 '-' 替换眼睛字符）
  const spriteBones = isBlinking
    ? { ...companion, eye: "-" as typeof companion.eye }
    : companion;
  const lines = renderSprite(
    spriteBones,
    actualFrame % spriteFrameCount(companion.species),
  );

  // 爱心动画
  const petAge = tick - petStartTick;
  const showHearts = currentPetAt > 0 && petAge < HEARTS.length;
  const heartLine = showHearts ? HEARTS[petAge] : null;

  // 气泡状态
  const isSpeaking = bubbleTick >= 0 && bubbleText.length > 0;
  const isFading = bubbleTick >= BUBBLE_SHOW - FADE_WINDOW;

  // 稀有度颜色
  const rarityColorKey = RARITY_COLORS[companion.rarity];
  const rarityColor: string =
    (theme as Record<string, string>)[rarityColorKey] ?? theme.inactive;

  // 按物种选色：花卉各有专属色，其他物种用稀有度色
  const speciesColor = getSpeciesColor(companion.species, theme);
  const spriteColor = speciesColor || rarityColor;

  return (
    <Box flexDirection="column" alignItems="flex-start">
      {/* 气泡（在精灵上方） */}
      {isSpeaking && (
        <Box marginBottom={0}>
          <SpeechBubble text={bubbleText} fading={isFading} />
        </Box>
      )}

      {/* 爱心漂浮 */}
      {heartLine && (
        <Box>
          <Text color="red">{heartLine}</Text>
        </Box>
      )}

      {/* 精灵正文 */}
      {lines.map((line, i) => (
        <Box key={i}>
          <Text color={companion.shiny ? undefined : spriteColor}>
            {companion.shiny
              ? [...line].map((ch, j) => (
                  <Text
                    key={j}
                    color={
                      ["yellow", "cyan", "magenta", "green", "blue"][j % 5]
                    }
                  >
                    {ch}
                  </Text>
                ))
              : line}
          </Text>
        </Box>
      ))}

      {/* 名字行 */}
      <Box>
        <Text color={rarityColor}>{RARITY_STARS[companion.rarity]} </Text>
        {companion.shiny ? (
          <ShinyName name={companion.name} color={rarityColor} />
        ) : (
          <Text color={rarityColor}>{companion.name}</Text>
        )}
      </Box>
    </Box>
  );
}
