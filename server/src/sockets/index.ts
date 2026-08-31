import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { env } from '../config/env';
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

export function initSockets(httpServer: HttpServer): IOServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
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
    const { userId } = socket.data;
    socket.join(roomFor(userId));
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

export function emitTaskUpdated(task: Task, updatedBy: string): void {
  io?.emit(SOCKET_EVENTS.TASK_UPDATED, {
    taskId: task.id,
    status: task.status,
    updatedBy,
  });
}
