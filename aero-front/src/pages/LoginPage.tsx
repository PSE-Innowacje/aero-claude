import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, AppstoreOutlined } from '@ant-design/icons';
import { login as apiLogin, extractApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { palette, gradients, radii, fontFamilyDisplay } from '../theme';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  haslo: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const onFinish = async ({ email, haslo }: LoginFormValues) => {
    setLoading(true);
    try {
      const result = await apiLogin(email, haslo);
      login(result.token, result.refreshToken, result.uzytkownik);
      message.success(`Witaj, ${result.uzytkownik.imie}!`);
      navigate(from, { replace: true });
    } catch (err) {
      message.error(extractApiError(err, 'Nieprawidłowy email lub hasło.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: palette.bgLogin,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: radii.xxl,
            background: gradients.logo,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <AppstoreOutlined style={{ color: '#fff', fontSize: 30 }} />
          </div>
          <Title level={2} style={{ margin: 0, fontFamily: fontFamilyDisplay }}>LotyAdmin</Title>
          <Text type="secondary">Panel operacji lotniczych</Text>
        </div>

        <Card style={{ borderRadius: radii.round, border: `1px solid ${palette.borderLight}` }} styles={{ body: { padding: 36 } }}>
          <Title level={4} style={{ margin: '0 0 24px' }}>Zaloguj się</Title>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Adres email"
              rules={[
                { required: true, message: 'Email jest wymagany.' },
                { type: 'email', message: 'Nieprawidłowy format.' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: palette.textMuted }} />}
                placeholder="adres@firma.pl"
                size="large"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="haslo"
              label="Hasło"
              rules={[{ required: true, message: 'Hasło jest wymagane.' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: palette.textMuted }} />}
                placeholder="••••••••"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{ height: 48, fontWeight: 600, marginTop: 8 }}
            >
              Zaloguj się
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
