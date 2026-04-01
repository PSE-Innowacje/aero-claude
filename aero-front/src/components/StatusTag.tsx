import React, { type ReactNode } from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  SyncOutlined, MinusCircleOutlined, StopOutlined,
} from '@ant-design/icons';

interface StatusDef {
  color: string;
  icon: ReactNode;
  label: string;
}

const STATUS_OP: Record<number, StatusDef> = {
  1: { color: 'blue',    icon: <ClockCircleOutlined />,  label: 'Wprowadzone' },
  2: { color: 'red',     icon: <CloseCircleOutlined />,  label: 'Odrzucone' },
  3: { color: 'green',   icon: <CheckCircleOutlined />,  label: 'Potwierdzone' },
  4: { color: 'purple',  icon: <SyncOutlined spin />,    label: 'Zaplanowane' },
  5: { color: 'orange',  icon: <SyncOutlined />,         label: 'Częściowo zrealiz.' },
  6: { color: 'cyan',    icon: <CheckCircleOutlined />,  label: 'Zrealizowane' },
  7: { color: 'default', icon: <StopOutlined />,         label: 'Rezygnacja' },
};

const STATUS_ZL: Record<number, StatusDef> = {
  1: { color: 'blue',    icon: <ClockCircleOutlined />,  label: 'Wprowadzone' },
  2: { color: 'gold',    icon: <ClockCircleOutlined />,  label: 'Do akceptacji' },
  3: { color: 'red',     icon: <CloseCircleOutlined />,  label: 'Odrzucone' },
  4: { color: 'green',   icon: <CheckCircleOutlined />,  label: 'Zaakceptowane' },
  5: { color: 'orange',  icon: <SyncOutlined />,         label: 'Częściowo zrealiz.' },
  6: { color: 'cyan',    icon: <CheckCircleOutlined />,  label: 'Zrealizowane' },
  7: { color: 'default', icon: <MinusCircleOutlined />,  label: 'Nie zrealizowane' },
};

const FALLBACK: StatusDef = { color: 'default', icon: null, label: 'Nieznany' };

interface StatusTagProps {
  statusId: number;
}

export function StatusOperacjiTag({ statusId }: StatusTagProps) {
  const s = STATUS_OP[statusId] ?? { ...FALLBACK, label: `Status ${statusId}` };
  return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
}

export function StatusZleceniaTag({ statusId }: StatusTagProps) {
  const s = STATUS_ZL[statusId] ?? { ...FALLBACK, label: `Status ${statusId}` };
  return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
}
