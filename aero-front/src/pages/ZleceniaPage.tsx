import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Card, Input, Select, Tooltip, message, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, SearchOutlined, RocketOutlined } from '@ant-design/icons';
import { getZlecenia, getStatusyZlecen, extractApiError } from '../services/api';
import type { PagedResult, ZlecenieListDto, SlownikDto, ZleceniaQuery } from '../types/api';
import type { ColumnsType } from 'antd/es/table';
import { StatusZleceniaTag } from '../components/StatusTag';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { palette, radii } from '../theme';

const { Option } = Select;

export default function ZleceniaPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canCreate = hasRole('Pilot');
  const canEdit   = hasRole('Pilot', 'Osoba nadzorująca', 'Administrator');

  const [data,    setData]    = useState<PagedResult<ZlecenieListDto>>({ items: [], lacznaLiczba: 0, strona: 1, rozmiarStrony: 20, lacznaLiczbaStron: 0, maPoprzednia: false, maNastepna: false });;
  const [statusy, setStatusy] = useState<SlownikDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ZleceniaQuery>({ strona: 1, rozmiarStrony: 20 });
  const [search,  setSearch]  = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const loadZlecenia = useCallback(async (f: ZleceniaQuery) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const result = await getZlecenia(f, controller.signal);
      if (!controller.signal.aborted) setData(result ?? { items: [], lacznaLiczba: 0, strona: 1, rozmiarStrony: 20, lacznaLiczbaStron: 0, maPoprzednia: false, maNastepna: false });
    } catch (err) {
      if (!controller.signal.aborted) message.error(extractApiError(err, 'Nie udało się pobrać zleceń.'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { loadZlecenia(filters); return () => abortRef.current?.abort(); }, [filters, loadZlecenia]);
  useEffect(() => { getStatusyZlecen().then(setStatusy).catch(() => message.warning('Nie udało się załadować statusów.')); }, []);

  const filtered = (data.items ?? []).filter(z =>
    !search || z.numer?.toLowerCase().includes(search.toLowerCase()) ||
    z.pilotImieNazwisko?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<ZlecenieListDto> = [
    {
      title: 'Numer',
      dataIndex: 'numer',
      render: (v: string, r: ZlecenieListDto) => (
        <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => navigate(`/zlecenia/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Planowany start',
      dataIndex: 'planowanyStartDt',
      sorter: true,
      render: (v: string) => new Date(v).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }),
    },
    { title: 'Helikopter', dataIndex: 'helikopterNr' },
    { title: 'Pilot',      dataIndex: 'pilotImieNazwisko' },
    {
      title: 'Status',
      dataIndex: 'statusId',
      render: (v: number) => <StatusZleceniaTag statusId={v} />,
    },
    {
      title: 'Akcje',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: ZlecenieListDto) => (
        <Space>
          <Tooltip title="Szczegóły">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/zlecenia/${record.id}`)} />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Edytuj">
              <Button type="primary" ghost size="small" icon={<EditOutlined />}
                onClick={() => navigate(`/zlecenia/edit/${record.id}`)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<RocketOutlined style={{ color: '#fff', fontSize: 22 }} />}
        gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        title="Zlecenia na lot"
        subtitle={`${data.lacznaLiczba} rekordów`}
        extra={canCreate && (
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: radii.md, fontWeight: 600 }}
            onClick={() => navigate('/zlecenia/new')}>
            Nowe zlecenie
          </Button>
        )}
      />

      <Card style={{ borderRadius: radii.xl }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${palette.borderLight}` }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={10}>
              <Input
                placeholder="Szukaj po numerze lub pilocie…"
                prefix={<SearchOutlined style={{ color: palette.textMuted }} />}
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select style={{ width: '100%' }} placeholder="Status" value={filters.statusId}
                allowClear onChange={v => setFilters(f => ({ ...f, statusId: v ?? undefined, strona: 1 }))}>
                {statusy.map(s => <Option key={s.id} value={s.id}>{s.nazwa}</Option>)}
              </Select>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.strona,
            pageSize: filters.rozmiarStrony,
            total: data.lacznaLiczba,
            showSizeChanger: true,
            onChange: (page, size) => setFilters(f => ({ ...f, strona: page, rozmiarStrony: size })),
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}
