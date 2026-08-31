import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/login', validate(authController.loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export default router;

/** Mounted separately at /users — admin-only assignee list. */
export const userRouter = Router();
userRouter.get('/', authenticate, requireRole('admin'), authController.listUsers);
