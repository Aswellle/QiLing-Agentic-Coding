import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { AskUserQuestion } from '../tools/AskUserQuestionTool'

export interface UserQuestionRequest {
  questions: AskUserQuestion[]
  resolve: (answers: Record<string, string>) => void
}

interface Props {
  request: UserQuestionRequest
}

export function AskUserQuestionDialog({ request }: Props) {
  const { questions, resolve } = request
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set())
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, string>>({})

  const currentQuestion = questions[questionIndex]
  const isLastQuestion = questionIndex === questions.length - 1
  const remaining = questions.length - questionIndex - 1

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedOption(s => Math.max(0, s - 1))
      return
    }
    if (key.downArrow) {
      setSelectedOption(s => Math.min(currentQuestion.options.length - 1, s + 1))
      return
    }

    // Space toggles selection for multiSelect questions
    if (_input === ' ' && currentQuestion.multiSelect) {
      setSelectedOptions(prev => {
        const next = new Set(prev)
        if (next.has(selectedOption)) next.delete(selectedOption)
        else next.add(selectedOption)
        return next
      })
      return
    }

    if (key.return) {
      let answer: string
      if (currentQuestion.multiSelect) {
        const chosen = selectedOptions.size > 0
          ? [...selectedOptions].sort().map(i => currentQuestion.options[i].label).join(', ')
          : currentQuestion.options[selectedOption].label
        answer = chosen
      } else {
        answer = currentQuestion.options[selectedOption].label
      }

      const newAnswers = { ...collectedAnswers, [currentQuestion.question]: answer }

      if (isLastQuestion) {
        resolve(newAnswers)
      } else {
        setCollectedAnswers(newAnswers)
        setQuestionIndex(i => i + 1)
        setSelectedOption(0)
        setSelectedOptions(new Set())
      }
    }
  })

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingLeft={1}
      paddingRight={1}
      marginBottom={1}
    >
      {/* Header */}
      <Text color="cyan" bold>
        {'─ Claude 提问'}
        {questions.length > 1 ? ` (${questionIndex + 1}/${questions.length})` : ''}
        {' ─────────────────────────────'}
      </Text>

      {/* Previous answers summary (for multi-question flows) */}
      {questionIndex > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {Object.entries(collectedAnswers).map(([q, a]) => (
            <Text key={q} color="gray">  ✓ {q.length > 50 ? q.slice(0, 47) + '…' : q} → {a}</Text>
          ))}
        </Box>
      )}

      {/* Current question */}
      <Box marginTop={1} marginBottom={1}>
        <Text color="white" bold>{currentQuestion.question}</Text>
      </Box>

      {/* Options */}
      <Box flexDirection="column" marginBottom={1}>
        {currentQuestion.options.map((opt, i) => {
          const isActive = i === selectedOption
          const isChecked = currentQuestion.multiSelect && selectedOptions.has(i)
          const checkMark = currentQuestion.multiSelect
            ? (isChecked ? '[✓] ' : '[ ] ')
            : (isActive ? '▶  ' : '   ')

          return (
            <Box key={opt.label} flexDirection="column" marginBottom={0}>
              <Box flexDirection="row">
                <Text color={isActive ? 'cyan' : 'gray'} bold={isActive}>
                  {checkMark}
                </Text>
                <Text color={isActive ? 'white' : 'gray'} bold={isActive}>
                  {opt.label}
                </Text>
              </Box>
              {opt.description && (
                <Text color="gray">{'     '}{opt.description}</Text>
              )}
            </Box>
          )
        })}
      </Box>

      {/* Footer hint */}
      <Text color="gray" dimColor>
        {currentQuestion.multiSelect
          ? '↑↓ 导航  Space 切换选择  Enter 确认'
          : '↑↓ 导航  Enter 确认'}
        {remaining > 0 ? `  （还有 ${remaining} 个问题）` : ''}
      </Text>
    </Box>
  )
}
