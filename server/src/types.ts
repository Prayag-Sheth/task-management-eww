/**
 * Shared domain contract.
 *
 * This file is intentionally duplicated at client/src/types.ts — the two copies
 * must be kept in sync. See README "Design decisions" for why this is a copy
 * rather than a shared workspace package.
 */

// ---------- Enums as const unions ----------

export const ROLES = ['admin', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = ['todo', 'in-progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// ---------- Domain shapes (what the API returns) ----------

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  /** Populated to a User on list/read, a plain id elsewhere. */
  assignedTo: User | string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Request payloads ----------

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignedTo: string;
}

export interface UpdateTaskStatusInput {
  status: TaskStatus;
}

export interface AssignTaskInput {
  assignedTo: string;
}

// ---------- Response envelope ----------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------- Auth ----------

export interface JwtPayload {
  sub: string;
  role: Role;
}

// ---------- Socket contract ----------

export const SOCKET_EVENTS = {
  TASK_ASSIGNED: 'task:assigned',
  TASK_UPDATED: 'task:updated',
} as const;

export interface TaskAssignedPayload {
  task: Task;
  message: string;
}

export interface TaskUpdatedPayload {
  taskId: string;
  status: TaskStatus;
  updatedBy: string;
}

export interface ServerToClientEvents {
  'task:assigned': (payload: TaskAssignedPayload) => void;
  'task:updated': (payload: TaskUpdatedPayload) => void;
}

// No client-initiated events are needed: the client only listens.
export interface ClientToServerEvents {}

export interface SocketData {
  userId: string;
  role: Role;
}

/** Helper for the populated case, which the UI needs to narrow. */
export function assigneeOf(task: Task): User | null {
  return typeof task.assignedTo === 'string' ? null : task.assignedTo;
}
