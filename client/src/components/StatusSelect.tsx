import { Select, Tag } from 'antd';
import { TASK_STATUSES, TaskStatus } from '../types';

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: 'default' },
  'in-progress': { label: 'In Progress', color: 'processing' },
  done: { label: 'Done', color: 'success' },
};

export function StatusTag({ status }: { status: TaskStatus }) {
  const { label, color } = STATUS_META[status];
  return <Tag color={color}>{label}</Tag>;
}

interface StatusSelectProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  return (
    <Select<TaskStatus>
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{ width: 150 }}
      options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
    />
  );
}
