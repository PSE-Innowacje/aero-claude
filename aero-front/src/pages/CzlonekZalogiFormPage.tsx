import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, InputNumber, Select, Button, Card, message, Skeleton, DatePicker, Switch } from 'antd';
import { SaveOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCzlonekById, createCzlonek, updateCzlonek, getRoleZalogi, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';
import { radii } from '../theme';
import type { SlownikDto, CzlonekZalogiPayload } from '../types/api';

const { Option } = Select;

interface CzlonekFormValues {
  imie: string;
  nazwisko: string;
  email: string;
  wagaKg: number;
  rolaId: number;
  nrLicencjiPilota?: string;
  dataWaznosciLicencji: dayjs.Dayjs | null;
  dataWaznosciSzkolenia: dayjs.Dayjs | null;
  aktywny?: boolean;
}

export default function CzlonekZalogiFormPage() {
  const [form] = Form.useForm<CzlonekFormValues>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [initLoad, setInitLoad] = useState(isEdit);
  const [role, setRole] = useState<SlownikDto[]>([]);
  const [rolaNazwa, setRolaNazwa] = useState('');

  useEffect(() => {
    getRoleZalogi().then(setRole).catch(() => message.warning('Nie udało się załadować ról.'));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setInitLoad(true);
    getCzlonekById(Number(id)).then(data => {
      form.setFieldsValue({
        ...data,
        dataWaznosciLicencji: data.dataWaznosciLicencji ? dayjs(data.dataWaznosciLicencji) : null,
        dataWaznosciSzkolenia: data.dataWaznosciSzkolenia ? dayjs(data.dataWaznosciSzkolenia) : null,
      });
      setRolaNazwa(data.rolaNazwa);
    }).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => setInitLoad(false));
  }, [id, form, isEdit]);

  const onFinish = async (values: CzlonekFormValues) => {
    setLoading(true);
    const payload: CzlonekZalogiPayload = {
      imie: values.imie,
      nazwisko: values.nazwisko,
      email: values.email,
      wagaKg: values.wagaKg,
      rolaId: values.rolaId,
      nrLicencjiPilota: values.nrLicencjiPilota,
      dataWaznosciLicencji: values.dataWaznosciLicencji?.format('YYYY-MM-DD') ?? null,
      dataWaznosciSzkolenia: values.dataWaznosciSzkolenia?.format('YYYY-MM-DD') ?? '',
      aktywny: values.aktywny,
    };
    try {
      isEdit ? await updateCzlonek(Number(id), payload) : await createCzlonek(payload);
      message.success(isEdit ? 'Zaktualizowano!' : 'Dodano!');
      navigate('/czlonkowie-zalogi');
    } catch (err) { message.error(extractApiError(err)); }
    finally { setLoading(false); }
  };

  const selectedRole = role.find(r => r.id === form.getFieldValue('rolaId'));
  const isPilot = selectedRole?.nazwa === 'Pilot' || rolaNazwa === 'Pilot';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader icon={<TeamOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        title={isEdit ? 'Edytuj członka załogi' : 'Nowy członek załogi'} backTo="/czlonkowie-zalogi" />
      <Card style={{ borderRadius: radii.xxl }} styles={{ body: { padding: 32 } }}>
        {initLoad ? <Skeleton active paragraph={{ rows: 8 }} /> : (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional"
            onValuesChange={(changed) => {
              if (changed.rolaId) { const r = role.find(x => x.id === changed.rolaId); setRolaNazwa(r?.nazwa ?? ''); }
            }}>
            <Form.Item label="Imię" name="imie" rules={[{ required: true }]}><Input size="large" /></Form.Item>
            <Form.Item label="Nazwisko" name="nazwisko" rules={[{ required: true }]}><Input size="large" /></Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true }, { type: 'email' }]}><Input size="large" /></Form.Item>
            <Form.Item label="Waga (kg)" name="wagaKg" rules={[{ required: true }]}>
              <InputNumber min={30} max={200} style={{ width: '100%' }} size="large" addonAfter="kg" />
            </Form.Item>
            <Form.Item label="Rola" name="rolaId" rules={[{ required: true }]}>
              <Select size="large">{role.map(r => <Option key={r.id} value={r.id}>{r.nazwa}</Option>)}</Select>
            </Form.Item>
            {isPilot && (<>
              <Form.Item label="Nr licencji pilota" name="nrLicencjiPilota" rules={[{ required: true }]}><Input size="large" /></Form.Item>
              <Form.Item label="Data ważności licencji" name="dataWaznosciLicencji" rules={[{ required: true }]}>
                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </>)}
            <Form.Item label="Data ważności szkolenia" name="dataWaznosciSzkolenia" rules={[{ required: true }]}>
              <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
            </Form.Item>
            {isEdit && (<Form.Item label="Aktywny" name="aktywny" valuePropName="checked"><Switch /></Form.Item>)}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}
                size="large" style={{ flex: 1, height: 48, fontWeight: 600 }}>{isEdit ? 'Zapisz' : 'Dodaj'}</Button>
              <Button size="large" onClick={() => navigate('/czlonkowie-zalogi')} style={{ height: 48 }}>Anuluj</Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
