import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Button, Space, message, Modal,
  Timeline, Tag, Spin, Typography, Row, Col,
} from 'antd';
import {
  EditOutlined, HistoryOutlined, RocketOutlined,
  CheckOutlined, CloseOutlined, CheckCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { getZlecenieById, zmienStatusZlecenia, getHistoriaZlecenia, extractApiError } from '../services/api';
import { StatusZleceniaTag } from '../components/StatusTag';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { StatusZlecenia as SZ } from '../constants/statusy';

const { Text } = Typography;

// Dozwolone przejścia statusów wg roli — stałe z constants/statusy
const STATUS_ACTIONS = {
  'Pilot': [
    { fromStatus: SZ.WPROWADZONE,  toStatus: SZ.PRZEKAZANE_DO_AKCEPTACJI, label: 'Przekaż do akceptacji', type: 'primary', icon: <RocketOutlined /> },
    { fromStatus: SZ.ZAAKCEPTOWANE, toStatus: SZ.ZREALIZOWANE_W_CZESCI,   label: 'Zrealizowane w części',   type: 'primary', icon: <CheckOutlined /> },
    { fromStatus: SZ.ZAAKCEPTOWANE, toStatus: SZ.ZREALIZOWANE_W_CALOSCI,  label: 'Zrealizowane w całości',  type: 'primary', icon: <CheckCircleOutlined /> },
    { fromStatus: SZ.ZAAKCEPTOWANE, toStatus: SZ.NIE_ZREALIZOWANE,        label: 'Nie zrealizowane',        danger: true,    icon: <MinusCircleOutlined /> },
  ],
  'Osoba nadzorująca': [
    { fromStatus: SZ.PRZEKAZANE_DO_AKCEPTACJI, toStatus: SZ.ODRZUCONE,     label: 'Odrzuć',      danger: true,    icon: <CloseOutlined /> },
    { fromStatus: SZ.PRZEKAZANE_DO_AKCEPTACJI, toStatus: SZ.ZAAKCEPTOWANE,  label: 'Zaakceptuj',  type: 'primary', icon: <CheckOutlined /> },
  ],
  'Administrator': [
    { fromStatus: SZ.WPROWADZONE,              toStatus: SZ.PRZEKAZANE_DO_AKCEPTACJI, label: 'Przekaż do akceptacji', type: 'primary', icon: <RocketOutlined /> },
    { fromStatus: SZ.PRZEKAZANE_DO_AKCEPTACJI, toStatus: SZ.ODRZUCONE,                label: 'Odrzuć',                danger: true,    icon: <CloseOutlined /> },
    { fromStatus: SZ.PRZEKAZANE_DO_AKCEPTACJI, toStatus: SZ.ZAAKCEPTOWANE,             label: 'Zaakceptuj',            type: 'primary', icon: <CheckOutlined /> },
    { fromStatus: SZ.ZAAKCEPTOWANE,            toStatus: SZ.ZREALIZOWANE_W_CZESCI,     label: 'Zrealizowane w części',  type: 'primary', icon: <CheckOutlined /> },
    { fromStatus: SZ.ZAAKCEPTOWANE,            toStatus: SZ.ZREALIZOWANE_W_CALOSCI,    label: 'Zrealizowane w całości', type: 'primary', icon: <CheckCircleOutlined /> },
    { fromStatus: SZ.ZAAKCEPTOWANE,            toStatus: SZ.NIE_ZREALIZOWANE,          label: 'Nie zrealizowane',       danger: true,    icon: <MinusCircleOutlined /> },
  ],
};

export default function ZlecenieDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rola, hasRole } = useAuth();

  const [zlecenie, setZlecenie] = useState(null);
  const [historia, setHistoria] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState({ open: false, action: null });
  const [saving,   setSaving]   = useState(false);

  const canEdit = hasRole('Pilot', 'Osoba nadzorująca', 'Administrator');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [zl, hist] = await Promise.all([
        getZlecenieById(Number(id)),
        getHistoriaZlecenia(Number(id)),
      ]);
      setZlecenie(zl);
      setHistoria(hist ?? []);
    } catch (err) {
      message.error(extractApiError(err, 'Nie udało się załadować zlecenia.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async () => {
    setSaving(true);
    try {
      await zmienStatusZlecenia(Number(id), modal.action.toStatus);
      message.success('Status zlecenia zmieniony.');
      setModal({ open: false, action: null });
      load();
    } catch (err) {
      message.error(extractApiError(err, 'Błąd zmiany statusu.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin size="large" /></div>;
  if (!zlecenie) return null;

  const actions = (STATUS_ACTIONS[rola] ?? []).filter(a => a.fromStatus === zlecenie.statusId);

  const fmt = dt => dt ? new Date(dt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        icon={<RocketOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        title={zlecenie.numer}
        subtitle={`${zlecenie.pilotImieNazwisko} · ${zlecenie.helikopterNr}`}
        backTo="/zlecenia"
        extra={
          <Space>
            {actions.map(action => (
              <Button
                key={action.toStatus}
                type={action.type ?? 'default'}
                danger={action.danger}
                icon={action.icon}
                onClick={() => setModal({ open: true, action })}
              >
                {action.label}
              </Button>
            ))}
            {canEdit && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/zlecenia/edit/${id}`)}>
                Edytuj
              </Button>
            )}
          </Space>
        }
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card title="Dane zlecenia" style={{ borderRadius: 16, marginBottom: 20 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: '#7A7A95', width: 200 }}>
              <Descriptions.Item label="Status"><StatusZleceniaTag statusId={zlecenie.statusId} /></Descriptions.Item>
              <Descriptions.Item label="Pilot">{zlecenie.pilotImieNazwisko}</Descriptions.Item>
              <Descriptions.Item label="Helikopter">{zlecenie.helikopterNr}</Descriptions.Item>
              <Descriptions.Item label="Lądowisko startowe">{zlecenie.ladowiskoStartoweNazwa}</Descriptions.Item>
              <Descriptions.Item label="Lądowisko końcowe">{zlecenie.ladowiskoKoncoweNazwa}</Descriptions.Item>
              <Descriptions.Item label="Planowany start">{fmt(zlecenie.planowanyStartDt)}</Descriptions.Item>
              <Descriptions.Item label="Planowane lądowanie">{fmt(zlecenie.planowaneLadowanieDt)}</Descriptions.Item>
              <Descriptions.Item label="Rzeczywisty start">{fmt(zlecenie.rzeczywistyStartDt)}</Descriptions.Item>
              <Descriptions.Item label="Rzeczywiste lądowanie">{fmt(zlecenie.rzeczywisteLadowanieDt)}</Descriptions.Item>
              <Descriptions.Item label="Szac. długość trasy">{zlecenie.szacowanaDlugoscTrasy} km</Descriptions.Item>
              <Descriptions.Item label="Waga załogi">{zlecenie.wagaZalogiKg} kg</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Załoga */}
          {zlecenie.czlonkowieZalogiImiona?.length > 0 && (
            <Card title="Dodatkowi członkowie załogi" style={{ borderRadius: 16, marginBottom: 20 }}>
              <Space wrap>
                {zlecenie.czlonkowieZalogiImiona.map(n => <Tag key={n}>{n}</Tag>)}
              </Space>
            </Card>
          )}

          {/* Operacje */}
          <Card title="Powiązane operacje lotnicze" style={{ borderRadius: 16 }}>
            {zlecenie.operacje?.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {zlecenie.operacje.map(op => (
                  <Button key={op.id} type="link" style={{ padding: 0, textAlign: 'left', height: 'auto' }}
                    onClick={() => navigate(`/operacje/${op.id}`)}>
                    <span style={{ fontWeight: 600 }}>{op.numer}</span>
                    <span style={{ color: '#7A7A95', marginLeft: 8 }}>{op.opisSkrocony}</span>
                    <span style={{ color: '#555', marginLeft: 8, fontSize: 11 }}>[{op.statusNazwa}]</span>
                  </Button>
                ))}
              </Space>
            ) : <Text type="secondary">Brak operacji.</Text>}
          </Card>
        </Col>

        {/* Historia */}
        <Col xs={24} lg={10}>
          <Card title={<Space><HistoryOutlined />Historia zmian</Space>} style={{ borderRadius: 16 }}>
            {historia.length === 0
              ? <Text type="secondary">Brak historii.</Text>
              : (
                <Timeline
                  items={historia.map(h => ({
                    color: 'blue',
                    children: (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: '#F0EFF8' }}>{h.pole}</div>
                        <div style={{ color: '#7A7A95' }}>{h.staraWartosc ?? '—'} → {h.nowaWartosc ?? '—'}</div>
                        <div style={{ color: '#7A7A95', marginTop: 2 }}>
                          {h.zmienionePrzezEmail} · {new Date(h.dataZmiany).toLocaleString('pl-PL')}
                        </div>
                      </div>
                    ),
                  }))}
                />
              )
            }
          </Card>
        </Col>
      </Row>

      <Modal
        title={modal.action?.label}
        open={modal.open}
        onOk={handleStatusChange}
        onCancel={() => setModal({ open: false, action: null })}
        okText="Potwierdź"
        cancelText="Anuluj"
        confirmLoading={saving}
        okButtonProps={{ danger: modal.action?.danger, type: modal.action?.type ?? 'default' }}
      >
        <p style={{ color: '#7A7A95' }}>
          {modal.action?.toStatus === SZ.ZREALIZOWANE_W_CALOSCI || modal.action?.toStatus === SZ.ZREALIZOWANE_W_CZESCI
            ? 'Upewnij się, że rzeczywiste czasy startu i lądowania są uzupełnione.'
            : 'Czy na pewno chcesz zmienić status tego zlecenia?'}
        </p>
      </Modal>
    </div>
  );
}
