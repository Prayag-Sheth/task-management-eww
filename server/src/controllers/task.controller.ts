import { Request, Response } from 'express';
import { z } from 'zod';
import * as taskService from '../services/task.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';
import { TASK_STATUSES } from '../types';

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  assignedTo: z.string().min(1, 'An assignee is required'),
});

export const updateStatusSchema = z.object({
  status: z.enum(TASK_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${TASK_STATUSES.join(', ')}` }),
  }),
});

export const assignTaskSchema = z.object({
  assignedTo: z.string().min(1, 'An assignee is required'),
});

/** Every handler here runs behind `authenticate`, so req.user is set. */
function actorOf(req: Request) {
  if (!req.user) throw new AppError(401, 'Authentication required');
  return req.user;
}

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.listTasks(actorOf(req));
  res.json({ success: true, data });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.createTask(actorOf(req), req.body);
  res.status(201).json({ success: true, data });
});

export const updateTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.updateTaskStatus(
    actorOf(req),
    req.params.id,
    req.body.status
  );
  res.json({ success: true, data });
});

export const assignTask = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.assignTask(
    actorOf(req),
    req.params.id,
    req.body.assignedTo
  );
  res.json({ success: true, data });
});
