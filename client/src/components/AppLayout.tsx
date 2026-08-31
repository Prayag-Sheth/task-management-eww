import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, Space, Tag, Button, Avatar, Dropdown } from 'antd';
import {
  UnorderedListOutlined,
  TeamOutlined,
  LogoutOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

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

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  // Only an admin can reach /users, so only they see the tab.
  const items = [
    { key: '/tasks', icon: <UnorderedListOutlined />, label: 'Tasks' },
    ...(isAdmin ? [{ key: '/users', icon: <TeamOutlined />, label: 'Users' }] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0, whiteSpace: 'nowrap' }}>
          Task Management
        </Typography.Title>

        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, borderBottom: 'none', minWidth: 0 }}
        />

        <Dropdown
          menu={{
            items: [
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Log out',
                danger: true,
                onClick: logout,
              },
            ],
          }}
        >
          <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
            <Space size={8}>
              <Avatar size={28} style={{ backgroundColor: colorFor(user.id) }}>
                {initialsOf(user.name)}
              </Avatar>
              <Space size={6}>
                <span>{user.name}</span>
                <Tag color={isAdmin ? 'gold' : 'blue'} style={{ marginInlineEnd: 0 }}>
                  {user.role}
                </Tag>
              </Space>
              <DownOutlined style={{ fontSize: 10 }} />
            </Space>
          </Button>
        </Dropdown>
      </Layout.Header>

      <Layout.Content
        style={{ padding: 24, maxWidth: 1180, width: '100%', margin: '0 auto' }}
      >
        {children}
      </Layout.Content>
    </Layout>
  );
}
