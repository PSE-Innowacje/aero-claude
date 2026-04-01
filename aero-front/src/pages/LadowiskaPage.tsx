import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tooltip, Card, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getLadowiska, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';

export default function LadowiskaPage() {
  const navigate = useNavigate();
  const [lista,   setLista]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    setLoading(true);
    getLadowiska().then(setLista).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => setLoading(false));
  }, []);

  const filtered = lista.filter(l => l.nazwa?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { title: 'Nazwa', dataIndex: 'nazwa', render: v => <b>{v}</b> },
    { title: 'Szerokość (lat)', dataIndex: 'szerokosc', render: v => v.toFixed(6) },
    { title: 'Długość (lon)',   dataIndex: 'dlugosc',   render: v => v.toFixed(6) },
    { title: 'Opis', dataIndex: 'opis', ellipsis: true, render: v => v ?? '—' },
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
            style={{ borderRadius: 10, fontWeight: 600 }} onClick={() => navigate('/ladowiska/new')}>
            Dodaj lądowisko
          </Button>
        }
      />
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A3A' }}>
          <Input placeholder="Szukaj po nazwie…" prefix={<SearchOutlined style={{ color: '#7A7A95' }} />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 320 }} />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading}
          pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
}
