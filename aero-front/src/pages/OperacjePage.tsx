import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, message, Card, Input,
  Select, Tag, Tooltip, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined,
  SearchOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { getOperacje, getOperacjaById, getStatusyOperacji, extractApiError } from '../services/api';
import { StatusOperacji } from '../constants/statusy';
import TrasaMapWidget from '../components/TrasaMapWidget';
import { StatusOperacjiTag } from '../components/StatusTag';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useDebouncedValue } from '../hooks/useDebounce';
import { radii, gradients } from '../theme';
import type { OperacjaListDto, SlownikDto, PagedResult, OperacjeQuery } from '../types/api';

const { Option } = Select;

interface Filters extends OperacjeQuery {
  strona: number;
  rozmiarStrony: number;
}

export default function OperacjePage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canEdit = hasRole('Osoba planująca', 'Osoba nadzorująca', 'Administrator');

  const [data, setData]         = useState<PagedResult<OperacjaListDto>>({ items: [], lacznaLiczba: 0, strona: 1, rozmiarStrony: 20, lacznaLiczbaStron: 0, maPoprzednia: false, maNastepna: false });
  const [statusy, setStatusy]   = useState<SlownikDto[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filters, setFilters]   = useState<Filters>({ statusId: StatusOperacji.POTWIERDZONE_DO_PLANU, strona: 1, rozmiarStrony: 20 });
  const [search, setSearch]     = useState('');
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [selectedKml, setSelectedKml] = useState<string | null>(null);
  const [kmlLoading, setKmlLoading]   = useState(false);

  const debouncedSearch = useDebouncedValue(search, 400);
  const abortRef = useRef<AbortController | null>(null);

  const loadOperacje = useCallback(async (f: Filters, searchTerm: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params: OperacjeQuery = { ...f };
      if (searchTerm) params.numerZlecenia = searchTerm;
      const result = await getOperacje(params, controller.signal);
      if (!controller.signal.aborted) {
        setData(result ?? { items: [], lacznaLiczba: 0, strona: 1, rozmiarStrony: 20, lacznaLiczbaStron: 0, maPoprzednia: false, maNastepna: false });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        message.error(extractApiError(err, 'Nie udało się pobrać operacji.'));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Fetch when filters or debounced search change
  useEffect(() => {
    loadOperacje(filters, debouncedSearch);
    return () => abortRef.current?.abort();
  }, [filters, debouncedSearch, loadOperacje]);

  useEffect(() => {
    getStatusyOperacji().then(setStatusy).catch(() => message.warning('Nie udało się załadować statusów.'));
  }, []);

  const handleRowSelect = async (record: OperacjaListDto) => {
    if (selectedId === record.id) {
      setSelectedId(null);
      setSelectedKml(null);
      return;
    }
    setSelectedId(record.id);
    setSelectedKml(null);
    if (!record.kmlZawartosc) {
      setKmlLoading(true);
      try {
        const detail = await getOperacjaById(record.id);
        setSelectedKml(detail?.kmlZawartosc ?? null);
      } catch {
        setSelectedKml(null);
      } finally {
        setKmlLoading(false);
      }
    } else {
      setSelectedKml(record.kmlZawartosc);
    }
  };

  const columns = [
    {
      title: 'Numer',
      dataIndex: 'numer' as const,
      render: (v: string, r: OperacjaListDto) => (
        <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => navigate(`/operacje/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Trasa',
      key: 'trasa',
      width: 80,
      render: (_: unknown, record: OperacjaListDto) => (
        record.kmlZawartosc || selectedId === record.id ? (
          <Button
            size="small"
            type={selectedId === record.id ? 'primary' : 'default'}
            onClick={() => handleRowSelect(record)}
            style={{ fontSize: 11 }}
          >
            {selectedId === record.id ? 'Ukryj' : 'Mapa'}
          </Button>
        ) : null
      ),
    },
    { title: 'Nr zlecenia', dataIndex: 'numerZleceniaProjektu' as const, ellipsis: true },
    { title: 'Opis', dataIndex: 'opisSkrocony' as const, ellipsis: true },
    {
      title: 'Czynności',
      dataIndex: 'rodzajeCzynnosci' as const,
      render: (arr: string[]) => arr?.map(c => <Tag key={c} style={{ marginBottom: 2 }}>{c}</Tag>),
    },
    {
      title: 'Plan od',
      dataIndex: 'planowanaDataOd' as const,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Plan do',
      dataIndex: 'planowanaDataDo' as const,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'statusId' as const,
      render: (v: number) => <StatusOperacjiTag statusId={v} />,
    },
    {
      title: 'Akcje',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: OperacjaListDto) => (
        <Space>
          <Tooltip title="Szczegóły">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/operacje/${record.id}`)} />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Edytuj">
              <Button type="primary" ghost size="small" icon={<EditOutlined />}
                onClick={() => navigate(`/operacje/edit/${record.id}`)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<FileTextOutlined style={{ color: '#fff', fontSize: 22 }} />}
        gradient={gradients.operacje}
        title="Operacje lotnicze"
        subtitle={`${data.lacznaLiczba} rekordów`}
        extra={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: radii.md, fontWeight: 600 }}
            onClick={() => navigate('/operacje/new')}>
            Nowa operacja
          </Button>
        )}
      />

      <Card style={{ borderRadius: radii.xl }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A3A' }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={10}>
              <Input
                placeholder="Szukaj po numerze zlecenia…"
                prefix={<SearchOutlined style={{ color: '#7A7A95' }} />}
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Status"
                value={filters.statusId}
                allowClear
                onChange={v => setFilters(f => ({ ...f, statusId: v ?? StatusOperacji.POTWIERDZONE_DO_PLANU, strona: 1 }))}
              >
                {statusy.map(s => <Option key={s.id} value={s.id}>{s.nazwa}</Option>)}
              </Select>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={data.items}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.strona,
            pageSize: filters.rozmiarStrony,
            total: data.lacznaLiczba,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, size) => setFilters(f => ({ ...f, strona: page, rozmiarStrony: size })),
          }}
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: (e) => {
              const tag = (e.target as HTMLElement).tagName;
              if (tag !== 'BUTTON' && tag !== 'A') {
                handleRowSelect(record);
              }
            },
            style: {
              cursor: 'pointer',
              background: selectedId === record.id ? 'rgba(102,126,234,0.12)' : undefined,
            },
          })}
        />
      </Card>

      {selectedId && (
        <Card
          style={{ borderRadius: radii.xl, marginTop: 16 }}
          styles={{ body: { padding: '16px 20px' } }}
          title={<span style={{ fontWeight: 600 }}>Trasa lotu – operacja #{selectedId}</span>}
          extra={
            <Button size="small" onClick={() => { setSelectedId(null); setSelectedKml(null); }}>
              Zamknij
            </Button>
          }
        >
          {kmlLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>Wczytywanie trasy…</div>
          ) : selectedKml ? (
            <TrasaMapWidget kmlZawartosc={selectedKml} height={420} />
          ) : (
            <div style={{ color: '#888', padding: 16 }}>Brak danych trasy dla tej operacji.</div>
          )}
        </Card>
      )}
    </div>
  );
}
