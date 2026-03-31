import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, InputNumber, Select, Button, Card,
  message, Skeleton, DatePicker, Divider, Space, Typography, Upload,
} from 'antd';
import { SaveOutlined, FileTextOutlined, UploadOutlined, DeleteOutlined, FileOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getOperacjaById, createOperacja, updateOperacja,
  getRodzajeCzynnosci, getUzytkownicyKontakty, extractApiError,
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

  const [loading,      setLoading]      = useState(false);
  const [initLoad,     setInitLoad]     = useState(isEdit);
  const [rodzaje,      setRodzaje]      = useState([]);
  const [uzytkownicy,  setUzytkownicy]  = useState([]);
  const [kmlPlik,      setKmlPlik]      = useState(null);   // { nazwa, zawartosc }
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Słowniki i dane operacji ładowane razem – form.setFieldsValue wykonuje się
    // dopiero gdy lista użytkowników jest już dostępna (brak race condition).
    const promises = [
      getRodzajeCzynnosci(),
      getUzytkownicyKontakty(),
      isEdit ? getOperacjaById(id) : Promise.resolve(null),
    ];
    Promise.all(promises)
      .then(([r, u, data]) => {
        setRodzaje(r ?? []);
        setUzytkownicy(u ?? []);
        if (data) {
          form.setFieldsValue({
            ...data,
            proponowanaDataOd: data.proponowanaDataOd ? dayjs(data.proponowanaDataOd) : null,
            proponowanaDataDo: data.proponowanaDataDo ? dayjs(data.proponowanaDataDo) : null,
            planowanaDataOd:   data.planowanaDataOd   ? dayjs(data.planowanaDataOd)   : null,
            planowanaDataDo:   data.planowanaDataDo   ? dayjs(data.planowanaDataDo)   : null,
          });
          if (data.kmlNazwaPliku) {
            setKmlPlik({ nazwa: data.kmlNazwaPliku, zawartosc: data.kmlZawartosc ?? null });
          }
        }
      })
      .catch(err => message.error(extractApiError(err, 'Nie udało się pobrać danych.')))
      .finally(() => setInitLoad(false));
  }, [id, isEdit]);

  const handleKmlFile = (file) => {
    const isJson = file.name.toLowerCase().endsWith('.json');
    const reader = new FileReader();
    reader.onload = (e) => {
      const zawartosc = e.target.result;
      if (isJson) {
        try {
          const json = JSON.parse(zawartosc);
          const dystans = json?.totalDistanceKm;
          if (dystans !== undefined && dystans !== null) {
            form.setFieldsValue({ liczbaKmTrasy: Math.round(Number(dystans)) });
            message.success(`Wczytano trasę: ${Math.round(Number(dystans))} km`);
          } else {
            message.warning('Plik JSON nie zawiera pola "totalDistanceKm".');
          }
          setKmlPlik({ nazwa: file.name, zawartosc });
        } catch {
          message.error('Nieprawidłowy format pliku JSON.');
        }
      } else {
        setKmlPlik({ nazwa: file.name, zawartosc });
      }
      // reset inputa – umożliwia ponowny wybór tego samego pliku
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => message.error('Nie udało się odczytać pliku.');
    reader.readAsText(file, 'UTF-8');
  };

  const usunKmlPlik = () => {
    setKmlPlik(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onFinish = async (values) => {
    setLoading(true);
    const payload = {
      ...values,
      proponowanaDataOd: values.proponowanaDataOd?.format('YYYY-MM-DD') ?? null,
      proponowanaDataDo: values.proponowanaDataDo?.format('YYYY-MM-DD') ?? null,
      planowanaDataOd:   values.planowanaDataOd?.format('YYYY-MM-DD')   ?? null,
      planowanaDataDo:   values.planowanaDataDo?.format('YYYY-MM-DD')   ?? null,
      liczbaKmTrasy:       Math.round(values.liczbaKmTrasy ?? 0),
      rodzajeCzynnosciIds: values.rodzajeCzynnosciIds ?? [],
      punktyTrasy:         [],
      osobyKontaktoweIds:  values.osobyKontaktoweIds ?? [],
      kmlNazwaPliku:       kmlPlik?.nazwa ?? null,
      kmlZawartosc:        kmlPlik?.zawartosc ?? null,
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
      message.error(extractApiError(err, 'Błąd podczas zapisywania.'));
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

            <Form.Item label="Plik KML">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".kml,.xml,.json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleKmlFile(file);
                    // reset jest wykonywany wewnątrz handleKmlFile po odczytaniu pliku
                  }}
                />
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  size="large"
                  style={{ width: 'fit-content' }}
                >
                  Wybierz plik KML…
                </Button>
                {kmlPlik ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(82,196,26,0.08)',
                    border: '1px solid rgba(82,196,26,0.3)',
                  }}>
                    <FileOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                    <Text style={{ flex: 1, color: '#389e0d', fontWeight: 500, fontSize: 13 }}>
                      {kmlPlik.nazwa}
                    </Text>
                    <Button
                      type="text" danger size="small"
                      icon={<DeleteOutlined />}
                      onClick={usunKmlPlik}
                      title="Usuń plik"
                    />
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Brak wybranego pliku. Akceptowane formaty: .kml, .xml
                  </Text>
                )}
              </div>
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
