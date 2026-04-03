import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, message,
  Timeline, Input, Modal, Select, List, Spin, Divider, Typography, Popconfirm, Row, Col,
} from 'antd';
import {
  EditOutlined, CommentOutlined, HistoryOutlined,
  SendOutlined, FileTextOutlined, CheckOutlined, CloseOutlined, StopOutlined,
} from '@ant-design/icons';
import {
  getOperacjaById, zmienStatusOperacji,
  getKomentarzeOperacji, dodajKomentarzOperacji, getHistoriaOperacji,
  extractApiError,
} from '../services/api';
import { StatusOperacjiTag } from '../components/StatusTag';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { StatusOperacji } from '../constants/statusy';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

// Status przejścia per rola — używa stałych z constants/statusy
const STATUS_ACTIONS = {
  'Osoba nadzorująca': [
    { fromStatus: StatusOperacji.WPROWADZONE, toStatus: StatusOperacji.ODRZUCONE,            label: 'Odrzuć',           danger: true,  icon: <CloseOutlined /> },
    { fromStatus: StatusOperacji.WPROWADZONE, toStatus: StatusOperacji.POTWIERDZONE_DO_PLANU, label: 'Potwierdź do planu', type: 'primary', icon: <CheckOutlined /> },
  ],
  'Osoba planująca': [
    { fromStatus: StatusOperacji.WPROWADZONE,             toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true, icon: <StopOutlined /> },
    { fromStatus: StatusOperacji.POTWIERDZONE_DO_PLANU,   toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true, icon: <StopOutlined /> },
    { fromStatus: StatusOperacji.ZAPLANOWANE_DO_ZLECENIA, toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true, icon: <StopOutlined /> },
  ],
};

export default function OperacjaDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { rola, hasRole } = useAuth();

  const [operacja,   setOperacja]   = useState(null);
  const [komentarze, setKomentarze] = useState([]);
  const [historia,   setHistoria]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [statusModal, setStatusModal] = useState({ open: false, action: null });
  const [komentarzDoStatusu, setKomentarzDoStatusu] = useState('');

  const canEdit = hasRole('Osoba planująca', 'Osoba nadzorująca', 'Administrator');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [op, km, hist] = await Promise.all([
        getOperacjaById(id),
        getKomentarzeOperacji(id),
        getHistoriaOperacji(id),
      ]);
      setOperacja(op);
      setKomentarze(km ?? []);
      setHistoria(hist ?? []);
    } catch (err) {
      message.error(extractApiError(err, 'Nie udało się załadować operacji.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async () => {
    const { action } = statusModal;
    try {
      await zmienStatusOperacji(id, action.toStatus, komentarzDoStatusu || undefined);
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
      await dodajKomentarzOperacji(id, newComment.trim());
      setNewComment('');
      const km = await getKomentarzeOperacji(id);
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

  const actions = (STATUS_ACTIONS[rola] ?? []).filter(a => a.fromStatus === operacja.statusId);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        icon={<FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />}
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        title={operacja.numer}
        subtitle={operacja.opisSkrocony}
        backTo="/operacje"
        extra={
          <Space>
            {actions.map(action => (
              <Button
                key={action.toStatus}
                type={action.type ?? 'default'}
                danger={action.danger}
                icon={action.icon}
                onClick={() => { setStatusModal({ open: true, action }); setKomentarzDoStatusu(''); }}
              >
                {action.label}
              </Button>
            ))}
            {canEdit && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/operacje/edit/${id}`)}>
                Edytuj
              </Button>
            )}
          </Space>
        }
      />

      <Row gutter={[20, 20]}>
        {/* Dane główne */}
        <Col xs={24} lg={14}>
          <Card title="Szczegóły operacji" style={{ borderRadius: 16, marginBottom: 20 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: '#7A7A95', width: 180 }}>
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
              {operacja.dodatkoweInfo && (
                <Descriptions.Item label="Dodatkowe info">{operacja.dodatkoweInfo}</Descriptions.Item>
              )}
              {operacja.uwagiPoRealizacji && (
                <Descriptions.Item label="Uwagi po realizacji">{operacja.uwagiPoRealizacji}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Komentarze */}
          <Card
            title={<Space><CommentOutlined />Komentarze ({komentarze.length})</Space>}
            style={{ borderRadius: 16 }}
          >
            <List
              dataSource={komentarze}
              locale={{ emptyText: 'Brak komentarzy' }}
              renderItem={k => (
                <List.Item>
                  <List.Item.Meta
                    title={<span style={{ fontSize: 12, color: '#7A7A95' }}>{k.autorEmail} · {new Date(k.createdAt).toLocaleString('pl-PL')}</span>}
                    description={<Text style={{ color: '#F0EFF8' }}>{k.tresc}</Text>}
                  />
                </List.Item>
              )}
            />
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <TextArea
                rows={2}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Dodaj komentarz…"
                maxLength={500}
                showCount
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sendingComment}
                onClick={handleAddComment}
                style={{ height: 'auto' }}
              >
                Wyślij
              </Button>
            </div>
          </Card>
        </Col>

        {/* Historia zmian */}
        <Col xs={24} lg={10}>
          <Card
            title={<Space><HistoryOutlined />Historia zmian</Space>}
            style={{ borderRadius: 16 }}
          >
            {historia.length === 0
              ? <Text type="secondary">Brak historii.</Text>
              : (
                <Timeline
                  items={historia.map(h => ({
                    color: h.pole === 'status' ? 'blue' : 'gray',
                    children: (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: '#F0EFF8' }}>{h.pole}</div>
                        <div style={{ color: '#7A7A95' }}>
                          {h.staraWartosc ?? '—'} → {h.nowaWartosc ?? '—'}
                        </div>
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

      {/* Modal zmiany statusu */}
      <Modal
        title={statusModal.action?.label}
        open={statusModal.open}
        onOk={handleStatusChange}
        onCancel={() => setStatusModal({ open: false, action: null })}
        okText="Potwierdź"
        cancelText="Anuluj"
        okButtonProps={{ danger: statusModal.action?.danger }}
      >
        <p style={{ marginBottom: 16, color: '#7A7A95' }}>
          {statusModal.action?.toStatus === StatusOperacji.POTWIERDZONE_DO_PLANU
            ? 'Upewnij się, że planowane daty zostały ustawione przed potwierdzeniem.'
            : 'Czy na pewno chcesz zmienić status tej operacji?'}
        </p>
        <TextArea
          rows={3}
          value={komentarzDoStatusu}
          onChange={e => setKomentarzDoStatusu(e.target.value)}
          placeholder="Opcjonalny komentarz…"
          maxLength={500}
        />
      </Modal>
    </div>
  );
}
