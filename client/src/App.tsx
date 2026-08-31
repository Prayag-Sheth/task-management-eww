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
        components: {
          // Plain list rather than a data grid: no header fill or cell
          // dividers, just a light separator between rows.
          Table: {
            headerBg: 'transparent',
            headerSplitColor: 'transparent',
            headerColor: '#8c8c8c',
            borderColor: '#f0f0f0',
            rowHoverBg: '#fafafa',
            cellPaddingBlock: 14,
          },
          // A white-on-grey selected pill was too faint to spot; fill it with
          // the primary colour so the active filter is unmistakable.
          Segmented: {
            itemSelectedBg: '#1677ff',
            itemSelectedColor: '#fff',
            itemHoverBg: '#e6f4ff',
            trackBg: '#f0f0f0',
            trackPadding: 3,
          },
        },
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
