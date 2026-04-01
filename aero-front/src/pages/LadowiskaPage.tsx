import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tooltip, Card, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getLadowiska, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';
import { radii, palette } from '../theme';
import type { LadowiskoDto } from '../types/api';

export default function LadowiskaPage() {
  const navigate = useNavigate();
  const [lista,   setLista]   = useState<LadowiskoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    getLadowiska(controller.signal).then(setLista).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const filtered = lista.filter(l => l.nazwa?.toLowerCase().includes(search.toLowerCase()));

  const columns: ColumnsType<LadowiskoDto> = [
    { title: 'Nazwa', dataIndex: 'nazwa', render: (v: string) => <b>{v}</b> },
    { title: 'Szerokość (lat)', dataIndex: 'szerokosc', render: (v: number) => v.toFixed(6) },
    { title: 'Długość (lon)',   dataIndex: 'dlugosc',   render: (v: number) => v.toFixed(6) },
    { title: 'Opis', dataIndex: 'opis', ellipsis: true, render: (v?: string) => v ?? '—' },
    {
      title: 'Akcje', key: 'actions', width: 80,
      render: (_, r) => (
        <Tooltip title="Edytuj">
          <Button type="primary" ghost size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/ladowiska/edit/${r.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<EnvironmentOutlined style={{ color: '#fff', fontSize: 22 }} />}
        gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        title="Lądowiska"
        subtitle={`${lista.length} rekordów`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: radii.md, fontWeight: 600 }} onClick={() => navigate('/ladowiska/new')}>
            Dodaj lądowisko
          </Button>
        }
      />
      <Card style={{ borderRadius: radii.xl }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${palette.borderLight}` }}>
          <Input placeholder="Szukaj po nazwie…" prefix={<SearchOutlined style={{ color: palette.textMuted }} />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 320 }} />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading}
          pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
}
