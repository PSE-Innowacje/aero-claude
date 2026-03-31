import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Button, Card, message, Skeleton, Switch } from 'antd';
import { SaveOutlined, UserOutlined } from '@ant-design/icons';
import { getUzytkownikById, createUzytkownik, updateUzytkownik, getRoleUzytkownikow, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Option } = Select;

export default function UzytkownikFormPage() {
  const [form]  = Form.useForm();
  const navigate = useNavigate();
  const { id }  = useParams();
  const isEdit  = Boolean(id);
  const [loading,  setLoading]  = useState(false);
  const [initLoad, setInitLoad] = useState(isEdit);
  const [role,     setRole]     = useState([]);

  useEffect(() => { getRoleUzytkownikow().then(setRole).catch(() => {}); }, []);

  useEffect(() => {
    if (!isEdit) return;
    setInitLoad(true);
    getUzytkownikById(id).then(data => form.setFieldsValue(data))
      .catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => setInitLoad(false));
  }, [id, form, isEdit]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      isEdit ? await updateUzytkownik(id, values) : await createUzytkownik(values);
      message.success(isEdit ? 'Zaktualizowano!' : 'Użytkownik dodany!');
      navigate('/uzytkownicy');
    } catch (err) {
      message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <PageHeader
        icon={<UserOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
        title={isEdit ? 'Edytuj użytkownika' : 'Nowy użytkownik'}
        backTo="/uzytkownicy"
      />
      <Card style={{ borderRadius: 18 }} styles={{ body: { padding: 32 } }}>
        {initLoad ? <Skeleton active paragraph={{ rows: 5 }} /> : (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
            <Form.Item label="Imię" name="imie" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item label="Nazwisko" name="nazwisko" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true }, { type: 'email' }]}>
              <Input size="large" />
            </Form.Item>
            {!isEdit && (
              <Form.Item label="Hasło" name="haslo"
                rules={[{ required: true }, { min: 8, message: 'Min. 8 znaków.' }]}>
                <Input.Password size="large" />
              </Form.Item>
            )}
            <Form.Item label="Rola" name="rolaId" rules={[{ required: true }]}>
              <Select size="large">
                {role.map(r => <Option key={r.id} value={r.id}>{r.nazwa}</Option>)}
              </Select>
            </Form.Item>
            {isEdit && (
              <Form.Item label="Aktywny" name="aktywny" valuePropName="checked">
                <Switch />
              </Form.Item>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}
                size="large" style={{ flex: 1, height: 48, fontWeight: 600 }}>
                {isEdit ? 'Zapisz' : 'Dodaj'}
              </Button>
              <Button size="large" onClick={() => navigate('/uzytkownicy')} style={{ height: 48 }}>Anuluj</Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
