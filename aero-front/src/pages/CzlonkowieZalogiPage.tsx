import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tooltip, Tag, Card, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { getCzlonkowie, extractApiError } from '../services/api';
import PageHeader from '../components/PageHeader';
import { radii, palette } from '../theme';
import type { CzlonekZalogiDto } from '../types/api';

export default function CzlonkowieZalogiPage() {
  const navigate = useNavigate();
  const [lista,   setLista]   = useState<CzlonekZalogiDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    getCzlonkowie(controller.signal).then(setLista).catch(err => message.error(extractApiError(err, 'Błąd ładowania.'))).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const filtered = lista.filter(c =>
    `${c.imie} ${c.nazwisko} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<CzlonekZalogiDto> = [
    { title: 'Imię i nazwisko', key: 'name', render: (_, r) => `${r.imie} ${r.nazwisko}` },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Rola', dataIndex: 'rolaNazwa', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Waga', dataIndex: 'wagaKg', render: (v: number) => `${v} kg` },
    { title: 'Licencja do', dataIndex: 'dataWaznosciLicencji', render: (v?: string) => v ?? '—' },
    { title: 'Szkolenie do', dataIndex: 'dataWaznosciSzkolenia' },
    {
      title: 'Status', dataIndex: 'aktywny',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Aktywny' : 'Nieaktywny'}</Tag>,
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
            style={{ borderRadius: radii.md, fontWeight: 600 }} onClick={() => navigate('/czlonkowie-zalogi/new')}>
            Dodaj członka
          </Button>
        }
      />
      <Card style={{ borderRadius: radii.xl }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${palette.borderLight}` }}>
          <Input placeholder="Szukaj…" prefix={<SearchOutlined style={{ color: palette.textMuted }} />}
            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 320 }} />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading}
          pagination={{ pageSize: 15 }} scroll={{ x: 750 }} />
      </Card>
    </div>
  );
}
