import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';

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
