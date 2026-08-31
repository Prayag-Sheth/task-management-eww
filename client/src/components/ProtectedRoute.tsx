import { Navigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  /** When set, the route also requires one of these roles. */
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Wait for the stored token to be validated, or a refresh bounces to /login.
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // The server enforces this too; the guard just avoids showing a page that
  // would only produce 403s.
  if (roles && !roles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="You do not have permission to view this page."
        extra={
          <Button type="primary" href="/tasks">
            Back to tasks
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
