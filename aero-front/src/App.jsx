import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, theme, Button, Drawer, Grid, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined, MenuOutlined, AppstoreOutlined,
  RocketOutlined, FileTextOutlined, TeamOutlined,
  UserOutlined, LogoutOutlined, SettingOutlined,
  CarOutlined, EnvironmentOutlined,
} from '@ant-design/icons';

import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage           from './pages/LoginPage';
import DashboardPage       from './pages/DashboardPage';
import OperacjePage        from './pages/OperacjePage';
import OperacjaFormPage    from './pages/OperacjaFormPage';
import OperacjaDetailPage  from './pages/OperacjaDetailPage';
import ZleceniaPage        from './pages/ZleceniaPage';
import ZlecenieFormPage    from './pages/ZlecenieFormPage';
import ZlecenieDetailPage  from './pages/ZlecenieDetailPage';
import HelikopteryPage     from './pages/HelikopteryPage';
import HelikopterFormPage  from './pages/HelikopterFormPage';
import CzlonkowieZalogiPage from './pages/CzlonkowieZalogiPage';
import CzlonekZalogiFormPage from './pages/CzlonekZalogiFormPage';
import LadowiskaPage       from './pages/LadowiskaPage';
import LadowiskoFormPage   from './pages/LadowiskoFormPage';
import UzytkownicyPage     from './pages/UzytkownicyPage';
import UzytkownikFormPage  from './pages/UzytkownikFormPage';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;
const { Text } = Typography;

const NAV_ITEMS = [
  { key: '/',           icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/operacje',   icon: <FileTextOutlined />,  label: 'Operacje lotnicze' },
  { key: '/zlecenia',   icon: <RocketOutlined />,    label: 'Zlecenia na lot' },
  { type: 'divider' },
  { key: '/helikoptery',        icon: <CarOutlined />,         label: 'Helikoptery', adminOnly: true },
  { key: '/czlonkowie-zalogi',  icon: <TeamOutlined />,        label: 'Załoga',      adminOnly: true },
  { key: '/ladowiska',          icon: <EnvironmentOutlined />, label: 'Lądowiska',   adminOnly: true },
  { key: '/uzytkownicy',        icon: <UserOutlined />,        label: 'Użytkownicy', adminOnly: true },
];

function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const screens   = useBreakpoint();
  const { user, rola, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = rola === 'Administrator';

  const selectedKey = NAV_ITEMS.find(item =>
    item.key && item.key !== '/'
      ? location.pathname.startsWith(item.key)
      : location.pathname === '/'
  )?.key ?? '/';

  const visibleItems = NAV_ITEMS.filter(i => !i.adminOnly || isAdmin);

  const userMenu = {
    items: [
      { key: 'email', label: <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>, disabled: true },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Wyloguj', danger: true },
    ],
    onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } },
  };

  const sideMenu = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid #2A2A3A', marginBottom: 8,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #6C47FF 0%, #a78bfa 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AppstoreOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div>
          <div style={{ color: '#F0EFF8', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>LotyAdmin</div>
          <div style={{ color: '#7A7A95', fontSize: 11 }}>Operacje lotnicze</div>
        </div>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={visibleItems}
        onClick={({ key }) => { navigate(key); setDrawerOpen(false); }}
        style={{ background: 'transparent', border: 'none', flex: 1 }}
      />

      <div style={{ padding: '16px 20px', borderTop: '1px solid #2A2A3A' }}>
        <Dropdown menu={userMenu} placement="topLeft" trigger={['click']}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 10,
            background: '#1E1E2A', cursor: 'pointer',
          }}>
            <Avatar size={30} style={{ background: '#6C47FF', fontSize: 13 }}>
              {user?.imie?.[0]}{user?.nazwisko?.[0]}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#F0EFF8', fontSize: 13, fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.imie} {user?.nazwisko}
              </div>
              <div style={{ color: '#7A7A95', fontSize: 11 }}>{rola}</div>
            </div>
            <SettingOutlined style={{ color: '#7A7A95', fontSize: 13 }} />
          </div>
        </Dropdown>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#0D0D14' }}>
      {screens.md ? (
        <Sider width={230} style={{
          background: '#16161F', borderRight: '1px solid #2A2A3A',
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflow: 'hidden',
        }}>
          {sideMenu}
        </Sider>
      ) : (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={230}
          styles={{ body: { padding: 0, background: '#16161F' }, header: { display: 'none' } }}
        >
          {sideMenu}
        </Drawer>
      )}

      <Layout style={{ marginLeft: screens.md ? 230 : 0, background: '#0D0D14' }}>
        <Header style={{
          background: '#16161F', borderBottom: '1px solid #2A2A3A',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 99, height: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!screens.md && (
              <Button type="text" icon={<MenuOutlined style={{ color: '#F0EFF8' }} />}
                onClick={() => setDrawerOpen(true)} />
            )}
            <span style={{ color: '#7A7A95', fontSize: 13 }}>
              {visibleItems.find(i => i.key === selectedKey)?.label ?? ''}
            </span>
          </div>
        </Header>

        <Content style={{ padding: 28, background: '#0D0D14', minHeight: 'calc(100vh - 60px)' }}>
          <div className="page-enter">
            <Routes>
              <Route path="/"                              element={<DashboardPage />} />
              <Route path="/operacje"                      element={<OperacjePage />} />
              <Route path="/operacje/new"                  element={<OperacjaFormPage />} />
              <Route path="/operacje/edit/:id"             element={<OperacjaFormPage />} />
              <Route path="/operacje/:id"                  element={<OperacjaDetailPage />} />
              <Route path="/zlecenia"                      element={<ZleceniaPage />} />
              <Route path="/zlecenia/new"                  element={<ZlecenieFormPage />} />
              <Route path="/zlecenia/edit/:id"             element={<ZlecenieFormPage />} />
              <Route path="/zlecenia/:id"                  element={<ZlecenieDetailPage />} />
              <Route path="/helikoptery"                   element={<HelikopteryPage />} />
              <Route path="/helikoptery/new"               element={<HelikopterFormPage />} />
              <Route path="/helikoptery/edit/:id"          element={<HelikopterFormPage />} />
              <Route path="/czlonkowie-zalogi"             element={<CzlonkowieZalogiPage />} />
              <Route path="/czlonkowie-zalogi/new"         element={<CzlonekZalogiFormPage />} />
              <Route path="/czlonkowie-zalogi/edit/:id"    element={<CzlonekZalogiFormPage />} />
              <Route path="/ladowiska"                     element={<LadowiskaPage />} />
              <Route path="/ladowiska/new"                 element={<LadowiskoFormPage />} />
              <Route path="/ladowiska/edit/:id"            element={<LadowiskoFormPage />} />
              <Route path="/uzytkownicy"                   element={<UzytkownicyPage />} />
              <Route path="/uzytkownicy/new"               element={<UzytkownikFormPage />} />
              <Route path="/uzytkownicy/edit/:id"          element={<UzytkownikFormPage />} />
              <Route path="*"                              element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

function ProtectedApp() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  return <AppLayout />;
}

export default function App() {
  return (
    <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#6C47FF',
        borderRadius: 10,
        colorBgContainer: '#16161F',
        colorBgElevated: '#1E1E2A',
        colorBgLayout: '#0D0D14',
        colorBorder: '#2A2A3A',
        colorText: '#F0EFF8',
        colorTextSecondary: '#7A7A95',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      components: {
        Table: { borderRadius: 12 },
        Card:  { borderRadius: 16 },
        Menu:  { darkItemBg: 'transparent', darkItemSelectedBg: 'rgba(108,71,255,0.2)' },
      },
    }}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*"     element={<ProtectedApp />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
