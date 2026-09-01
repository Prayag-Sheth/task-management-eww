import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Avatar,
  Popconfirm,
  Tooltip,
  Alert,
  Empty,
  App,
  Card,
  Input,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import * as authApi from '../api/auth.api';
import { errorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { UserForm } from '../components/UserForm';
import { useDebounced } from '../hooks/useDebounced';
import {
  CreateUserInput,
  PageMeta,
  UpdateUserInput,
  UserListQuery,
  UserSortField,
  UserWithStats,
} from '../types';

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

export function Users() {
  const { user: currentUser } = useAuth();
  const { message } = App.useApp();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<UserListQuery>({ page: 1, limit: 10, sortBy: 'name', order: 'asc' });
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserWithStats | null>(null);
  /** Row whose delete confirmation is open, so its tooltip can be suppressed. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async (q: UserListQuery) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.fetchUsersWithStats(q);
      setUsers(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(errorMessage(err, 'Could not load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  const debouncedSearch = useDebounced(searchText, 350);
  useEffect(() => {
    if ((query.search ?? '') === debouncedSearch) return;
    setQuery((prev) => ({ ...prev, search: debouncedSearch || undefined, page: 1 }));
    // Only the debounced value should trigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleTableChange = (
    _p: TablePaginationConfig,
    _f: unknown,
    sorter: SorterResult<UserWithStats> | SorterResult<UserWithStats>[]
  ) => {
    const srt = Array.isArray(sorter) ? sorter[0] : sorter;
    setQuery((prev) => ({
      ...prev,
      sortBy: (srt?.order ? (srt.field as UserSortField) : 'name'),
      order: srt?.order === 'descend' ? 'desc' : 'asc',
    }));
  };

  const sortOrderFor = (field: UserSortField) =>
    query.sortBy === field ? (query.order === 'desc' ? ('descend' as const) : ('ascend' as const)) : null;

  const handleCreate = async (input: CreateUserInput) => {
    await authApi.createUser(input);
    message.success('User created');
    await load(query);
  };

  const handleEdit = async (id: string, input: UpdateUserInput) => {
    await authApi.updateUser(id, input);
    message.success('User updated');
    await load(query);
  };

  const handleDelete = async (id: string) => {
    try {
      await authApi.deleteUser(id);
      message.success('User deleted');
      await load(query);
    } catch (err) {
      // A user with assigned tasks returns 409 with a message explaining why.
      message.error(errorMessage(err, 'Could not delete user'));
    }
  };

  const columns: ColumnsType<UserWithStats> = [
    {
      title: 'Name',
      key: 'name',
      dataIndex: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (_, u) => (
        <Space size={10}>
          <Avatar style={{ backgroundColor: colorFor(u.id) }}>{initialsOf(u.name)}</Avatar>
          <div>
            <Typography.Text strong style={{ display: 'block' }}>
              {u.name}
              {u.id === currentUser?.id && (
                <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                  {' '}
                  (you)
                </Typography.Text>
              )}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {u.email}
            </Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      sorter: true,
      sortOrder: sortOrderFor('role'),
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>{role}</Tag>
      ),
    },
    {
      title: 'Assigned tasks',
      dataIndex: 'taskCount',
      key: 'taskCount',
      width: 150,
      sorter: true,
      sortOrder: sortOrderFor('taskCount'),
      render: (count: number) => (
        <Typography.Text type={count === 0 ? 'secondary' : undefined}>
          {count}
        </Typography.Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, u) => {
        const isSelf = u.id === currentUser?.id;
        const hasTasks = u.taskCount > 0;
        const blockedReason = isSelf
          ? 'You cannot delete your own account'
          : hasTasks
            ? `Reassign this user's ${u.taskCount} task${u.taskCount === 1 ? '' : 's'} first`
            : null;

        return (
          <Space size={4}>
            <Tooltip title="Edit user">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditing(u);
                  setFormOpen(true);
                }}
              />
            </Tooltip>

            {blockedReason ? (
              <Tooltip title={blockedReason}>
                <Button type="text" danger icon={<DeleteOutlined />} disabled />
              </Tooltip>
            ) : (
              <Popconfirm
                title="Delete this user?"
                description="This cannot be undone."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(u.id)}
                // Hide the tooltip while the confirm is open, or both show at once.
                onOpenChange={(isOpen) => setConfirmingId(isOpen ? u.id : null)}
              >
                <Tooltip title="Delete user" open={confirmingId === u.id ? false : undefined}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Space size={12}>
          <Typography.Text type="secondary">
            {meta.total} user{meta.total === 1 ? '' : 's'}
          </Typography.Text>
          <Input
            allowClear
            placeholder="Search users"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add user
        </Button>
      </Space>

      {error && <Alert type="error" message={error} showIcon />}

      <Card styles={{ body: { padding: '4px 16px' } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
            onChange: (page, pageSize) =>
              setQuery((prev) => ({ ...prev, page, limit: pageSize })),
          }}
          locale={{
            emptyText: (
              <Empty
                description={query.search ? `No users match "${query.search}".` : 'No users found.'}
              />
            ),
          }}
        />
      </Card>

      <UserForm
        open={formOpen}
        user={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />
    </Space>
  );
}
