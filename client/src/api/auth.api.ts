import { api } from './client';
import {
  ApiSuccess,
  CreateUserInput,
  PageMeta,
  Paginated,
  UserListQuery,
  LoginInput,
  LoginResponse,
  UpdateUserInput,
  User,
  UserWithStats,
} from '../types';

export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await api.post<ApiSuccess<LoginResponse>>('/auth/login', input);
  return data.data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<ApiSuccess<User>>('/auth/me');
  return data.data;
}

/** Admin-only: assignee list for the task form. */
export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<ApiSuccess<User[]>>('/users/all');
  return data.data;
}

/** Admin-only user management. */
interface UserListResponse extends ApiSuccess<UserWithStats[]> {
  meta: PageMeta;
}

export async function fetchUsersWithStats(
  query: UserListQuery = {}
): Promise<Paginated<UserWithStats>> {
  const { data } = await api.get<UserListResponse>('/users', { params: query });
  return { items: data.data, meta: data.meta };
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await api.post<ApiSuccess<User>>('/users', input);
  return data.data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data } = await api.patch<ApiSuccess<User>>(`/users/${id}`, input);
  return data.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
