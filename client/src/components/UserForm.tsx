import { useState } from 'react';
import { Modal, Form, Input, Select, App, Alert } from 'antd';
import { errorMessage } from '../api/client';
import { CreateUserInput, ROLES, UpdateUserInput, User } from '../types';

interface UserFormProps {
  open: boolean;
  /** When set, the dialog edits this user instead of creating one. */
  user?: User | null;
  onClose: () => void;
  onCreate: (input: CreateUserInput) => Promise<void>;
  onEdit: (id: string, input: UpdateUserInput) => Promise<void>;
}

interface FormValues {
  name: string;
  email: string;
  password?: string;
  role: (typeof ROLES)[number];
}

export function UserForm({ open, user, onClose, onCreate, onEdit }: UserFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  const isEditing = Boolean(user);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (user) {
        const patch: UpdateUserInput = {
          name: values.name,
          email: values.email,
          role: values.role,
        };
        // Only send a password when the admin actually typed a new one.
        if (values.password) patch.password = values.password;
        await onEdit(user.id, patch);
      } else {
        await onCreate(values as CreateUserInput);
      }
      close();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(
        errorMessage(err, isEditing ? 'Could not update user' : 'Could not create user')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit user' : 'Add user'}
      open={open}
      onOk={handleOk}
      onCancel={close}
      okText={isEditing ? 'Save changes' : 'Create user'}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        /*
         * initialValues, not a setFieldsValue effect: destroyOnClose unmounts
         * the fields, so an effect on open would populate a form that is then
         * recreated empty. The key remounts per user so these are re-applied.
         */
        key={user?.id ?? 'create'}
        initialValues={
          user
            ? { name: user.name, email: user.email, role: user.role }
            : { name: '', email: '', role: 'user' }
        }
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="Jane Smith" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Enter a valid email' },
          ]}
        >
          <Input placeholder="jane@example.com" />
        </Form.Item>

        <Form.Item
          name="password"
          label={isEditing ? 'New password' : 'Password'}
          rules={
            isEditing
              ? [{ min: 6, message: 'Password must be at least 6 characters' }]
              : [
                  { required: true, message: 'Password is required' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]
          }
          extra={isEditing ? 'Leave blank to keep the current password' : undefined}
        >
          <Input.Password placeholder="••••••••" autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: 'Role is required' }]}
        >
          <Select
            options={ROLES.map((r) => ({
              value: r,
              label: r === 'admin' ? 'Admin — can create and assign tasks' : 'User — can update own tasks',
            }))}
          />
        </Form.Item>

        {isEditing && user?.role === 'admin' && (
          <Alert
            type="info"
            showIcon
            message="Changing this admin to a user removes their ability to manage tasks and users."
          />
        )}
      </Form>
    </Modal>
  );
}
