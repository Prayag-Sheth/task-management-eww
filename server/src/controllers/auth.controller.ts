import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';
import { ROLES, SORT_ORDERS, USER_SORT_FIELDS } from '../types';

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Authentication required');
  const data = await authService.getUserById(req.user.id);
  res.json({ success: true, data });
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const data = await authService.listUsers();
  res.json({ success: true, data });
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(ROLES),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email('A valid email is required').optional(),
    role: z.enum(ROLES).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

/** Admin list, including per-user task counts. */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  role: z.enum(ROLES).optional(),
  sortBy: z.enum(USER_SORT_FIELDS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
});

export const listUsersWithStats = asyncHandler(async (req: Request, res: Response) => {
  const query = userListQuerySchema.parse(req.query);
  const result = await authService.listUsersWithTaskCounts(query);
  res.json({ success: true, data: result.items, meta: result.meta });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.createUser(req.body);
  res.status(201).json({ success: true, data });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.updateUser(req.params.id, req.body);
  res.json({ success: true, data });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Authentication required');
  await authService.deleteUser(req.user.id, req.params.id);
  res.status(204).send();
});
