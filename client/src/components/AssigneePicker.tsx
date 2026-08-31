import { useMemo, useState } from 'react';
import { Avatar, Tag, Typography, Empty, Spin, Input } from 'antd';
import { CheckOutlined, SearchOutlined } from '@ant-design/icons';
import { User } from '../types';

interface AssigneePickerProps {
  users: User[];
  loading?: boolean;
  /** Supplied by Form.Item; the id of the selected user. */
  value?: string;
  onChange?: (userId: string) => void;
}

const AVATAR_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];

/** Search appears once the list is long enough to be worth filtering. */
const SEARCH_THRESHOLD = 8;

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
 *
 * The grid scrolls inside a fixed height: without the cap, a large team pushed
 * the dialog's own buttons off screen.
 */
export function AssigneePicker({ users, loading, value, onChange }: AssigneePickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  // Keep the selected person visible even when the filter excludes them.
  const ordered = useMemo(() => {
    const selected = filtered.find((u) => u.id === value);
    if (!selected) return filtered;
    return [selected, ...filtered.filter((u) => u.id !== value)];
  }, [filtered, value]);

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
    <div>
      {users.length > SEARCH_THRESHOLD && (
        <Input
          allowClear
          size="small"
          placeholder={`Search ${users.length} people`}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 8 }}
        />
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          // Roughly two rows; the rest scrolls rather than growing the dialog.
          maxHeight: 190,
          overflowY: 'auto',
          padding: 2,
        }}
      >
        {ordered.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`No one matches "${query}"`}
            style={{ margin: '8px auto' }}
          />
        )}

        {ordered.map((u) => {
          const selected = value === u.id;
          const accent = colorFor(u.id);

          return (
            <button
              key={u.id}
              type="button"
              onClick={() => onChange?.(u.id)}
              aria-pressed={selected}
              title={`${u.name} · ${u.email}`}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px 6px 6px',
                cursor: 'pointer',
                borderRadius: 999,
                background: selected ? `${accent}14` : '#fff',
                border: `1.5px solid ${selected ? accent : '#f0f0f0'}`,
                transition: 'all 0.15s ease',
                outline: 'none',
                maxWidth: '100%',
              }}
            >
              <Avatar
                size={28}
                style={{
                  backgroundColor: accent,
                  fontSize: 11,
                  flexShrink: 0,
                  boxShadow: selected ? `0 0 0 2px ${accent}33` : 'none',
                }}
              >
                {initialsOf(u.name)}
              </Avatar>

              <Typography.Text
                strong={selected}
                style={{ fontSize: 13, whiteSpace: 'nowrap', lineHeight: 1.2 }}
              >
                {u.name}
              </Typography.Text>

              {u.role === 'admin' && (
                <Tag
                  color="gold"
                  style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '15px', padding: '0 5px' }}
                >
                  admin
                </Tag>
              )}

              {selected && (
                <CheckOutlined style={{ color: accent, fontSize: 11, flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
