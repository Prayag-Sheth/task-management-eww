import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import * as taskApi from '../api/task.api';
import { errorMessage } from '../api/client';
import { useSocket } from './useSocket';
import {
  CreateTaskInput,
  PageMeta,
  SOCKET_EVENTS,
  Task,
  TaskListQuery,
  TaskStatus,
  TaskStatusCounts,
  UpdateTaskInput,
} from '../types';

const EMPTY_COUNTS: TaskStatusCounts = { all: 0, todo: 0, 'in-progress': 0, done: 0 };
const DEFAULT_QUERY: TaskListQuery = { page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' };

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState<TaskStatusCounts>(EMPTY_COUNTS);
  const [query, setQuery] = useState<TaskListQuery>(DEFAULT_QUERY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();
  const { notification, message } = App.useApp();

  // Guards against an earlier request resolving after a later one and
  // overwriting fresher results.
  const requestId = useRef(0);

  const load = useCallback(
    async (q: TaskListQuery) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const result = await taskApi.fetchTasks(q);
        if (id !== requestId.current) return;
        setTasks(result.items);
        setMeta(result.meta);
        setCounts(result.counts);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(errorMessage(err, 'Could not load tasks'));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(query);
  }, [load, query]);

  const reload = useCallback(() => load(query), [load, query]);

  /** Merges a partial query, resetting to page 1 unless the page itself moved. */
  const updateQuery = useCallback((patch: Partial<TaskListQuery>) => {
    setQuery((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? 1,
    }));
  }, []);

  // Realtime: refetch rather than splicing, so paging, sorting and counts stay
  // consistent with what the server would return.
  useEffect(() => {
    if (!socket) return;

    const onAssigned = ({ message: text }: { task: Task; message: string }) => {
      notification.info({
        message: 'New task assigned',
        description: text,
        placement: 'topRight',
      });
      void load(query);
    };

    const onUpdated = ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    };

    const onDeleted = ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    };

    socket.on(SOCKET_EVENTS.TASK_ASSIGNED, onAssigned);
    socket.on(SOCKET_EVENTS.TASK_UPDATED, onUpdated);
    socket.on(SOCKET_EVENTS.TASK_DELETED, onDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.TASK_ASSIGNED, onAssigned);
      socket.off(SOCKET_EVENTS.TASK_UPDATED, onUpdated);
      socket.off(SOCKET_EVENTS.TASK_DELETED, onDeleted);
    };
  }, [socket, notification, load, query]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      await taskApi.createTask(input);
      message.success('Task created');
      await load(query);
    },
    [message, load, query]
  );

  const updateStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      let rollbackTo: TaskStatus | undefined;

      // Optimistic: show the new status immediately. Capture the old status
      // inside the updater so it reflects the state at the moment of the edit.
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          rollbackTo = t.status;
          return { ...t, status };
        })
      );

      try {
        const updated = await taskApi.updateTaskStatus(id, status);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        // Counts shift with the status, so refresh them from the server.
        setCounts((prev) => {
          if (!rollbackTo || rollbackTo === status) return prev;
          return { ...prev, [rollbackTo]: prev[rollbackTo] - 1, [status]: prev[status] + 1 };
        });
      } catch (err) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id && rollbackTo ? { ...t, status: rollbackTo } : t))
        );
        message.error(errorMessage(err, 'Could not update status'));
      }
    },
    [message]
  );

  /**
   * Rethrows after reporting, so a caller mid-save (the edit dialog) can keep
   * itself open instead of closing as though the change had been applied.
   */
  const reassign = useCallback(
    async (id: string, assignedTo: string) => {
      try {
        const updated = await taskApi.assignTask(id, assignedTo);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        message.success('Task reassigned');
      } catch (err) {
        message.error(errorMessage(err, 'Could not reassign task'));
        throw err;
      }
    },
    [message]
  );

  const editTask = useCallback(
    async (id: string, input: UpdateTaskInput) => {
      const updated = await taskApi.updateTask(id, input);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      message.success('Task updated');
    },
    [message]
  );

  const removeTask = useCallback(
    async (id: string) => {
      try {
        await taskApi.deleteTask(id);
        message.success('Task deleted');
        // Refetch: deleting the last row of a page should pull the next one up.
        await load(query);
      } catch (err) {
        message.error(errorMessage(err, 'Could not delete task'));
      }
    },
    [message, load, query]
  );

  return {
    tasks,
    meta,
    counts,
    query,
    updateQuery,
    loading,
    error,
    reload,
    createTask,
    updateStatus,
    reassign,
    editTask,
    removeTask,
  };
}
