import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Button, Space, message, Modal,
  Timeline, Tag, Spin, Typography, Row, Col,
} from 'antd';
import { EditOutlined, HistoryOutlined, RocketOutlined } from '@ant-design/icons';
import { getZlecenieById, zmienStatusZlecenia, getHistoriaZlecenia, extractApiError } from '../services/api';
import { StatusZleceniaTag } from '../components/StatusTag';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { StatusZlecenia } from '../constants/statusy';
import { ZLECENIE_TRANSITIONS, getAvailableActions, type StatusTransitionRule } from '../constants/statusTransitions';
import { transitionIcon } from '../utils/transitionIcons';
import { palette, radii } from '../theme';
import type { ZlecenieDto, HistoriaZmianyDto } from '../types/api';

const { Text } = Typography;

export default function ZlecenieDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rola, hasRole } = useAuth();

  const [zlecenie, setZlecenie] = useState<ZlecenieDto | null>(null);
  const [historia, setHistoria] = useState<HistoriaZmianyDto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<{ open: boolean; action: StatusTransitionRule | null }>({ open: false, action: null });
  const [saving,   setSaving]   = useState(false);

  const canEdit = hasRole('Pilot', 'Osoba nadzorująca', 'Administrator');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const [zl, hist] = await Promise.all([
        getZlecenieById(Number(id), controller.signal),
        getHistoriaZlecenia(Number(id), controller.signal),
      ]);
      if (!controller.signal.aborted) { setZlecenie(zl); setHistoria(hist ?? []); }
    } catch (err) {
      if (!controller.signal.aborted) message.error(extractApiError(err, 'Nie udało się załadować zlecenia.'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); return () => abortRef.current?.abort(); }, [load]);

  const handleStatusChange = async () => {
    if (!modal.action) return;
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

  const actions = getAvailableActions(ZLECENIE_TRANSITIONS, rola, zlecenie.statusId);
  const fmt = (dt?: string | null) => dt ? new Date(dt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

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
              <Button key={action.toStatus} type={action.buttonType ?? 'default'} danger={action.danger}
                icon={transitionIcon(action)} onClick={() => setModal({ open: true, action })}>
                {action.label}
              </Button>
            ))}
            {canEdit && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/zlecenia/edit/${id}`)}>Edytuj</Button>
            )}
          </Space>
        }
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card title="Dane zlecenia" style={{ borderRadius: radii.xl, marginBottom: 20 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: palette.textMuted, width: 200 }}>
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

          {zlecenie.czlonkowieZalogiImiona?.length > 0 && (
            <Card title="Dodatkowi członkowie załogi" style={{ borderRadius: radii.xl, marginBottom: 20 }}>
              <Space wrap>{zlecenie.czlonkowieZalogiImiona.map(n => <Tag key={n}>{n}</Tag>)}</Space>
            </Card>
          )}

          <Card title="Powiązane operacje lotnicze" style={{ borderRadius: radii.xl }}>
            {zlecenie.operacje?.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {zlecenie.operacje.map(op => (
                  <Button key={op.id} type="link" style={{ padding: 0, textAlign: 'left', height: 'auto' }}
                    onClick={() => navigate(`/operacje/${op.id}`)}>
                    <span style={{ fontWeight: 600 }}>{op.numer}</span>
                    <span style={{ color: palette.textMuted, marginLeft: 8 }}>{op.opisSkrocony}</span>
                    <span style={{ color: palette.textDimmed, marginLeft: 8, fontSize: 11 }}>[{op.statusNazwa}]</span>
                  </Button>
                ))}
              </Space>
            ) : <Text type="secondary">Brak operacji.</Text>}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<Space><HistoryOutlined />Historia zmian</Space>} style={{ borderRadius: radii.xl }}>
            {historia.length === 0 ? <Text type="secondary">Brak historii.</Text> : (
              <Timeline items={historia.map(h => ({
                color: 'blue',
                children: (
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: palette.text }}>{h.pole}</div>
                    <div style={{ color: palette.textMuted }}>{h.staraWartosc ?? '—'} → {h.nowaWartosc ?? '—'}</div>
                    <div style={{ color: palette.textMuted, marginTop: 2 }}>
                      {h.zmienionePrzezEmail} · {new Date(h.dataZmiany).toLocaleString('pl-PL')}
                    </div>
                  </div>
                ),
              }))} />
            )}
          </Card>
        </Col>
      </Row>

      <Modal title={modal.action?.label} open={modal.open}
        onOk={handleStatusChange} onCancel={() => setModal({ open: false, action: null })}
        okText="Potwierdź" cancelText="Anuluj" confirmLoading={saving}
        okButtonProps={{ danger: modal.action?.danger, type: modal.action?.buttonType ?? 'default' }}>
        <p style={{ color: palette.textMuted }}>
          {modal.action?.toStatus === StatusZlecenia.ZREALIZOWANE_W_CALOSCI || modal.action?.toStatus === StatusZlecenia.ZREALIZOWANE_W_CZESCI
            ? 'Upewnij się, że rzeczywiste czasy startu i lądowania są uzupełnione.'
            : 'Czy na pewno chcesz zmienić status tego zlecenia?'}
        </p>
      </Modal>
    </div>
  );
}
