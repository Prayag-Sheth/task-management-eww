import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, App } from 'antd';
import * as authApi from '../api/auth.api';
import { errorMessage } from '../api/client';
import { CreateTaskInput, User } from '../types';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}

/** Admin-only create-and-assign dialog. */
export function TaskForm({ open, onClose, onSubmit }: TaskFormProps) {
  const [form] = Form.useForm<CreateTaskInput>();
  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  // Assignees come from the admin-only /users endpoint. Admins are included:
  // an admin can be assigned a task like anyone else.
  useEffect(() => {
    if (!open) return;
    authApi
      .fetchUsers()
      .then(setUsers)
      .catch((err) => message.error(errorMessage(err, 'Could not load users')));
  }, [open, message]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onSubmit(values);
      form.resetFields();
      onClose();
    } catch (err) {
      // validateFields rejects with its own shape; only report real failures.
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(errorMessage(err, 'Could not create task'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create task"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="Create"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Title is required' }]}
        >
          <Input placeholder="What needs doing?" maxLength={200} />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} maxLength={2000} placeholder="Optional details" />
        </Form.Item>

        <Form.Item
          name="assignedTo"
          label="Assign to"
          rules={[{ required: true, message: 'Please choose an assignee' }]}
        >
          <Select
            placeholder="Select a user"
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.role})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
