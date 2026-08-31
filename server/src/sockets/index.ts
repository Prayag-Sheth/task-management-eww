import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { isAllowedOrigin } from '../config/cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  SOCKET_EVENTS,
  Task,
} from '../types';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

let io: IOServer | null = null;

/** Room name for a user. One room per user handles multiple tabs for free. */
const roomFor = (userId: string) => `user:${userId}`;

/** Admins additionally share a room, since they can see every task. */
const ADMIN_ROOM = 'role:admin';

export function initSockets(httpServer: HttpServer): IOServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, {
    cors: {
      origin: (origin, callback) =>
        !origin || isAllowedOrigin(origin)
          ? callback(null, true)
          : callback(new Error('Origin not allowed by CORS')),
      credentials: true,
    },
  });

  // No anonymous sockets: a valid token is required at handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.data;
    socket.join(roomFor(userId));
    if (role === 'admin') socket.join(ADMIN_ROOM);
    console.log(`Socket connected: ${socket.id} (user ${userId})`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emits are no-ops when the recipient is offline — they will see the task on
 * their next load. That is expected, not a failure.
 */
export function emitTaskAssigned(assigneeId: string, task: Task): void {
  io?.to(roomFor(assigneeId)).emit(SOCKET_EVENTS.TASK_ASSIGNED, {
    task,
    message: `You have been assigned: ${task.title}`,
  });
}

/**
 * Status changes go to admins only — they are the only ones who can see every
 * task. A global broadcast would leak task ids to users who cannot read them.
 */
export function emitTaskUpdated(task: Task, updatedBy: string): void {
  io?.to(ADMIN_ROOM).emit(SOCKET_EVENTS.TASK_UPDATED, {
    taskId: task.id,
    status: task.status,
    updatedBy,
  });
}

/** Deletions go to admins; a user simply stops seeing the task on reload. */
export function emitTaskDeleted(taskId: string): void {
  io?.to(ADMIN_ROOM).emit(SOCKET_EVENTS.TASK_DELETED, { taskId });
}
