import { useEffect, useState } from 'react';
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
  Card,
  Input,
} from 'antd';
import { EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { StatusSelect, StatusTag } from './StatusSelect';
import * as authApi from '../api/auth.api';
import { useDebounced } from '../hooks/useDebounced';
import {
  PageMeta,
  Role,
  Task,
  TaskListQuery,
  TaskSortField,
  TaskStatus,
  TASK_STATUSES,
  TaskStatusCounts,
  User,
  assigneeOf,
} from '../types';

interface TaskListProps {
  tasks: Task[];
  meta: PageMeta;
  counts: TaskStatusCounts;
  query: TaskListQuery;
  onQueryChange: (patch: Partial<TaskListQuery>) => void;
  loading: boolean;
  currentUser: User;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onReassign?: (id: string, assignedTo: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

const emptyTextFor = (role: Role, query: TaskListQuery) => {
  if (query.search) return `No tasks match "${query.search}".`;
  if (query.status) return `No ${STATUS_LABELS[query.status].toLowerCase()} tasks.`;
  return role === 'admin'
    ? 'No tasks yet — create one to get started.'
    : 'No tasks assigned to you yet.';
};

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
  meta,
  counts,
  query,
  onQueryChange,
  loading,
  currentUser,
  onStatusChange,
  onReassign,
  onEdit,
  onDelete,
}: TaskListProps) {
  const isAdmin = currentUser.role === 'admin';
  const [users, setUsers] = useState<User[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Local so typing stays responsive; the debounced value drives the request.
  const [searchText, setSearchText] = useState(query.search ?? '');
  const debouncedSearch = useDebounced(searchText, 350);

  useEffect(() => {
    if ((query.search ?? '') === debouncedSearch) return;
    onQueryChange({ search: debouncedSearch || undefined });
    // Only the debounced value should trigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (!isAdmin || !onReassign) return;
    authApi.fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, [isAdmin, onReassign]);

  const handleTableChange = (
    _pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<Task> | SorterResult<Task>[]
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (!s?.order) {
      onQueryChange({ sortBy: 'createdAt', order: 'desc' });
      return;
    }
    onQueryChange({
      sortBy: s.field as TaskSortField,
      order: s.order === 'ascend' ? 'asc' : 'desc',
    });
  };

  /** AntD wants 'ascend'/'descend'; the query carries 'asc'/'desc'. */
  const sortOrderFor = (field: TaskSortField) =>
    query.sortBy === field ? (query.order === 'asc' ? ('ascend' as const) : ('descend' as const)) : null;

  const columns: ColumnsType<Task> = [
    {
      title: 'Task',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      sortOrder: sortOrderFor('title'),
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
            <Avatar size={24} style={{ backgroundColor: colorFor(assignee.id), fontSize: 11 }}>
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
      dataIndex: 'status',
      width: 170,
      sorter: true,
      sortOrder: sortOrderFor('status'),
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
      width: 120,
      responsive: ['lg'],
      sorter: true,
      sortOrder: sortOrderFor('createdAt'),
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
              <Tooltip title="Delete task" open={confirmingId === task.id ? false : undefined}>
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
      <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <Segmented
          value={query.status ?? 'all'}
          onChange={(v) =>
            onQueryChange({ status: v === 'all' ? undefined : (v as TaskStatus) })
          }
          options={[
            { label: `All (${counts.all})`, value: 'all' },
            ...TASK_STATUSES.map((s) => ({
              label: `${STATUS_LABELS[s]} (${counts[s]})`,
              value: s,
            })),
          ]}
        />

        <Input
          allowClear
          placeholder="Search tasks"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 260 }}
        />
      </Space>

      <Card styles={{ body: { padding: '4px 16px' } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tasks}
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
            onChange: (page, pageSize) => onQueryChange({ page, limit: pageSize }),
          }}
          locale={{ emptyText: <Empty description={emptyTextFor(currentUser.role, query)} /> }}
        />
      </Card>
    </Space>
  );
}
