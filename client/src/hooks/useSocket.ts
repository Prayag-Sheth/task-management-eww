import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

/** Null until the socket has been created for the current token. */
export function useSocket() {
  return useContext(SocketContext);
}
