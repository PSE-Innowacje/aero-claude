import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Card, message, Skeleton } from 'antd';
import { SaveOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getLadowiskoById, createLadowisko, updateLadowisko, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';
import { radii } from '../theme';
import type { LadowiskoPayload } from '../types/api';

interface LadowiskoFormValues {
  nazwa: string;
  szerokosc: number;
  dlugosc: number;
  opis?: string;
}

export default function LadowiskoFormPage() {
  const [form] = Form.useForm<LadowiskoFormValues>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [initLoad, setInitLoad] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    setInitLoad(true);
    getLadowiskoById(Number(id)).then(data => form.setFieldsValue(data))
      .catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => setInitLoad(false));
  }, [id, form, isEdit]);

  const onFinish = async (values: LadowiskoFormValues) => {
    setLoading(true);
    const payload: LadowiskoPayload = { ...values };
    try {
      isEdit ? await updateLadowisko(Number(id), payload) : await createLadowisko(payload);
      message.success(isEdit ? 'Zaktualizowano!' : 'Dodano!');
      navigate('/ladowiska');
    } catch (err) { message.error(extractApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <PageHeader icon={<EnvironmentOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        title={isEdit ? 'Edytuj lądowisko' : 'Nowe lądowisko'} backTo="/ladowiska" />
      <Card style={{ borderRadius: radii.xxl }} styles={{ body: { padding: 32 } }}>
        {initLoad ? <Skeleton active paragraph={{ rows: 4 }} /> : (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
            <Form.Item label="Nazwa" name="nazwa" rules={[{ required: true }]}>
              <Input size="large" placeholder="np. Krajnik" />
            </Form.Item>
            <Form.Item label="Szerokość geograficzna (lat)" name="szerokosc" rules={[{ required: true }]}>
              <InputNumber min={-90} max={90} precision={6} style={{ width: '100%' }} size="large" placeholder="np. 53.031200" />
            </Form.Item>
            <Form.Item label="Długość geograficzna (lon)" name="dlugosc" rules={[{ required: true }]}>
              <InputNumber min={-180} max={180} precision={6} style={{ width: '100%' }} size="large" placeholder="np. 14.315600" />
            </Form.Item>
            <Form.Item label="Opis" name="opis"><Input.TextArea rows={2} placeholder="Opcjonalny opis" /></Form.Item>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}
                size="large" style={{ flex: 1, height: 48, fontWeight: 600 }}>{isEdit ? 'Zapisz' : 'Dodaj'}</Button>
              <Button size="large" onClick={() => navigate('/ladowiska')} style={{ height: 48 }}>Anuluj</Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
