import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function PageHeader({ icon, gradient, title, subtitle, backTo, extra }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {backTo && (
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backTo)} style={{ borderRadius: 10 }}>
            Powrót
          </Button>
        )}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <Title level={3} style={{ margin: 0 }}>{title}</Title>
          {subtitle && <Text type="secondary" style={{ fontSize: 13 }}>{subtitle}</Text>}
        </div>
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
}
