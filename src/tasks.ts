import type { Task, TaskType } from "./Task.js";
import { InProcessTeammateTask } from "./tasks/InProcessTeammateTask/InProcessTeammateTask.js";
export function getTaskByType(type: TaskType): Task | undefined {
  if (type === "in_process_teammate") return InProcessTeammateTask;
  return undefined;
}
