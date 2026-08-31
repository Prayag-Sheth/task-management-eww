import { api } from './client';
import { ApiSuccess, LoginInput, LoginResponse, User } from '../types';

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
