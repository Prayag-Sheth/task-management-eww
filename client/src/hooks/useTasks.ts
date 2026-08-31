import { useCallback, useEffect, useState } from 'react';
import { App } from 'antd';
import * as taskApi from '../api/task.api';
import { errorMessage } from '../api/client';
import { useSocket } from './useSocket';
import { CreateTaskInput, SOCKET_EVENTS, Task, TaskStatus } from '../types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();
  const { notification, message } = App.useApp();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await taskApi.fetchTasks());
    } catch (err) {
      setError(errorMessage(err, 'Could not load tasks'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: a task assigned to this user arrives without a refetch.
  useEffect(() => {
    if (!socket) return;

    const onAssigned = ({ task, message: text }: { task: Task; message: string }) => {
      notification.info({
        message: 'New task assigned',
        description: text,
        placement: 'topRight',
      });
      // Dedupe: the task may already be present from a concurrent refetch.
      setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
    };

    const onUpdated = ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    };

    socket.on(SOCKET_EVENTS.TASK_ASSIGNED, onAssigned);
    socket.on(SOCKET_EVENTS.TASK_UPDATED, onUpdated);

    return () => {
      socket.off(SOCKET_EVENTS.TASK_ASSIGNED, onAssigned);
      socket.off(SOCKET_EVENTS.TASK_UPDATED, onUpdated);
    };
  }, [socket, notification]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      const created = await taskApi.createTask(input);
      setTasks((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      message.success('Task created');
    },
    [message]
  );

  const updateStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      const previous = tasks;
      // Optimistic: show the new status immediately, roll back if it fails.
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      try {
        const updated = await taskApi.updateTaskStatus(id, status);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch (err) {
        setTasks(previous);
        message.error(errorMessage(err, 'Could not update status'));
      }
    },
    [tasks, message]
  );

  return { tasks, loading, error, reload: load, createTask, updateStatus };
}
