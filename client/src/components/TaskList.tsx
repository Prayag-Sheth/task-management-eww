import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Table,
  Empty,
  Typography,
  Select,
  Segmented,
  Space,
  Button,
  Popconfirm,
  Tooltip,
  Avatar,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
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

/** Deterministic colour per user, so an avatar is recognisable at a glance. */
const AVATAR_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];
function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export function TaskList({
  tasks,
  loading,
  currentUser,
  onStatusChange,
  onReassign,
  onEdit,
  onDelete,
}: TaskListProps) {
  const isAdmin = currentUser.role === 'admin';
  const [filter, setFilter] = useState<Filter>('all');
  const [users, setUsers] = useState<User[]>([]);
  /** Row whose delete confirmation is open, so its tooltip can be suppressed. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !onReassign) return;
    authApi.fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, [isAdmin, onReassign]);

  /**
   * Rows are ordered by first-seen id, not by the live task order. Without this
   * a status or assignee change re-sorts the table and the row jumps out from
   * under the pointer mid-interaction.
   */
  const orderRef = useRef<string[]>([]);
  const ordered = useMemo(() => {
    const known = new Set(orderRef.current);
    const additions = tasks.map((t) => t.id).filter((id) => !known.has(id));
    // New tasks (including ones arriving over the socket) go to the top.
    orderRef.current = [...additions, ...orderRef.current];

    const byId = new Map(tasks.map((t) => [t.id, t]));
    orderRef.current = orderRef.current.filter((id) => byId.has(id));
    return orderRef.current.map((id) => byId.get(id)!);
  }, [tasks]);

  const visible = useMemo(
    () => (filter === 'all' ? ordered : ordered.filter((t) => t.status === filter)),
    [ordered, filter]
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
      title: 'Task',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, task) => (
        <div style={{ maxWidth: 420 }}>
          <Typography.Text strong style={{ display: 'block' }}>
            {title}
          </Typography.Text>
          {task.description ? (
            <Typography.Paragraph
              type="secondary"
              style={{ fontSize: 12, marginBottom: 0, marginTop: 2 }}
              ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
            >
              {task.description}
            </Typography.Paragraph>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
              No description
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: 'Assigned to',
      key: 'assignedTo',
      width: 220,
      render: (_, task) => {
        const assignee = assigneeOf(task);
        if (!assignee) return <Typography.Text type="secondary">—</Typography.Text>;

        if (isAdmin && onReassign) {
          return (
            <Select
              value={assignee.id}
              onChange={(next) => onReassign(task.id, next)}
              style={{ width: 190 }}
              variant="borderless"
              options={users.map((u) => ({
                value: u.id,
                label: (
                  <Space size={6}>
                    <Avatar size={20} style={{ backgroundColor: colorFor(u.id), fontSize: 10 }}>
                      {initialsOf(u.name)}
                    </Avatar>
                    {u.name}
                  </Space>
                ),
              }))}
            />
          );
        }

        return (
          <Space size={8}>
            <Avatar
              size={24}
              style={{ backgroundColor: colorFor(assignee.id), fontSize: 11 }}
            >
              {initialsOf(assignee.name)}
            </Avatar>
            {assignee.id === currentUser.id ? (
              <Typography.Text strong>You</Typography.Text>
            ) : (
              assignee.name
            )}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 170,
      render: (_, task) => {
        const assignee = assigneeOf(task);
        // The assignee owns their status; an admin may override any task.
        const canEdit = assignee?.id === currentUser.id || isAdmin;

        return canEdit ? (
          <StatusSelect
            value={task.status}
            onChange={(status) => onStatusChange(task.id, status)}
          />
        ) : (
          <Tooltip title="Only the assigned user can change status">
            <span>
              <StatusTag status={task.status} />
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      responsive: ['lg'],
      render: (iso: string) => (
        <Tooltip title={new Date(iso).toLocaleString()}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(iso).toLocaleDateString()}
          </Typography.Text>
        </Tooltip>
      ),
    },
  ];

  if (isAdmin && (onEdit || onDelete)) {
    columns.push({
      title: '',
      key: 'actions',
      width: 90,
      align: 'right',
      render: (_, task) => (
        <Space size={4}>
          {onEdit && (
            <Tooltip title="Edit task">
              <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(task)} />
            </Tooltip>
          )}
          {onDelete && (
            <Popconfirm
              title="Delete this task?"
              description="This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(task.id)}
              // Hide the tooltip while the confirm is open, or both show at once.
              onOpenChange={(isOpen) => setConfirmingId(isOpen ? task.id : null)}
            >
              <Tooltip
                title="Delete task"
                open={confirmingId === task.id ? false : undefined}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    });
  }

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
        locale={{ emptyText: <Empty description={emptyTextFor(currentUser.role, filter)} /> }}
      />
    </Space>
  );
}
