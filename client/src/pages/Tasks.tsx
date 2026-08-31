import { useState } from 'react';
import { Layout, Button, Typography, Space, Tag, Alert } from 'antd';
import { PlusOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { TaskList } from '../components/TaskList';
import { TaskForm } from '../components/TaskForm';

export function Tasks() {
  const { user, logout } = useAuth();
  const { tasks, loading, error, createTask, updateStatus, reassign } = useTasks();
  const [formOpen, setFormOpen] = useState(false);

  // ProtectedRoute guarantees a user here.
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Task Management
        </Typography.Title>

        <Space>
          <Typography.Text>{user.name}</Typography.Text>
          <Tag color={isAdmin ? 'gold' : 'blue'}>{user.role}</Tag>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            Log out
          </Button>
        </Space>
      </Layout.Header>

      <Layout.Content style={{ padding: 24, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Typography.Text type="secondary">
              {isAdmin ? 'All tasks' : 'Tasks assigned to you'}
            </Typography.Text>

            {/* Role-based UI: only an admin can create and assign. */}
            {isAdmin && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
                Create task
              </Button>
            )}
          </Space>

          {error && <Alert type="error" message={error} showIcon />}

          <TaskList
            tasks={tasks}
            loading={loading}
            currentUser={user}
            onStatusChange={updateStatus}
            onReassign={isAdmin ? reassign : undefined}
          />
        </Space>
      </Layout.Content>

      {isAdmin && (
        <TaskForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={createTask}
        />
      )}
    </Layout>
  );
}
