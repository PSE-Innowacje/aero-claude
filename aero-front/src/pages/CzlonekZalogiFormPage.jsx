import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, InputNumber, Select, Button, Card,
  message, Skeleton, DatePicker, Switch,
} from 'antd';
import { SaveOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCzlonekById, createCzlonek, updateCzlonek, getRoleZalogi, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Option } = Select;

export default function CzlonekZalogiFormPage() {
  const [form]  = Form.useForm();
  const navigate = useNavigate();
  const { id }  = useParams();
  const isEdit  = Boolean(id);
  const [loading,  setLoading]  = useState(false);
  const [initLoad, setInitLoad] = useState(isEdit);
  const [role,     setRole]     = useState([]);
  const [rolaNazwa, setRolaNazwa] = useState('');

  useEffect(() => {
    getRoleZalogi().then(setRole).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setInitLoad(true);
    getCzlonekById(id).then(data => {
      form.setFieldsValue({
        ...data,
        dataWaznosciLicencji:  data.dataWaznosciLicencji  ? dayjs(data.dataWaznosciLicencji)  : null,
        dataWaznosciSzkolenia: data.dataWaznosciSzkolenia ? dayjs(data.dataWaznosciSzkolenia) : null,
      });
      setRolaNazwa(data.rolaNazwa);
    }).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => setInitLoad(false));
  }, [id, form, isEdit]);

  const onFinish = async (values) => {
    setLoading(true);
    const payload = {
      ...values,
      dataWaznosciLicencji:  values.dataWaznosciLicencji?.format('YYYY-MM-DD')  ?? null,
      dataWaznosciSzkolenia: values.dataWaznosciSzkolenia?.format('YYYY-MM-DD') ?? '',
    };
    try {
      isEdit ? await updateCzlonek(id, payload) : await createCzlonek(payload);
      message.success(isEdit ? 'Zaktualizowano!' : 'Dodano!');
      navigate('/czlonkowie-zalogi');
    } catch (err) {
      message.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = role.find(r => r.id === form.getFieldValue('rolaId'));
  const isPilot = selectedRole?.nazwa === 'Pilot' || rolaNazwa === 'Pilot';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        icon={<TeamOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        title={isEdit ? 'Edytuj członka załogi' : 'Nowy członek załogi'}
        backTo="/czlonkowie-zalogi"
      />
      <Card style={{ borderRadius: 18 }} styles={{ body: { padding: 32 } }}>
        {initLoad ? <Skeleton active paragraph={{ rows: 8 }} /> : (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional"
            onValuesChange={(changed) => {
              if (changed.rolaId) {
                const r = role.find(x => x.id === changed.rolaId);
                setRolaNazwa(r?.nazwa ?? '');
              }
            }}>
            <Form.Item label="Imię" name="imie" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item label="Nazwisko" name="nazwisko" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true }, { type: 'email' }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item label="Waga (kg)" name="wagaKg" rules={[{ required: true }]}>
              <InputNumber min={30} max={200} style={{ width: '100%' }} size="large" addonAfter="kg" />
            </Form.Item>
            <Form.Item label="Rola" name="rolaId" rules={[{ required: true }]}>
              <Select size="large">
                {role.map(r => <Option key={r.id} value={r.id}>{r.nazwa}</Option>)}
              </Select>
            </Form.Item>
            {isPilot && (
              <>
                <Form.Item label="Nr licencji pilota" name="nrLicencjiPilota" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Data ważności licencji" name="dataWaznosciLicencji" rules={[{ required: true }]}>
                  <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
                </Form.Item>
              </>
            )}
            <Form.Item label="Data ważności szkolenia" name="dataWaznosciSzkolenia" rules={[{ required: true }]}>
              <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
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
              <Button size="large" onClick={() => navigate('/czlonkowie-zalogi')} style={{ height: 48 }}>Anuluj</Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
