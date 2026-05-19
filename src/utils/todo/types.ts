/**
 * Todo item types — adapted from CC's utils/todo/types.ts
 *
 * TodoItem: {content, status, activeForm}
 * Status: 'pending' | 'in_progress' | 'completed'
 * Used by TodoWriteTool to validate and type todo list entries.
 */

import { z } from 'zod'

export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed'])
export type TodoStatus = z.infer<typeof TodoStatusSchema>

export const TodoItemSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  status: TodoStatusSchema,
  activeForm: z.string().min(1, 'Active form cannot be empty'),
})
export type TodoItem = z.infer<typeof TodoItemSchema>

export const TodoListSchema = z.array(TodoItemSchema)
export type TodoList = z.infer<typeof TodoListSchema>
