import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

const router = Router();

// Every task route requires a valid token.
router.use(authenticate);

router.get('/', taskController.listTasks);

router.post(
  '/',
  requireRole('admin'),
  validate(taskController.createTaskSchema),
  taskController.createTask
);

// Ownership (not role) decides this one, so it is checked in the service.
router.patch(
  '/:id/status',
  validate(taskController.updateStatusSchema),
  taskController.updateTaskStatus
);

router.patch(
  '/:id',
  requireRole('admin'),
  validate(taskController.updateTaskSchema),
  taskController.updateTask
);

router.delete('/:id', requireRole('admin'), taskController.deleteTask);

router.patch(
  '/:id/assign',
  requireRole('admin'),
  validate(taskController.assignTaskSchema),
  taskController.assignTask
);

export default router;
