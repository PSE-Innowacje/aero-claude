import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, InputNumber, Select, Button, Card,
  message, Skeleton, DatePicker, Checkbox, Divider, Space, Typography,
} from 'antd';
import { SaveOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getOperacjaById, createOperacja, updateOperacja,
  getRodzajeCzynnosci, getUzytkownicy,
} from '../services/api';
import PageHeader from '../components/PageHeader';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

export default function OperacjaFormPage() {
  const [form]  = Form.useForm();
  const navigate = useNavigate();
  const { id }  = useParams();
  const isEdit  = Boolean(id);

  const [loading,   setLoading]   = useState(false);
  const [initLoad,  setInitLoad]  = useState(isEdit);
  const [rodzaje,   setRodzaje]   = useState([]);
  const [uzytkownicy, setUzytkownicy] = useState([]);

  useEffect(() => {
    getRodzajeCzynnosci().then(setRodzaje).catch(() => {});
    getUzytkownicy().then(setUzytkownicy).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setInitLoad(true);
    getOperacjaById(id)
      .then(data => {
        form.setFieldsValue({
          ...data,
          proponowanaDataOd: data.proponowanaDataOd ? dayjs(data.proponowanaDataOd) : null,
          proponowanaDataDo: data.proponowanaDataDo ? dayjs(data.proponowanaDataDo) : null,
          planowanaDataOd:   data.planowanaDataOd   ? dayjs(data.planowanaDataOd)   : null,
          planowanaDataDo:   data.planowanaDataDo   ? dayjs(data.planowanaDataDo)   : null,
        });
      })
      .catch(() => message.error('Nie udało się pobrać operacji.'))
      .finally(() => setInitLoad(false));
  }, [id, form, isEdit]);

  const onFinish = async (values) => {
    setLoading(true);
    const payload = {
      ...values,
      proponowanaDataOd: values.proponowanaDataOd?.format('YYYY-MM-DD') ?? null,
      proponowanaDataDo: values.proponowanaDataDo?.format('YYYY-MM-DD') ?? null,
      planowanaDataOd:   values.planowanaDataOd?.format('YYYY-MM-DD')   ?? null,
      planowanaDataDo:   values.planowanaDataDo?.format('YYYY-MM-DD')   ?? null,
      rodzajeCzynnosciIds: values.rodzajeCzynnosciIds ?? [],
      punktyTrasy:         [],
      osobyKontaktoweIds:  values.osobyKontaktoweIds ?? [],
    };
    try {
      if (isEdit) {
        await updateOperacja(id, payload);
        message.success('Operacja zaktualizowana!');
      } else {
        await createOperacja(payload);
        message.success('Operacja dodana!');
      }
      navigate('/operacje');
    } catch (err) {
      const errors = err?.response?.data?.errors;
      message.error(errors?.join(', ') ?? 'Błąd podczas zapisywania.');
    } finally {
      setLoading(false);
    }
  };

  const gradient = isEdit
    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        icon={<FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient={gradient}
        title={isEdit ? 'Edytuj operację' : 'Nowa operacja'}
        subtitle={isEdit ? `Edytujesz operację #${id}` : 'Wypełnij formularz planowanej operacji'}
        backTo="/operacje"
      />

      <Card style={{ borderRadius: 18 }} styles={{ body: { padding: 32 } }}>
        {initLoad ? <Skeleton active paragraph={{ rows: 8 }} /> : (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">

            <div style={{ background: 'rgba(108,71,255,0.07)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, border: '1px solid rgba(108,71,255,0.2)' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Pola oznaczone * są wymagane.</Text>
            </div>

            <Form.Item label="Numer zlecenia / projektu" name="numerZleceniaProjektu"
              rules={[{ required: true, message: 'Wymagane.' }, { max: 30 }]}>
              <Input placeholder="np. DE-25-12020" size="large" />
            </Form.Item>

            <Form.Item label="Opis skrócony" name="opisSkrocony"
              rules={[{ required: true, message: 'Wymagane.' }, { max: 100 }]}>
              <Input placeholder="np. Lot odcinka leśnego Krajnik – Plewiska" size="large" />
            </Form.Item>

            <Form.Item label="Liczba km trasy" name="liczbaKmTrasy"
              rules={[{ required: true, message: 'Wymagane.' }]}>
              <InputNumber min={1} style={{ width: '100%' }} size="large" addonAfter="km" />
            </Form.Item>

            <Form.Item label="Rodzaje czynności" name="rodzajeCzynnosciIds"
              rules={[{ required: true, message: 'Wybierz co najmniej jeden.' }]}>
              <Select mode="multiple" placeholder="Wybierz czynności…" size="large">
                {rodzaje.map(r => <Option key={r.id} value={r.id}>{r.nazwa}</Option>)}
              </Select>
            </Form.Item>

            <Divider>Proponowane daty (wypełnia osoba planująca)</Divider>

            <Space style={{ width: '100%', display: 'flex' }} wrap>
              <Form.Item label="Proponowana data od" name="proponowanaDataOd" style={{ flex: 1 }}>
                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
              </Form.Item>
              <Form.Item label="Proponowana data do" name="proponowanaDataDo" style={{ flex: 1 }}>
                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Space>

            {isEdit && (
              <>
                <Divider>Planowane daty (wypełnia osoba nadzorująca)</Divider>
                <Space style={{ width: '100%', display: 'flex' }} wrap>
                  <Form.Item label="Planowana data od" name="planowanaDataOd" style={{ flex: 1 }}>
                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
                  </Form.Item>
                  <Form.Item label="Planowana data do" name="planowanaDataDo" style={{ flex: 1 }}>
                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} size="large" />
                  </Form.Item>
                </Space>
              </>
            )}

            <Divider>Informacje dodatkowe</Divider>

            <Form.Item label="Dodatkowe informacje / priorytet" name="dodatkoweInfo">
              <TextArea rows={3} maxLength={500} showCount placeholder="np. Pilne oględziny przed sezonem wegetatywnym" />
            </Form.Item>

            {isEdit && (
              <Form.Item label="Komentarz" name="komentarz">
                <TextArea rows={3} maxLength={500} showCount />
              </Form.Item>
            )}

            <Form.Item label="Plik KML – nazwa" name="kmlNazwaPliku">
              <Input placeholder="np. krajnik_plewiska.kml" />
            </Form.Item>

            <Form.Item label="Osoby kontaktowe" name="osobyKontaktoweIds">
              <Select mode="multiple" placeholder="Wybierz osoby kontaktowe…" size="large" allowClear>
                {uzytkownicy.map(u => (
                  <Option key={u.id} value={u.id}>{u.imie} {u.nazwisko} ({u.email})</Option>
                ))}
              </Select>
            </Form.Item>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}
                size="large" style={{ flex: 1, height: 48, fontWeight: 600, background: gradient, border: 'none' }}>
                {isEdit ? 'Zapisz zmiany' : 'Utwórz operację'}
              </Button>
              <Button size="large" onClick={() => navigate('/operacje')} style={{ height: 48 }}>
                Anuluj
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
