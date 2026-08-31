import { Table, Empty, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { StatusSelect, StatusTag } from './StatusSelect';
import { Role, Task, TaskStatus, User, assigneeOf } from '../types';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  currentUser: User;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

const emptyTextFor = (role: Role) =>
  role === 'admin'
    ? 'No tasks yet — create one to get started.'
    : 'No tasks assigned to you yet.';

export function TaskList({ tasks, loading, currentUser, onStatusChange }: TaskListProps) {
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
        const isMe = assignee.id === currentUser.id;
        return isMe ? <Typography.Text strong>You</Typography.Text> : assignee.name;
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
    <Table
      rowKey="id"
      columns={columns}
      dataSource={tasks}
      loading={loading}
      pagination={false}
      locale={{
        emptyText: <Empty description={emptyTextFor(currentUser.role)} />,
      }}
    />
  );
}
