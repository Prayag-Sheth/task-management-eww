import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { Tasks } from './pages/Tasks';
import { Users } from './pages/Users';

export default function App() {
  return (
    // AntdApp supplies the context that App.useApp() reads for notifications.
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#1677ff', borderRadius: 6 },
        components: { Table: { headerBg: '#fafafa' } },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Tasks />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <AppLayout>
                        <Users />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/tasks" replace />} />
              </Routes>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
