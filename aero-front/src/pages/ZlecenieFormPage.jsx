import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Select, Button, Card, message, Skeleton,
  DatePicker, InputNumber, Divider, Space, Typography, Alert,
} from 'antd';
import { SaveOutlined, RocketOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getZlecenieById, createZlecenie, updateZlecenie,
  getHelikoptery, getCzlonkowie, getLadowiska,
  getOperacje, extractApiError,
} from '../services/api';
import PageHeader from '../components/PageHeader';

const { Option } = Select;
const { Text } = Typography;

export default function ZlecenieFormPage() {
  const [form]  = Form.useForm();
  const navigate = useNavigate();
  const { id }  = useParams();
  const isEdit  = Boolean(id);

  const [loading,     setLoading]     = useState(false);
  const [initLoad,    setInitLoad]    = useState(isEdit);
  const [helikoptery, setHelikoptery] = useState([]);
  const [czlonkowie,  setCzlonkowie]  = useState([]);
  const [ladowiska,   setLadowiska]   = useState([]);
  const [operacje,    setOperacje]    = useState([]);
  const [apiErrors,   setApiErrors]   = useState([]);

  useEffect(() => {
    // Wszystkie dane (słowniki + szczegóły zlecenia przy edycji) ładowane jednocześnie,
    // żeby form.setFieldsValue zawsze wykonał się po załadowaniu listy operacji.
    const promises = [
      getHelikoptery(),
      getCzlonkowie(),
      getLadowiska(),
      getOperacje({ rozmiarStrony: 500 }),
      isEdit ? getZlecenieById(id) : Promise.resolve(null),
    ];
    Promise.all(promises)
      .then(([h, c, l, op, zlecenie]) => {
        setHelikoptery((h ?? []).filter(x => x.status === 'aktywny'));
        setCzlonkowie(c ?? []);
        setLadowiska(l ?? []);
        setOperacje(op?.items ?? []);
        if (zlecenie) {
          form.setFieldsValue({
            ...zlecenie,
            planowanyStartDt:       dayjs(zlecenie.planowanyStartDt),
            planowaneLadowanieDt:   dayjs(zlecenie.planowaneLadowanieDt),
            rzeczywistyStartDt:     zlecenie.rzeczywistyStartDt ? dayjs(zlecenie.rzeczywistyStartDt) : null,
            rzeczywisteLadowanieDt: zlecenie.rzeczywisteLadowanieDt ? dayjs(zlecenie.rzeczywisteLadowanieDt) : null,
            // operacje zwracane jako lista obiektów – Select potrzebuje tablicy ID
            operacjeIds: (zlecenie.operacje ?? []).map(o => o.id),
          });
        }
      })
      .catch(err => message.error(extractApiError(err, 'Błąd ładowania danych.')))
      .finally(() => setInitLoad(false));
  }, [id, isEdit]);

  const onFinish = async (values) => {
    setLoading(true);
    setApiErrors([]);
    const payload = {
      ...values,
      planowanyStartDt:       values.planowanyStartDt?.toISOString(),
      planowaneLadowanieDt:   values.planowaneLadowanieDt?.toISOString(),
      rzeczywistyStartDt:     values.rzeczywistyStartDt?.toISOString() ?? null,
      rzeczywisteLadowanieDt: values.rzeczywisteLadowanieDt?.toISOString() ?? null,
      czlonkowieZalogiIds:    values.czlonkowieZalogiIds ?? [],
      operacjeIds:            values.operacjeIds ?? [],
    };
    try {
      if (isEdit) {
        await updateZlecenie(id, payload);
        message.success('Zlecenie zaktualizowane!');
      } else {
        await createZlecenie(payload);
        message.success('Zlecenie utworzone!');
      }
      navigate('/zlecenia');
    } catch (err) {
      const msg = extractApiError(err);
      // Błędy walidacji biznesowej (lista) wyświetl w Alert, resztę jako toast
      const errors = err?.response?.data?.errors;
      if (Array.isArray(errors) && errors.length) {
        setApiErrors(errors);
      } else {
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const gradient = isEdit
    ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';

  const pilociOptions = czlonkowie.filter(c => c.rolaNazwa === 'Pilot' && c.aktywny);
  const zaloga        = czlonkowie.filter(c => c.aktywny);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        icon={<RocketOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient={gradient}
        title={isEdit ? 'Edytuj zlecenie' : 'Nowe zlecenie na lot'}
        subtitle={isEdit ? `Edytujesz zlecenie #${id}` : 'Wypełnij dane zlecenia'}
        backTo="/zlecenia"
      />

      <Card style={{ borderRadius: 18 }} styles={{ body: { padding: 32 } }}>
        {initLoad ? <Skeleton active paragraph={{ rows: 10 }} /> : (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">

            {apiErrors.length > 0 && (
              <Alert
                type="error"
                style={{ marginBottom: 20, borderRadius: 12 }}
                message="Zlecenie nie może zostać zapisane"
                description={<ul style={{ paddingLeft: 18, margin: 0 }}>{apiErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
              />
            )}

            <Divider>Terminy lotu</Divider>

            <Space style={{ width: '100%', display: 'flex' }} wrap>
              <Form.Item label="Planowany start" name="planowanyStartDt"
                rules={[{ required: true, message: 'Wymagane.' }]} style={{ flex: 1 }}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} size="large" />
              </Form.Item>
              <Form.Item label="Planowane lądowanie" name="planowaneLadowanieDt"
                rules={[{ required: true, message: 'Wymagane.' }]} style={{ flex: 1 }}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Space>

            {isEdit && (
              <Space style={{ width: '100%', display: 'flex' }} wrap>
                <Form.Item label="Rzeczywisty start" name="rzeczywistyStartDt" style={{ flex: 1 }}>
                  <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} size="large" />
                </Form.Item>
                <Form.Item label="Rzeczywiste lądowanie" name="rzeczywisteLadowanieDt" style={{ flex: 1 }}>
                  <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} size="large" />
                </Form.Item>
              </Space>
            )}

            <Divider>Helikopter i trasa</Divider>

            <Form.Item label="Helikopter" name="helikopterId"
              rules={[{ required: true, message: 'Wymagane.' }]}>
              <Select placeholder="Wybierz helikopter…" size="large">
                {helikoptery.map(h => (
                  <Option key={h.id} value={h.id}>
                    {h.numer_rejestracyjny ?? h.numerRejestracyjny} — {h.typ}
                    {' '}(zasięg: {h.zasiegKm} km, udźwig: {h.maksUdzwigKg} kg)
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Space style={{ width: '100%', display: 'flex' }} wrap>
              <Form.Item label="Lądowisko startowe" name="ladowiskoStartoweId"
                rules={[{ required: true, message: 'Wymagane.' }]} style={{ flex: 1 }}>
                <Select placeholder="Start…" size="large">
                  {ladowiska.map(l => <Option key={l.id} value={l.id}>{l.nazwa}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item label="Lądowisko końcowe" name="ladowiskoKoncoweId"
                rules={[{ required: true, message: 'Wymagane.' }]} style={{ flex: 1 }}>
                <Select placeholder="Koniec…" size="large">
                  {ladowiska.map(l => <Option key={l.id} value={l.id}>{l.nazwa}</Option>)}
                </Select>
              </Form.Item>
            </Space>

            <Form.Item label="Szacowana długość trasy (km)" name="szacowanaDlugoscTrasy"
              rules={[{ required: true, message: 'Wymagane.' }]}>
              <InputNumber min={1} style={{ width: '100%' }} size="large" addonAfter="km" />
            </Form.Item>

            <Divider>Załoga</Divider>

            <Form.Item label="Dodatkowi członkowie załogi" name="czlonkowieZalogiIds">
              <Select mode="multiple" placeholder="Wybierz członków załogi…" size="large" allowClear>
                {zaloga.map(c => (
                  <Option key={c.id} value={c.id}>
                    {c.imie} {c.nazwisko} ({c.rolaNazwa}, {c.wagaKg} kg)
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Divider>Operacje do realizacji</Divider>

            <Form.Item label="Planowane operacje" name="operacjeIds"
              rules={[{ required: true, message: 'Wybierz co najmniej jedną operację.' }]}>
              <Select mode="multiple" placeholder="Wybierz operacje (status: Potwierdzone do planu)…" size="large">
                {operacje.map(o => (
                  <Option key={o.id} value={o.id}>
                    {o.numer} — {o.opisSkrocony} ({o.liczbaKmTrasy} km) [{o.statusNazwa}]
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}
                size="large" style={{ flex: 1, height: 48, fontWeight: 600, background: gradient, border: 'none' }}>
                {isEdit ? 'Zapisz zmiany' : 'Utwórz zlecenie'}
              </Button>
              <Button size="large" onClick={() => navigate('/zlecenia')} style={{ height: 48 }}>
                Anuluj
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
