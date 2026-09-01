import { useEffect, useMemo, useState } from 'react';
import { Avatar, Tag, Typography, Empty, Spin, Input } from 'antd';
import { CheckOutlined, SearchOutlined } from '@ant-design/icons';
import * as authApi from '../api/auth.api';
import { errorMessage } from '../api/client';
import { useDebounced } from '../hooks/useDebounced';
import { User } from '../types';

interface AssigneePickerProps {
  /** Supplied by Form.Item; the id of the selected user. */
  value?: string;
  onChange?: (userId: string) => void;
}

const AVATAR_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];
const PAGE_SIZE = 20;

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
 * Options are fetched a page at a time and narrowed by search rather than
 * loaded up front: a large directory would otherwise ship thousands of rows to
 * render one field. The current selection is pinned into the response so it
 * survives a search that excludes it.
 */
export function AssigneePicker({ value, onChange }: AssigneePickerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 350);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    authApi
      .fetchAssignableUsers({
        search: debouncedQuery,
        limit: PAGE_SIZE,
        ensure: value ? [value] : undefined,
      })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load users'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `value` is deliberately excluded: re-fetching on every selection would
    // reorder the cards under the pointer. It is only read to pin the initial
    // selection, which the first load already covers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Selected first, so the current choice is always the leftmost card.
  const ordered = useMemo(() => {
    const selected = users.find((u) => u.id === value);
    if (!selected) return users;
    return [selected, ...users.filter((u) => u.id !== value)];
  }, [users, value]);

  const hiddenCount = Math.max(0, total - users.length);

  return (
    <div>
      <Input
        allowClear
        size="small"
        placeholder={total ? `Search ${total} people` : 'Search people'}
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 8 }}
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          maxHeight: 190,
          overflowY: 'auto',
          padding: 2,
        }}
      >
        {loading && (
          <div style={{ display: 'grid', placeItems: 'center', width: '100%', padding: 20 }}>
            <Spin size="small" />
          </div>
        )}

        {!loading && error && (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            {error}
          </Typography.Text>
        )}

        {!loading && !error && ordered.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={query ? `No one matches "${query}"` : 'No users available'}
            style={{ margin: '8px auto' }}
          />
        )}

        {!loading &&
          !error &&
          ordered.map((u) => {
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

      {!loading && hiddenCount > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          Showing {users.length} of {total} — search to narrow the list
        </Typography.Text>
      )}
    </div>
  );
}
