import { Router } from 'express';
import authRoutes, { userRouter } from './auth.routes';
import taskRoutes from './task.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.use('/auth', authRoutes);
router.use('/users', userRouter);
router.use('/tasks', taskRoutes);

export default router;
