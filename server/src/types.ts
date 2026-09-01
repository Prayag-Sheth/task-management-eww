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

export const TASK_SORT_FIELDS = ['createdAt', 'title', 'status'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Query for a paged, searchable, sortable task list. */
export interface TaskListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  assignedTo?: string;
  sortBy?: TaskSortField;
  order?: SortOrder;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

/** Per-status totals for the whole result set, not just the current page. */
export interface TaskStatusCounts {
  all: number;
  todo: number;
  'in-progress': number;
  done: number;
}

export interface TaskListResult extends Paginated<Task> {
  counts: TaskStatusCounts;
}

export const USER_SORT_FIELDS = ['name', 'email', 'role', 'taskCount'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  sortBy?: UserSortField;
  order?: SortOrder;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
}

export interface AssignTaskInput {
  assignedTo: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  /** Optional: only sent when the admin is resetting the password. */
  password?: string;
}

/** A user plus derived counts, for the admin user list. */
export interface UserWithStats extends User {
  taskCount: number;
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
  TASK_DELETED: 'task:deleted',
  TASK_REASSIGNED: 'task:reassigned',
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

export interface TaskDeletedPayload {
  taskId: string;
}

/** Sent to the previous assignee and to admins, so both lists refresh. */
export interface TaskReassignedPayload {
  taskId: string;
}

export interface ServerToClientEvents {
  'task:assigned': (payload: TaskAssignedPayload) => void;
  'task:updated': (payload: TaskUpdatedPayload) => void;
  'task:deleted': (payload: TaskDeletedPayload) => void;
  'task:reassigned': (payload: TaskReassignedPayload) => void;
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
