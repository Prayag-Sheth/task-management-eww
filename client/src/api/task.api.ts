import { api } from './client';
import {
  ApiSuccess,
  CreateTaskInput,
  PageMeta,
  Task,
  TaskListQuery,
  TaskListResult,
  TaskStatus,
  TaskStatusCounts,
  UpdateTaskInput,
} from '../types';

interface TaskListResponse extends ApiSuccess<Task[]> {
  meta: PageMeta;
  counts: TaskStatusCounts;
}

export async function fetchTasks(query: TaskListQuery = {}): Promise<TaskListResult> {
  const { data } = await api.get<TaskListResponse>('/tasks', { params: query });
  return { items: data.data, meta: data.meta, counts: data.counts };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data } = await api.post<ApiSuccess<Task>>('/tasks', input);
  return data.data;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const { data } = await api.patch<ApiSuccess<Task>>(`/tasks/${id}/status`, { status });
  return data.data;
}

export async function assignTask(id: string, assignedTo: string): Promise<Task> {
  const { data } = await api.patch<ApiSuccess<Task>>(`/tasks/${id}/assign`, { assignedTo });
  return data.data;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<Task> {
  const { data } = await api.patch<ApiSuccess<Task>>(`/tasks/${id}`, input);
  return data.data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
