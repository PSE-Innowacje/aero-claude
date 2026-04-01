import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, List, Space, Spin, Typography } from 'antd';
import {
  FileTextOutlined, RocketOutlined,
  PlusOutlined, ArrowRightOutlined,
  SendOutlined, TeamOutlined,
} from '@ant-design/icons';
import { getOperacje, getZlecenia, getHelikoptery, getCzlonkowie } from '../services/api';
import { StatusOperacjiTag, StatusZleceniaTag } from '../components/StatusTag';
import { useAuth } from '../context/AuthContext';
import { cardGradient } from '../utils/colors';
import { StatusOperacji, StatusZlecenia } from '../constants/statusy';
import { radii } from '../theme';
import type { OperacjaListDto, ZlecenieListDto, HelikopterDto, CzlonekZalogiDto } from '../types/api';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

interface StatCard {
  key: 'operacje' | 'zlecenia' | 'helikoptery' | 'zaloga';
  label: string;
  icon: ReactNode;
  path: string;
  adminOnly?: boolean;
}

const STAT_CARDS: StatCard[] = [
  { key: 'operacje',    label: 'Operacje (potwierdzone)', icon: <FileTextOutlined style={{ fontSize: 28, color: '#fff' }} />, path: '/operacje' },
  { key: 'zlecenia',    label: 'Zlecenia (do akceptacji)', icon: <RocketOutlined style={{ fontSize: 28, color: '#fff' }} />,  path: '/zlecenia' },
  { key: 'helikoptery', label: 'Aktywne helikoptery',      icon: <SendOutlined style={{ fontSize: 28, color: '#fff' }} />,    path: '/helikoptery', adminOnly: true },
  { key: 'zaloga',      label: 'Aktywna załoga',           icon: <TeamOutlined style={{ fontSize: 28, color: '#fff' }} />,    path: '/czlonkowie-zalogi', adminOnly: true },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');

  const [operacje, setOperacje]       = useState<OperacjaListDto[]>([]);
  const [zlecenia, setZlecenia]       = useState<ZlecenieListDto[]>([]);
  const [helikoptery, setHelikoptery] = useState<HelikopterDto[]>([]);
  const [zaloga, setZaloga]           = useState<CzlonekZalogiDto[]>([]);
  const [loading, setLoading]         = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const loadData = async () => {
      try {
        const [op, zl, heli, zal] = await Promise.all([
          getOperacje({ statusId: StatusOperacji.POTWIERDZONE_DO_PLANU, rozmiarStrony: 5 }, signal),
          getZlecenia({ statusId: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, rozmiarStrony: 5 }, signal),
          isAdmin ? getHelikoptery(signal) : Promise.resolve([] as HelikopterDto[]),
          isAdmin ? getCzlonkowie(signal) : Promise.resolve([] as CzlonekZalogiDto[]),
        ]);
        if (!signal.aborted) {
          setOperacje(op?.items ?? []);
          setZlecenia(zl?.items ?? []);
          setHelikoptery((heli ?? []).filter(h => h.status === 'aktywny'));
          setZaloga((zal ?? []).filter(z => z.aktywny));
        }
      } catch {
        // Ignore abort errors
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    loadData();
    return () => controller.abort();
  }, [isAdmin]);

  const counts: Record<StatCard['key'], number> = {
    operacje:    operacje.length,
    zlecenia:    zlecenia.length,
    helikoptery: helikoptery.length,
    zaloga:      zaloga.length,
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Spin size="large" />
    </div>
  );

  const visibleCards = isAdmin ? STAT_CARDS : STAT_CARDS.filter(c => !c.adminOnly);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0 }}>Panel główny</Title>
        <Text type="secondary">Przegląd systemu operacji lotniczych.</Text>
      </div>

      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        {visibleCards.map((card, idx) => (
          <Col xs={24} sm={12} lg={isAdmin ? 6 : 12} key={card.key}>
            <Card
              style={{ borderRadius: radii.xxl, border: 'none', overflow: 'hidden', cursor: 'pointer' }}
              styles={{ body: { padding: 0 } }}
              onClick={() => navigate(card.path)}
            >
              <div style={{ background: cardGradient(idx, visibleCards.length), padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{counts[card.key]}</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 }}>{card.label}</div>
                </div>
                <div style={{ width: 56, height: 56, borderRadius: radii.lg, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ padding: '10px 28px' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Przejdź →</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><FileTextOutlined />Operacje do realizacji</Space>}
            extra={
              <Space>
                <Button size="small" icon={<PlusOutlined />} onClick={() => navigate('/operacje/new')}>Nowa</Button>
                <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate('/operacje')}>Wszystkie</Button>
              </Space>
            }
            style={{ borderRadius: radii.xxl }}
          >
            <List
              dataSource={operacje}
              locale={{ emptyText: 'Brak operacji do realizacji' }}
              renderItem={item => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/operacje/${item.id}`)}
                  extra={<StatusOperacjiTag statusId={item.statusId} />}
                >
                  <List.Item.Meta
                    title={<span style={{ fontWeight: 600 }}>{item.numer}</span>}
                    description={
                      <span style={{ fontSize: 12 }}>
                        {item.opisSkrocony} &nbsp;·&nbsp;
                        {item.planowanaDataOd ? `od ${item.planowanaDataOd}` : 'brak dat'}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={<Space><RocketOutlined />Zlecenia do akceptacji</Space>}
            extra={
              <Space>
                <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate('/zlecenia')}>Wszystkie</Button>
              </Space>
            }
            style={{ borderRadius: radii.xxl }}
          >
            <List
              dataSource={zlecenia}
              locale={{ emptyText: 'Brak zleceń oczekujących' }}
              renderItem={item => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/zlecenia/${item.id}`)}
                  extra={<StatusZleceniaTag statusId={item.statusId} />}
                >
                  <List.Item.Meta
                    title={<span style={{ fontWeight: 600 }}>{item.numer}</span>}
                    description={
                      <span style={{ fontSize: 12 }}>
                        {item.pilotImieNazwisko} &nbsp;·&nbsp; {item.helikopterNr}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
