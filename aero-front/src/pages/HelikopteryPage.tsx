import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tooltip, Tag, Card, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons';
import { getHelikoptery, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';
import { radii, palette } from '../theme';
import type { HelikopterDto } from '../types/api';

export default function HelikopteryPage() {
  const navigate = useNavigate();
  const [helikoptery, setHelikoptery] = useState<HelikopterDto[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    getHelikoptery(controller.signal).then(setHelikoptery).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const filtered = helikoptery.filter(h =>
    h.numerRejestracyjny?.toLowerCase().includes(search.toLowerCase()) ||
    h.typ?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<HelikopterDto> = [
    { title: 'Nr rejestracyjny', dataIndex: 'numerRejestracyjny', render: (v: string) => <b>{v}</b> },
    { title: 'Typ', dataIndex: 'typ' },
    { title: 'Zasięg', dataIndex: 'zasiegKm', render: (v: number) => `${v} km` },
    { title: 'Udźwig', dataIndex: 'maksUdzwigKg', render: (v: number) => `${v} kg` },
    { title: 'Maks. załoga', dataIndex: 'maksLiczbaCzlonkowZalogi' },
    { title: 'Przegląd do', dataIndex: 'dataWaznosciPrzegladu', render: (v?: string) => v ?? '—' },
    {
      title: 'Status', dataIndex: 'status',
      render: (v: string) => <Tag color={v === 'aktywny' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Akcje', key: 'actions', width: 80,
      render: (_, r) => (
        <Tooltip title="Edytuj">
          <Button type="primary" ghost size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/helikoptery/edit/${r.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<SendOutlined style={{ color: '#fff', fontSize: 22 }} />}
        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        title="Helikoptery"
        subtitle={`${helikoptery.length} rekordów`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: radii.md, fontWeight: 600 }} onClick={() => navigate('/helikoptery/new')}>
            Dodaj helikopter
          </Button>
        }
      />
      <Card style={{ borderRadius: radii.xl }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${palette.borderLight}` }}>
          <Input placeholder="Szukaj…" prefix={<SearchOutlined style={{ color: palette.textMuted }} />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 320 }} />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false }} scroll={{ x: 700 }} />
      </Card>
    </div>
  );
}
