import { createContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const SocketContext = createContext<AppSocket | null>(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<AppSocket | null>(null);

  useEffect(() => {
    // No token — make sure any previous connection is gone. Without this a
    // logged-out user's socket would keep receiving events.
    if (!token) {
      setSocket(null);
      return;
    }

    const next: AppSocket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
    });

    next.on('connect_error', (err) => {
      console.warn('Socket connection failed:', err.message);
    });

    setSocket(next);

    return () => {
      next.disconnect();
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
