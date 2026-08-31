import { useEffect, useMemo, useState } from 'react';
import { Table, Empty, Typography, Select, Segmented, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { StatusSelect, StatusTag } from './StatusSelect';
import * as authApi from '../api/auth.api';
import { Role, Task, TaskStatus, TASK_STATUSES, User, assigneeOf } from '../types';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  currentUser: User;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onReassign?: (id: string, assignedTo: string) => void;
}

type Filter = 'all' | TaskStatus;

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

const emptyTextFor = (role: Role, filter: Filter) => {
  if (filter !== 'all') return `No ${STATUS_LABELS[filter].toLowerCase()} tasks.`;
  return role === 'admin'
    ? 'No tasks yet — create one to get started.'
    : 'No tasks assigned to you yet.';
};

export function TaskList({
  tasks,
  loading,
  currentUser,
  onStatusChange,
  onReassign,
}: TaskListProps) {
  const isAdmin = currentUser.role === 'admin';
  const [filter, setFilter] = useState<Filter>('all');
  const [users, setUsers] = useState<User[]>([]);

  // Only an admin can reassign, and only an admin may call /users.
  useEffect(() => {
    if (!isAdmin || !onReassign) return;
    authApi.fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, [isAdmin, onReassign]);

  const visible = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: tasks.length,
      todo: 0,
      'in-progress': 0,
      done: 0,
    };
    for (const t of tasks) base[t.status] += 1;
    return base;
  }, [tasks]);

  const columns: ColumnsType<Task> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, task) => (
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          {task.description && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {task.description}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Assigned to',
      key: 'assignedTo',
      render: (_, task) => {
        const assignee = assigneeOf(task);
        if (!assignee) return <Typography.Text type="secondary">—</Typography.Text>;

        // Admins can move a task to someone else directly from the list.
        if (isAdmin && onReassign) {
          return (
            <Select
              value={assignee.id}
              onChange={(next) => onReassign(task.id, next)}
              style={{ width: 180 }}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          );
        }

        return assignee.id === currentUser.id ? (
          <Typography.Text strong>You</Typography.Text>
        ) : (
          assignee.name
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, task) => {
        const assignee = assigneeOf(task);
        // Only the assigned user may change status — admins included, per spec.
        const canEdit = assignee?.id === currentUser.id;

        return canEdit ? (
          <StatusSelect
            value={task.status}
            onChange={(status) => onStatusChange(task.id, status)}
          />
        ) : (
          <StatusTag status={task.status} />
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['md'],
      render: (iso: string) => new Date(iso).toLocaleDateString(),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Segmented
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        options={[
          { label: `All (${counts.all})`, value: 'all' },
          ...TASK_STATUSES.map((s) => ({
            label: `${STATUS_LABELS[s]} (${counts[s]})`,
            value: s,
          })),
        ]}
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={visible}
        loading={loading}
        pagination={false}
        locale={{
          emptyText: <Empty description={emptyTextFor(currentUser.role, filter)} />,
        }}
      />
    </Space>
  );
}
