import { api } from './client';
import {
  ApiSuccess,
  CreateUserInput,
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
  const { data } = await api.get<ApiSuccess<User[]>>('/users');
  return data.data;
}

/** Admin-only user management. */
export async function fetchUsersWithStats(): Promise<UserWithStats[]> {
  const { data } = await api.get<ApiSuccess<UserWithStats[]>>('/users');
  return data.data;
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
