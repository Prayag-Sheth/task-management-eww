import axios, { AxiosError } from 'axios';
import { ApiError } from '../types';

const TOKEN_KEY = 'tm_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
});

// The only place the token is read — components never touch it.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // A 401 mid-session means the token is gone or expired: drop it and let
    // ProtectedRoute redirect on the next render.
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

/** Pulls the server's message out of an axios error for display. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiError>(err)) {
    return err.response?.data?.message ?? err.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
