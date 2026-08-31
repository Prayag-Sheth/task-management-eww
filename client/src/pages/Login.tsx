import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../api/client';
import { LoginInput } from '../types';

export function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (user) return <Navigate to="/tasks" replace />;

  const handleSubmit = async (values: LoginInput) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(values);
      navigate('/tasks', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        padding: 16,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Task Management
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Sign in to view and manage your tasks.
        </Typography.Paragraph>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
        )}

        <Form layout="vertical" onFinish={handleSubmit} disabled={submitting}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input placeholder="admin@example.com" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
