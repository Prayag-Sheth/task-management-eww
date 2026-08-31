import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, App, Avatar, Space, Tag } from 'antd';
import * as authApi from '../api/auth.api';
import { errorMessage } from '../api/client';
import { CreateTaskInput, Task, UpdateTaskInput, User, assigneeOf } from '../types';

interface TaskFormProps {
  open: boolean;
  /** When set, the dialog edits this task instead of creating one. */
  task?: Task | null;
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onEdit?: (id: string, input: UpdateTaskInput) => Promise<void>;
}

interface FormValues {
  title: string;
  description?: string;
  assignedTo: string;
}

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

export function TaskForm({ open, task, onClose, onCreate, onEdit }: TaskFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  const isEditing = Boolean(task);

  useEffect(() => {
    if (!open || isEditing) return;
    // Assignees are only needed when creating; editing does not change assignment.
    authApi
      .fetchUsers()
      .then(setUsers)
      .catch((err) => message.error(errorMessage(err, 'Could not load users')));
  }, [open, isEditing, message]);

  // Populate the form when the dialog opens for an existing task.
  useEffect(() => {
    if (!open) return;
    if (task) {
      form.setFieldsValue({ title: task.title, description: task.description });
    } else {
      form.resetFields();
    }
  }, [open, task, form]);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (task && onEdit) {
        await onEdit(task.id, {
          title: values.title,
          description: values.description ?? '',
        });
      } else {
        await onCreate(values);
      }
      close();
    } catch (err) {
      // validateFields rejects with its own shape; only report real failures.
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(errorMessage(err, isEditing ? 'Could not update task' : 'Could not create task'));
    } finally {
      setSubmitting(false);
    }
  };

  const assignee = task ? assigneeOf(task) : null;

  return (
    <Modal
      title={isEditing ? 'Edit task' : 'Create task'}
      open={open}
      onOk={handleOk}
      onCancel={close}
      okText={isEditing ? 'Save changes' : 'Create'}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false} onFinish={handleOk}>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Title is required' }]}
        >
          <Input placeholder="What needs doing?" maxLength={200} showCount />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea
            rows={4}
            maxLength={2000}
            showCount
            placeholder="Optional detail, context or acceptance criteria"
          />
        </Form.Item>

        {isEditing ? (
          // Assignment is changed from the list, not here — keep this dialog to
          // the fields the edit endpoint actually accepts.
          <Form.Item label="Assigned to">
            {assignee ? (
              <Space>
                <Avatar size={24} style={{ backgroundColor: colorFor(assignee.id), fontSize: 11 }}>
                  {initialsOf(assignee.name)}
                </Avatar>
                {assignee.name}
                <Tag>change from the list</Tag>
              </Space>
            ) : (
              '—'
            )}
          </Form.Item>
        ) : (
          <Form.Item
            name="assignedTo"
            label="Assign to"
            rules={[{ required: true, message: 'Please choose an assignee' }]}
          >
            <Select
              placeholder="Select a user"
              showSearch
              optionFilterProp="title"
              options={users.map((u) => ({
                value: u.id,
                title: u.name,
                label: (
                  <Space size={8}>
                    <Avatar size={22} style={{ backgroundColor: colorFor(u.id), fontSize: 10 }}>
                      {initialsOf(u.name)}
                    </Avatar>
                    {u.name}
                    <Tag color={u.role === 'admin' ? 'gold' : 'blue'}>{u.role}</Tag>
                  </Space>
                ),
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
