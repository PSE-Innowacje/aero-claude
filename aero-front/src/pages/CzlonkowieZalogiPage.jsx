import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tooltip, Tag, Card, Input, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { getCzlonkowie, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';

export default function CzlonkowieZalogiPage() {
  const navigate = useNavigate();
  const [lista,   setLista]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    setLoading(true);
    getCzlonkowie().then(setLista).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => setLoading(false));
  }, []);

  const filtered = lista.filter(c =>
    `${c.imie} ${c.nazwisko} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: 'Imię i nazwisko', key: 'name', render: (_, r) => `${r.imie} ${r.nazwisko}` },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Rola', dataIndex: 'rolaNazwa', render: v => <Tag color="blue">{v}</Tag> },
    { title: 'Waga', dataIndex: 'wagaKg', render: v => `${v} kg` },
    { title: 'Licencja do', dataIndex: 'dataWaznosciLicencji', render: v => v ?? '—' },
    { title: 'Szkolenie do', dataIndex: 'dataWaznosciSzkolenia' },
    {
      title: 'Status', dataIndex: 'aktywny',
      render: v => <Tag color={v ? 'green' : 'default'}>{v ? 'Aktywny' : 'Nieaktywny'}</Tag>,
    },
    {
      title: 'Akcje', key: 'actions', width: 80,
      render: (_, r) => (
        <Tooltip title="Edytuj">
          <Button type="primary" ghost size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/czlonkowie-zalogi/edit/${r.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<TeamOutlined style={{ color: '#fff', fontSize: 22 }} />}
        gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        title="Członkowie załogi"
        subtitle={`${lista.length} rekordów`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: 10, fontWeight: 600 }} onClick={() => navigate('/czlonkowie-zalogi/new')}>
            Dodaj członka
          </Button>
        }
      />
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A3A' }}>
          <Input placeholder="Szukaj…" prefix={<SearchOutlined style={{ color: '#7A7A95' }} />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 320 }} />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading}
          pagination={{ pageSize: 15 }} scroll={{ x: 750 }} />
      </Card>
    </div>
  );
}
