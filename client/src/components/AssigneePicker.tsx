import { Avatar, Tag, Typography, Empty, Spin } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { User } from '../types';

interface AssigneePickerProps {
  users: User[];
  loading?: boolean;
  /** Supplied by Form.Item; the id of the selected user. */
  value?: string;
  onChange?: (userId: string) => void;
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

/**
 * Picks an assignee by clicking their card rather than opening a dropdown.
 * Shaped as a controlled input (value/onChange) so Form.Item drives it like
 * any other field, including validation.
 */
export function AssigneePicker({ users, loading, value, onChange }: AssigneePickerProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (users.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No users available" />;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {users.map((u) => {
        const selected = value === u.id;
        const accent = colorFor(u.id);

        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onChange?.(u.id)}
            aria-pressed={selected}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              width: 104,
              padding: '14px 8px 12px',
              cursor: 'pointer',
              borderRadius: 10,
              background: selected ? `${accent}0F` : '#fff',
              border: `1.5px solid ${selected ? accent : '#f0f0f0'}`,
              // Lift the selected card slightly so the choice reads at a glance.
              boxShadow: selected ? `0 2px 8px ${accent}33` : 'none',
              transform: selected ? 'translateY(-1px)' : 'none',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            {selected && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: accent,
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 9,
                }}
              >
                <CheckOutlined />
              </span>
            )}

            <Avatar
              size={40}
              style={{
                backgroundColor: accent,
                fontSize: 15,
                boxShadow: selected ? `0 0 0 3px ${accent}26` : 'none',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              {initialsOf(u.name)}
            </Avatar>

            <Typography.Text
              strong={selected}
              ellipsis={{ tooltip: `${u.name} · ${u.email}` }}
              style={{ fontSize: 12, maxWidth: '100%', lineHeight: 1.2 }}
            >
              {u.name}
            </Typography.Text>

            <Tag
              color={u.role === 'admin' ? 'gold' : 'blue'}
              style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}
            >
              {u.role}
            </Tag>
          </button>
        );
      })}
    </div>
  );
}
