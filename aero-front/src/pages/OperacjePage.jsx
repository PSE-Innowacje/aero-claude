import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Popconfirm, message, Card, Input,
  Select, Tag, Tooltip, DatePicker, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined,
  SearchOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { getOperacje, getOperacjaById, getStatusyOperacji, extractApiError } from '../services/api';
import TrasaMapWidget from '../components/TrasaMapWidget';
import { StatusOperacjiTag } from '../components/StatusTag';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function OperacjePage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canEdit = hasRole('Osoba planująca', 'Osoba nadzorująca', 'Administrator');

  const [data,     setData]     = useState({ items: [], lacznaLiczba: 0 });
  const [statusy,  setStatusy]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [filters,  setFilters]  = useState({ statusId: 3, strona: 1, rozmiarStrony: 20 });
  const [search,        setSearch]        = useState('');
  const [selectedId,    setSelectedId]    = useState(null);
  const [selectedKml,   setSelectedKml]   = useState(null);
  const [kmlLoading,    setKmlLoading]    = useState(false);

  const fetch = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = { ...f };
      if (search) params.numerZlecenia = search;
      const result = await getOperacje(params);
      setData(result ?? { items: [], lacznaLiczba: 0 });
    } catch (err) {
      message.error(extractApiError(err, 'Nie udało się pobrać operacji.'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetch(filters); }, [filters]);
  useEffect(() => { getStatusyOperacji().then(setStatusy).catch(() => {}); }, []);

  const handleSearch = () => fetch({ ...filters, strona: 1 });

  const handleRowSelect = async (record) => {
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
      dataIndex: 'numer',
      render: (v, r) => (
        <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => navigate(`/operacje/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Trasa',
      key: 'trasa',
      width: 80,
      render: (_, record) => (
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
    { title: 'Nr zlecenia', dataIndex: 'numerZleceniaProjektu', ellipsis: true },
    { title: 'Opis', dataIndex: 'opisSkrocony', ellipsis: true },
    {
      title: 'Czynności',
      dataIndex: 'rodzajeCzynnosci',
      render: arr => arr?.map(c => <Tag key={c} style={{ marginBottom: 2 }}>{c}</Tag>),
    },
    {
      title: 'Plan od',
      dataIndex: 'planowanaDataOd',
      sorter: true,
      render: v => v ?? '—',
    },
    {
      title: 'Plan do',
      dataIndex: 'planowanaDataDo',
      render: v => v ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'statusId',
      render: (v) => <StatusOperacjiTag statusId={v} />,
    },
    {
      title: 'Akcje',
      key: 'actions',
      width: 100,
      render: (_, record) => (
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
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        title="Operacje lotnicze"
        subtitle={`${data.lacznaLiczba} rekordów`}
        extra={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: 10, fontWeight: 600 }}
            onClick={() => navigate('/operacje/new')}>
            Nowa operacja
          </Button>
        )}
      />

      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        {/* Filtry */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A3A' }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={10}>
              <Input
                placeholder="Szukaj po numerze zlecenia…"
                prefix={<SearchOutlined style={{ color: '#7A7A95' }} />}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Status"
                value={filters.statusId}
                allowClear
                onChange={v => setFilters(f => ({ ...f, statusId: v ?? 3, strona: 1 }))}
              >
                {statusy.map(s => <Option key={s.id} value={s.id}>{s.nazwa}</Option>)}
              </Select>
            </Col>
            <Col xs={24} sm={6}>
              <Button type="primary" onClick={handleSearch} block>Szukaj</Button>
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
              // kliknięcie w wiersz (poza przyciskami) też otwiera mapę
              if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
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

      {/* Mapa trasy wybranej operacji */}
      {selectedId && (
        <Card
          style={{ borderRadius: 16, marginTop: 16 }}
          styles={{ body: { padding: '16px 20px' } }}
          title={
            <span style={{ fontWeight: 600 }}>
              Trasa lotu – operacja #{selectedId}
            </span>
          }
          extra={
            <Button size="small" onClick={() => { setSelectedId(null); setSelectedKml(null); }}>
              Zamknij
            </Button>
          }
        >
          {kmlLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <span>Wczytywanie trasy…</span>
            </div>
          ) : selectedKml ? (
            <TrasaMapWidget kmlZawartosc={selectedKml} height={420} />
          ) : (
            <div style={{ color: '#888', padding: 16 }}>
              Brak danych trasy dla tej operacji.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
