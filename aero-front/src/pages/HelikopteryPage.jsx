import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tooltip, Tag, Card, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, CarOutlined } from '@ant-design/icons';
import { getHelikoptery } from '../services/api';
import PageHeader from '../components/PageHeader';

export default function HelikopteryPage() {
  const navigate = useNavigate();
  const [helikoptery, setHelikoptery] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');

  useEffect(() => {
    setLoading(true);
    getHelikoptery().then(setHelikoptery).catch(() => message.error('Błąd ładowania.')).finally(() => setLoading(false));
  }, []);

  const filtered = helikoptery.filter(h =>
    h.numerRejestracyjny?.toLowerCase().includes(search.toLowerCase()) ||
    h.typ?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: 'Nr rejestracyjny', dataIndex: 'numerRejestracyjny', render: v => <b>{v}</b> },
    { title: 'Typ', dataIndex: 'typ' },
    { title: 'Zasięg', dataIndex: 'zasiegKm', render: v => `${v} km` },
    { title: 'Udźwig', dataIndex: 'maksUdzwigKg', render: v => `${v} kg` },
    { title: 'Maks. załoga', dataIndex: 'maksLiczbaCzlonkowZalogi' },
    { title: 'Przegląd do', dataIndex: 'dataWaznosciPrzegladu', render: v => v ?? '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: v => <Tag color={v === 'aktywny' ? 'green' : 'default'}>{v}</Tag>,
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
        icon={<CarOutlined style={{ color: '#fff', fontSize: 22 }} />}
        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        title="Helikoptery"
        subtitle={`${helikoptery.length} rekordów`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: 10, fontWeight: 600 }} onClick={() => navigate('/helikoptery/new')}>
            Dodaj helikopter
          </Button>
        }
      />
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A3A' }}>
          <Input placeholder="Szukaj…" prefix={<SearchOutlined style={{ color: '#7A7A95' }} />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 320 }} />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false }} scroll={{ x: 700 }} />
      </Card>
    </div>
  );
}
