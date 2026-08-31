import { useState } from 'react';
import { Button, Typography, Space, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { TaskList } from '../components/TaskList';
import { TaskForm } from '../components/TaskForm';
import { Task } from '../types';

export function Tasks() {
  const { user } = useAuth();
  const { tasks, loading, error, createTask, updateStatus, reassign, editTask, removeTask } =
    useTasks();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ProtectedRoute guarantees a user here.
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const openCreate = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text type="secondary">
          {isAdmin ? 'All tasks' : 'Tasks assigned to you'}
        </Typography.Text>

        {/* Role-based UI: only an admin can create and assign. */}
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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
        onEdit={isAdmin ? openEdit : undefined}
        onDelete={isAdmin ? removeTask : undefined}
      />

      {isAdmin && (
        <TaskForm
          open={formOpen}
          task={editingTask}
          onClose={() => {
            setFormOpen(false);
            setEditingTask(null);
          }}
          onCreate={createTask}
          onEdit={editTask}
        />
      )}
    </Space>
  );
}
