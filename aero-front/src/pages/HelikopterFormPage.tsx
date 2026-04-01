import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, InputNumber, Select, Button, Card, message, Skeleton, DatePicker } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getHelikopterById, createHelikopter, updateHelikopter, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';
import { radii } from '../theme';
import type { HelikopterPayload } from '../types/api';

const { Option } = Select;

export default function HelikopterFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [initLoad, setInitLoad] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    const controller = new AbortController();
    setInitLoad(true);
    getHelikopterById(Number(id), controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          form.setFieldsValue({
            ...data,
            dataWaznosciPrzegladu: data.dataWaznosciPrzegladu ? dayjs(data.dataWaznosciPrzegladu) : null,
          });
        }
      })
      .catch(err => { if (!controller.signal.aborted) message.error(extractApiError(err, 'Błąd ładowania.')); })
      .finally(() => { if (!controller.signal.aborted) setInitLoad(false); });
    return () => controller.abort();
  }, [id, form, isEdit]);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    const payload: HelikopterPayload = {
      numerRejestracyjny: values.numerRejestracyjny as string,
      typ: values.typ as string,
      opis: (values.opis as string) || undefined,
      maksLiczbaCzlonkowZalogi: values.maksLiczbaCzlonkowZalogi as number,
      maksUdzwigKg: values.maksUdzwigKg as number,
      zasiegKm: values.zasiegKm as number,
      status: values.status as string,
      dataWaznosciPrzegladu: (values.dataWaznosciPrzegladu as dayjs.Dayjs | null)?.format('YYYY-MM-DD') ?? null,
    };
    try {
      isEdit ? await updateHelikopter(Number(id), payload) : await createHelikopter(payload);
      message.success(isEdit ? 'Zaktualizowano!' : 'Dodano!');
      navigate('/helikoptery');
    } catch (err) {
      message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        icon={<SendOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        title={isEdit ? 'Edytuj helikopter' : 'Nowy helikopter'}
        backTo="/helikoptery"
      />
      <Card style={{ borderRadius: radii.xxl }} styles={{ body: { padding: 32 } }}>
        {initLoad ? <Skeleton active paragraph={{ rows: 7 }} /> : (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
            <Form.Item label="Numer rejestracyjny" name="numerRejestracyjny" rules={[{ required: true }]}>
              <Input placeholder="np. SP-HXY" size="large" />
            </Form.Item>
            <Form.Item label="Typ" name="typ" rules={[{ required: true }]}>
              <Input placeholder="np. Airbus H125" size="large" />
            </Form.Item>
            <Form.Item label="Opis" name="opis">
              <Input placeholder="Opcjonalny opis" />
            </Form.Item>
            <Form.Item label="Maks. liczba członków załogi" name="maksLiczbaCzlonkowZalogi" rules={[{ required: true }]}>
              <InputNumber min={1} max={10} style={{ width: '100%' }} size="large" />
            </Form.Item>
            <Form.Item label="Maks. udźwig (kg)" name="maksUdzwigKg" rules={[{ required: true }]}>
              <InputNumber min={1} max={1000} style={{ width: '100%' }} size="large" addonAfter="kg" />
            </Form.Item>
            <Form.Item label="Zasięg (km)" name="zasiegKm" rules={[{ required: true }]}>
              <InputNumber min={1} max={1000} style={{ width: '100%' }} size="large" addonAfter="km" />
            </Form.Item>
            <Form.Item label="Status" name="status" rules={[{ required: true }]} initialValue="aktywny">
              <Select size="large">
                <Option value="aktywny">Aktywny</Option>
                <Option value="nieaktywny">Nieaktywny</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Data ważności przeglądu" name="dataWaznosciPrzegladu">
              <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}
                size="large" style={{ flex: 1, height: 48, fontWeight: 600 }}>
                {isEdit ? 'Zapisz' : 'Dodaj'}
              </Button>
              <Button size="large" onClick={() => navigate('/helikoptery')} style={{ height: 48 }}>Anuluj</Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
