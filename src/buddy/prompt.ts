/**
 * 宠物伙伴系统提示注入 — 移植自 CC's buddy/prompt.ts
 *
 * 向 AI 介绍当前宠物，让 AI 知道如何在对话中与宠物共存。
 * 当用户直接点名叫宠物时，AI 应该简短回应，把"舞台"让给宠物气泡。
 */

import type { Companion } from './types'

export function companionIntroText(name: string, species: string): string {
  return `# 宠物伙伴

一只叫做 **${name}** 的 ${species} 坐在用户的输入框旁边，偶尔会在语音气泡中发表评论。你不是 ${name}——它是独立的旁观者。

当用户直接点名叫 ${name} 时，气泡会自动回应。你的任务是让路：用一行或更少的文字回应，或者只回答消息中针对你的部分。不要解释你不是 ${name}——他们知道。不要代替 ${name} 说话——气泡会处理那部分。`
}

export function getCompanionSystemPromptSection(companion: Companion): string {
  return companionIntroText(companion.name, companion.species)
}

// 孵化成功后的系统提示片段
export function buildHatchSuccessMessage(companion: Companion): string {
  const shinyNote = companion.shiny ? ' ✨ (闪光型！极其罕见)' : ''
  return [
    `🥚 **宠物孵化成功！**${shinyNote}`,
    '',
    `**${companion.name}** (${companion.species}) 出现了！`,
    `稀有度: ${companion.rarity}`,
    `性格: ${companion.personality}`,
    '',
    '它会坐在你身旁，偶尔发表评论。你可以：',
    '  `/buddy pet`    — 摸摸它',
    '  `/buddy info`   — 查看详细属性',
    '  `/buddy mute`   — 切换气泡开关',
    '  `/buddy release`— 释放宠物',
  ].join('\n')
}
