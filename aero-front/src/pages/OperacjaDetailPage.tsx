import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, message,
  Timeline, Input, Modal, List, Spin, Divider, Typography, Row, Col,
} from 'antd';
import { EditOutlined, CommentOutlined, HistoryOutlined, SendOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  getOperacjaById, zmienStatusOperacji,
  getKomentarzeOperacji, dodajKomentarzOperacji, getHistoriaOperacji,
  extractApiError,
} from '../services/api';
import { StatusOperacjiTag } from '../components/StatusTag';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { StatusOperacji } from '../constants/statusy';
import { OPERACJA_TRANSITIONS, getAvailableActions, type StatusTransitionRule } from '../constants/statusTransitions';
import { transitionIcon } from '../utils/transitionIcons';
import { palette, radii, gradients } from '../theme';
import type { OperacjaDto, KomentarzDto, HistoriaZmianyDto } from '../types/api';

const { TextArea } = Input;
const { Text } = Typography;

export default function OperacjaDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { rola, hasRole } = useAuth();

  const [operacja,   setOperacja]   = useState<OperacjaDto | null>(null);
  const [komentarze, setKomentarze] = useState<KomentarzDto[]>([]);
  const [historia,   setHistoria]   = useState<HistoriaZmianyDto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [statusModal, setStatusModal] = useState<{ open: boolean; action: StatusTransitionRule | null }>({ open: false, action: null });
  const [komentarzDoStatusu, setKomentarzDoStatusu] = useState('');

  const canEdit = hasRole('Osoba planująca', 'Osoba nadzorująca', 'Administrator');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const [op, km, hist] = await Promise.all([
        getOperacjaById(Number(id), controller.signal),
        getKomentarzeOperacji(Number(id), controller.signal),
        getHistoriaOperacji(Number(id), controller.signal),
      ]);
      if (!controller.signal.aborted) {
        setOperacja(op);
        setKomentarze(km ?? []);
        setHistoria(hist ?? []);
      }
    } catch (err) {
      if (!controller.signal.aborted) message.error(extractApiError(err, 'Nie udało się załadować operacji.'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); return () => abortRef.current?.abort(); }, [load]);

  const handleStatusChange = async () => {
    const { action } = statusModal;
    if (!action) return;
    try {
      await zmienStatusOperacji(Number(id), action.toStatus, komentarzDoStatusu || undefined);
      message.success('Status zmieniony.');
      setStatusModal({ open: false, action: null });
      setKomentarzDoStatusu('');
      load();
    } catch (err) {
      message.error(extractApiError(err, 'Błąd zmiany statusu.'));
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await dodajKomentarzOperacji(Number(id), newComment.trim());
      setNewComment('');
      const km = await getKomentarzeOperacji(Number(id));
      setKomentarze(km ?? []);
      message.success('Komentarz dodany.');
    } catch (err) {
      message.error(extractApiError(err, 'Nie udało się dodać komentarza.'));
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin size="large" /></div>;
  if (!operacja) return null;

  const actions = getAvailableActions(OPERACJA_TRANSITIONS, rola, operacja.statusId);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        icon={<FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient={gradients.operacje}
        title={operacja.numer}
        subtitle={operacja.opisSkrocony}
        backTo="/operacje"
        extra={
          <Space>
            {actions.map(action => (
              <Button key={action.toStatus} type={action.buttonType ?? 'default'} danger={action.danger}
                icon={transitionIcon(action)}
                onClick={() => { setStatusModal({ open: true, action }); setKomentarzDoStatusu(''); }}>
                {action.label}
              </Button>
            ))}
            {canEdit && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/operacje/edit/${id}`)}>Edytuj</Button>
            )}
          </Space>
        }
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card title="Szczegóły operacji" style={{ borderRadius: radii.xl, marginBottom: 20 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: palette.textMuted, width: 180 }}>
              <Descriptions.Item label="Nr zlecenia/projektu">{operacja.numerZleceniaProjektu}</Descriptions.Item>
              <Descriptions.Item label="Status"><StatusOperacjiTag statusId={operacja.statusId} /></Descriptions.Item>
              <Descriptions.Item label="Liczba km trasy">{operacja.liczbaKmTrasy} km</Descriptions.Item>
              <Descriptions.Item label="Rodzaje czynności">
                {operacja.rodzajeCzynnosciNazwy?.map(n => <Tag key={n}>{n}</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="Propon. data od">{operacja.proponowanaDataOd ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Propon. data do">{operacja.proponowanaDataDo ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Planow. data od">{operacja.planowanaDataOd ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Planow. data do">{operacja.planowanaDataDo ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Wprowadził">{operacja.wprowadzajacyEmail}</Descriptions.Item>
              <Descriptions.Item label="Plik KML">{operacja.kmlNazwaPliku ?? '—'}</Descriptions.Item>
              {operacja.dodatkoweInfo && <Descriptions.Item label="Dodatkowe info">{operacja.dodatkoweInfo}</Descriptions.Item>}
              {operacja.uwagiPoRealizacji && <Descriptions.Item label="Uwagi po realizacji">{operacja.uwagiPoRealizacji}</Descriptions.Item>}
            </Descriptions>
          </Card>

          <Card title={<Space><CommentOutlined />Komentarze ({komentarze.length})</Space>} style={{ borderRadius: radii.xl }}>
            <List dataSource={komentarze} locale={{ emptyText: 'Brak komentarzy' }}
              renderItem={k => (
                <List.Item>
                  <List.Item.Meta
                    title={<span style={{ fontSize: 12, color: palette.textMuted }}>{k.autorEmail} · {new Date(k.createdAt).toLocaleString('pl-PL')}</span>}
                    description={<Text style={{ color: palette.text }}>{k.tresc}</Text>}
                  />
                </List.Item>
              )}
            />
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <TextArea rows={2} value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Dodaj komentarz…" maxLength={500} showCount style={{ flex: 1 }} />
              <Button type="primary" icon={<SendOutlined />} loading={sendingComment}
                onClick={handleAddComment} style={{ height: 'auto' }}>Wyślij</Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<Space><HistoryOutlined />Historia zmian</Space>} style={{ borderRadius: radii.xl }}>
            {historia.length === 0 ? <Text type="secondary">Brak historii.</Text> : (
              <Timeline items={historia.map(h => ({
                color: h.pole === 'status' ? 'blue' : 'gray',
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

      <Modal title={statusModal.action?.label} open={statusModal.open}
        onOk={handleStatusChange} onCancel={() => setStatusModal({ open: false, action: null })}
        okText="Potwierdź" cancelText="Anuluj" okButtonProps={{ danger: statusModal.action?.danger }}>
        <p style={{ marginBottom: 16, color: palette.textMuted }}>
          {statusModal.action?.toStatus === StatusOperacji.POTWIERDZONE_DO_PLANU
            ? 'Upewnij się, że planowane daty zostały ustawione przed potwierdzeniem.'
            : 'Czy na pewno chcesz zmienić status tej operacji?'}
        </p>
        <TextArea rows={3} value={komentarzDoStatusu} onChange={e => setKomentarzDoStatusu(e.target.value)}
          placeholder="Opcjonalny komentarz…" maxLength={500} />
      </Modal>
    </div>
  );
}
