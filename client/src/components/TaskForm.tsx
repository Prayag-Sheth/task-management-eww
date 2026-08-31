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
  onReassign?: (id: string, assignedTo: string) => Promise<void>;
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

export function TaskForm({
  open,
  task,
  onClose,
  onCreate,
  onEdit,
  onReassign,
}: TaskFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  const isEditing = Boolean(task);

  // Assignees are needed in both modes now that the dialog can reassign.
  useEffect(() => {
    if (!open) return;
    authApi
      .fetchUsers()
      .then(setUsers)
      .catch((err) => message.error(errorMessage(err, 'Could not load users')));
  }, [open, message]);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (task && onEdit) {
        const currentAssignee = assigneeOf(task);
        const titleChanged = values.title !== task.title;
        const descChanged = (values.description ?? '') !== (task.description ?? '');
        const assigneeChanged =
          Boolean(values.assignedTo) && values.assignedTo !== currentAssignee?.id;

        // Fields and assignment live behind different endpoints, so a single
        // save may need both calls. Content first: if reassignment fails, the
        // edit is still persisted rather than silently lost.
        if (titleChanged || descChanged) {
          await onEdit(task.id, {
            title: values.title,
            description: values.description ?? '',
          });
        }
        if (assigneeChanged && onReassign) {
          // onReassign reports its own failure, so bail out quietly and leave
          // the dialog open rather than showing a second error.
          try {
            await onReassign(task.id, values.assignedTo);
          } catch {
            return;
          }
        }
        if (!titleChanged && !descChanged && !assigneeChanged) {
          message.info('No changes to save');
        }
      } else {
        await onCreate(values);
      }
      close();
    } catch (err) {
      // validateFields rejects with its own shape; only report real failures.
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(
        errorMessage(err, isEditing ? 'Could not update task' : 'Could not create task')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const assigneeOptions = users.map((u) => ({
    value: u.id,
    title: u.name,
    label: (
      <Space size={8}>
        <Avatar size={22} style={{ backgroundColor: colorFor(u.id), fontSize: 10 }}>
          {initialsOf(u.name)}
        </Avatar>
        {u.name}
        <Tag color={u.role === 'admin' ? 'gold' : 'blue'} style={{ marginInlineEnd: 0 }}>
          {u.role}
        </Tag>
      </Space>
    ),
  }));

  return (
    <Modal
      title={isEditing ? 'Edit task' : 'Create task'}
      open={open}
      onOk={handleOk}
      onCancel={close}
      okText={isEditing ? 'Save changes' : 'Create'}
      confirmLoading={submitting}
      // Remount per open so initialValues below are re-read for the new task.
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        /*
         * initialValues, not a setFieldsValue effect: with destroyOnClose the
         * fields unmount on close, so an effect firing on open would write to
         * a form that is then recreated empty. The key forces a fresh mount
         * per task so these values are re-applied.
         */
        key={task?.id ?? 'create'}
        initialValues={
          task
            ? {
                title: task.title,
                description: task.description ?? '',
                assignedTo: assigneeOf(task)?.id,
              }
            : { title: '', description: '', assignedTo: undefined }
        }
      >
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

        <Form.Item
          name="assignedTo"
          label="Assign to"
          rules={[{ required: true, message: 'Please choose an assignee' }]}
        >
          <Select
            placeholder="Select a user"
            showSearch
            optionFilterProp="title"
            loading={users.length === 0}
            options={assigneeOptions}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
