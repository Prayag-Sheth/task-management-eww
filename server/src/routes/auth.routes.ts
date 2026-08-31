import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/login', validate(authController.loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export default router;

/** Mounted at /users. Every route is admin-only. */
export const userRouter = Router();

userRouter.use(authenticate, requireRole('admin'));

userRouter.get('/', authController.listUsersWithStats);

userRouter.post(
  '/',
  validate(authController.createUserSchema),
  authController.createUser
);

userRouter.patch(
  '/:id',
  validate(authController.updateUserSchema),
  authController.updateUser
);

userRouter.delete('/:id', authController.deleteUser);
