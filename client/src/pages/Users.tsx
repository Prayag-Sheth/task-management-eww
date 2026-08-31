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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as authApi from '../api/auth.api';
import { errorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { UserForm } from '../components/UserForm';
import { CreateUserInput, UpdateUserInput, UserWithStats } from '../types';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserWithStats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await authApi.fetchUsersWithStats());
    } catch (err) {
      setError(errorMessage(err, 'Could not load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (input: CreateUserInput) => {
    await authApi.createUser(input);
    message.success('User created');
    await load();
  };

  const handleEdit = async (id: string, input: UpdateUserInput) => {
    await authApi.updateUser(id, input);
    message.success('User updated');
    await load();
  };

  const handleDelete = async (id: string) => {
    try {
      await authApi.deleteUser(id);
      message.success('User deleted');
      await load();
    } catch (err) {
      // A user with assigned tasks returns 409 with a message explaining why.
      message.error(errorMessage(err, 'Could not delete user'));
    }
  };

  const columns: ColumnsType<UserWithStats> = [
    {
      title: 'Name',
      key: 'name',
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
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>{role}</Tag>
      ),
    },
    {
      title: 'Assigned tasks',
      dataIndex: 'taskCount',
      key: 'taskCount',
      width: 150,
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
              >
                <Tooltip title="Delete user">
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
        <Typography.Text type="secondary">
          {users.length} user{users.length === 1 ? '' : 's'}
        </Typography.Text>
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

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description="No users found." /> }}
      />

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
