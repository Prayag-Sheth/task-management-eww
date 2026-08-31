import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';
import { ROLES } from '../types';

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
export const listUsersWithStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await authService.listUsersWithTaskCounts();
  res.json({ success: true, data });
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
