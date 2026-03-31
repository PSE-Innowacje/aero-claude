import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tooltip, Tag, Card, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { getUzytkownicy, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';

const ROLA_COLORS = {
  'Administrator': 'red',
  'Osoba planująca': 'blue',
  'Osoba nadzorująca': 'purple',
  'Pilot': 'green',
};

export default function UzytkownicyPage() {
  const navigate = useNavigate();
  const [lista,   setLista]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    setLoading(true);
    getUzytkownicy().then(setLista).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => setLoading(false));
  }, []);

  const filtered = lista.filter(u =>
    `${u.imie} ${u.nazwisko} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: 'Imię i nazwisko', key: 'name', render: (_, r) => `${r.imie} ${r.nazwisko}` },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Rola', dataIndex: 'rolaNazwa',
      render: v => <Tag color={ROLA_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Status', dataIndex: 'aktywny',
      render: v => <Tag color={v ? 'green' : 'default'}>{v ? 'Aktywny' : 'Nieaktywny'}</Tag>,
    },
    {
      title: 'Akcje', key: 'actions', width: 80,
      render: (_, r) => (
        <Tooltip title="Edytuj">
          <Button type="primary" ghost size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/uzytkownicy/edit/${r.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<UserOutlined style={{ color: '#fff', fontSize: 22 }} />}
        gradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
        title="Użytkownicy systemu"
        subtitle={`${lista.length} rekordów`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: 10, fontWeight: 600 }} onClick={() => navigate('/uzytkownicy/new')}>
            Dodaj użytkownika
          </Button>
        }
      />
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A3A' }}>
          <Input placeholder="Szukaj…" prefix={<SearchOutlined style={{ color: '#7A7A95' }} />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 320 }} />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading}
          pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
}
