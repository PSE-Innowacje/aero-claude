import React from 'react';
import {
  CheckOutlined, CloseOutlined, StopOutlined,
  RocketOutlined, CheckCircleOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import type { StatusTransitionRule } from '../constants/statusTransitions';

const ICON_MAP: Record<NonNullable<StatusTransitionRule['iconName']>, React.ReactNode> = {
  check:       <CheckOutlined />,
  close:       <CloseOutlined />,
  stop:        <StopOutlined />,
  rocket:      <RocketOutlined />,
  checkCircle: <CheckCircleOutlined />,
  minusCircle: <MinusCircleOutlined />,
};

/** Returns the Ant Design icon for a status transition rule. */
export function transitionIcon(rule: StatusTransitionRule): React.ReactNode {
  return rule.iconName ? ICON_MAP[rule.iconName] : undefined;
}
