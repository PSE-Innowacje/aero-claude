import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Button, Drawer, Grid, Avatar, Dropdown, Typography, theme } from 'antd';
import {
  DashboardOutlined, MenuOutlined, AppstoreOutlined,
  RocketOutlined, FileTextOutlined, TeamOutlined,
  UserOutlined, LogoutOutlined, SettingOutlined,
  SendOutlined, EnvironmentOutlined, NodeIndexOutlined
} from '@ant-design/icons';

import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage             from './pages/LoginPage';
import DashboardPage         from './pages/DashboardPage';
import OperacjePage          from './pages/OperacjePage';
import OperacjaFormPage      from './pages/OperacjaFormPage';
import OperacjaDetailPage    from './pages/OperacjaDetailPage';
import ZleceniaPage          from './pages/ZleceniaPage';
import ZlecenieFormPage      from './pages/ZlecenieFormPage';
import ZlecenieDetailPage    from './pages/ZlecenieDetailPage';
import HelikopteryPage       from './pages/HelikopteryPage';
import HelikopterFormPage    from './pages/HelikopterFormPage';
import CzlonkowieZalogiPage  from './pages/CzlonkowieZalogiPage';
import CzlonekZalogiFormPage from './pages/CzlonekZalogiFormPage';
import LadowiskaPage         from './pages/LadowiskaPage';
import LadowiskoFormPage     from './pages/LadowiskoFormPage';
import UzytkownicyPage       from './pages/UzytkownicyPage';
import UzytkownikFormPage    from './pages/UzytkownikFormPage';
import TrasyLotowPage        from './pages/TrasyLotowPage';
import RoleGuard             from './components/RoleGuard';
import { PSE_BLUE, PSE_RED, lerpColor } from './utils/colors';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;
const { Text } = Typography;

const NAV_ITEMS = [
  { key: '/',                   icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/operacje',           icon: <FileTextOutlined />,  label: 'Operacje lotnicze' },
  { key: '/zlecenia',           icon: <RocketOutlined />,    label: 'Zlecenia na lot' },
  { key: '/trasy-lotow',        icon: <NodeIndexOutlined />, label: 'Trasy lotów' },
  { divider: true },
  { key: '/helikoptery',        icon: <SendOutlined />,         label: 'Helikoptery', adminOnly: true },
  { key: '/czlonkowie-zalogi',  icon: <TeamOutlined />,        label: 'Załoga',      adminOnly: true },
  { key: '/ladowiska',          icon: <EnvironmentOutlined />, label: 'Lądowiska',   adminOnly: true },
  { key: '/uzytkownicy',        icon: <UserOutlined />,        label: 'Użytkownicy', adminOnly: true },
];

// ── Własne menu z gradientem kolorów ─────────────────────────
function GradientMenu({ items, selectedKey, onSelect }) {
  // Tylko pozycje z key (bez dividerów)
  const navItems = items.filter(i => i.key);
  const total    = navItems.length;

  return (
    <nav style={{ padding: '4px 0', flex: 1 }}>
      {items.map((item, globalIdx) => {
        // Divider
        if (item.divider) {
          return (
            <div key={`div-${globalIdx}`} style={{
              margin: '8px 16px',
              height: 1,
              background: 'rgba(255,255,255,0.10)',
            }} />
          );
        }

        // Oblicz pozycję w gradiencie na podstawie miejsca w navItems
        const navIdx = navItems.findIndex(n => n.key === item.key);
        const t      = total > 1 ? navIdx / (total - 1) : 0;
        const color  = lerpColor(t);
        const isSelected = selectedKey === item.key;

        return (
          <div
            key={item.key}
            onClick={() => onSelect(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '2px 8px',
              padding: '9px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'background 0.18s, box-shadow 0.18s',
              // Tło aktywnej pozycji — delikatna poświata w kolorze pozycji
              background: isSelected
                ? `rgba(${PSE_BLUE[0] + (PSE_RED[0] - PSE_BLUE[0]) * t}, ${PSE_BLUE[1] + (PSE_RED[1] - PSE_BLUE[1]) * t}, ${PSE_BLUE[2] + (PSE_RED[2] - PSE_BLUE[2]) * t}, 0.22)`
                : 'transparent',
              border: isSelected
                ? `1px solid ${color}55`
                : '1px solid transparent',
              boxShadow: isSelected
                ? `0 0 12px ${color}30`
                : 'none',
            }}
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
            }}
            onMouseLeave={e => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Ikona — biała zawsze */}
            <span style={{
              color: '#ffffff',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              opacity: isSelected ? 1 : 0.75,
              transition: 'opacity 0.18s',
            }}>
              {item.icon}
            </span>

            {/* Label — biały zawsze */}
            <span style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: isSelected ? 700 : 500,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.01em',
              opacity: isSelected ? 1 : 0.75,
              transition: 'font-weight 0.1s, opacity 0.18s',
            }}>
              {item.label}
            </span>

            {/* Wskaźnik aktywności */}
            {isSelected && (
              <div style={{
                marginLeft: 'auto',
                width: 4,
                height: 16,
                borderRadius: 2,
                background: color,
                boxShadow: `0 0 6px ${color}`,
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ── Layout aplikacji ──────────────────────────────────────────
function AppLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const screens     = useBreakpoint();
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

  const handleSelect = (key) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const sideMenu = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div style={{
        padding: '22px 20px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        marginBottom: 6,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #1a5fa8 0%, #a71e2d 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 2px 10px rgba(26,95,168,0.40)',
        }}>
          <AppstoreOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>LotyAdmin</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Operacje lotnicze</div>
        </div>
      </div>

      {/* Menu z gradientem */}
      <GradientMenu
        items={visibleItems}
        selectedKey={selectedKey}
        onSelect={handleSelect}
      />

      {/* Użytkownik */}
      <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <Dropdown menu={userMenu} placement="topLeft" trigger={['click']}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.10)',
          }}>
            <Avatar size={30} style={{
              background: 'linear-gradient(135deg, #1a5fa8, #a71e2d)',
              fontSize: 12, fontWeight: 700,
            }}>
              {user?.imie?.[0]}{user?.nazwisko?.[0]}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#fff', fontSize: 13, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.imie} {user?.nazwisko}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{rola}</div>
            </div>
            <SettingOutlined style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13 }} />
          </div>
        </Dropdown>
      </div>
    </div>
  );

  const siderStyle = {
    background: 'linear-gradient(180deg, #1a5fa8 0%, #17407a 40%, #8b1822 75%, #a71e2d 100%)',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    position: 'fixed', left: 0, top: 0, bottom: 0,
    zIndex: 100, overflow: 'hidden',
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#080f1a' }}>
      {screens.md ? (
        <Sider width={230} style={siderStyle}>
          {sideMenu}
        </Sider>
      ) : (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={230}
          styles={{
            body: { padding: 0, background: 'transparent' },
            header: { display: 'none' },
            wrapper: { background: 'linear-gradient(180deg, #1a5fa8 0%, #17407a 40%, #8b1822 75%, #a71e2d 100%)' },
          }}
        >
          {sideMenu}
        </Drawer>
      )}

      <Layout style={{ marginLeft: screens.md ? 230 : 0, background: '#080f1a' }}>
        <Header style={{
          background: '#0f1e30',
          borderBottom: '1px solid #1e3a5c',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 99, height: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!screens.md && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: '#e8eef6' }} />}
                onClick={() => setDrawerOpen(true)}
              />
            )}
            <span style={{ color: '#7a9abf', fontSize: 13 }}>
              {visibleItems.find(i => i.key === selectedKey)?.label ?? ''}
            </span>
          </div>
        </Header>

        <Content style={{ padding: 28, background: '#080f1a', minHeight: 'calc(100vh - 60px)' }}>
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
              <Route path="/trasy-lotow"                   element={<TrasyLotowPage />} />
              <Route path="/helikoptery"                   element={<RoleGuard roles={['Administrator']}><HelikopteryPage /></RoleGuard>} />
              <Route path="/helikoptery/new"               element={<RoleGuard roles={['Administrator']}><HelikopterFormPage /></RoleGuard>} />
              <Route path="/helikoptery/edit/:id"          element={<RoleGuard roles={['Administrator']}><HelikopterFormPage /></RoleGuard>} />
              <Route path="/czlonkowie-zalogi"             element={<RoleGuard roles={['Administrator']}><CzlonkowieZalogiPage /></RoleGuard>} />
              <Route path="/czlonkowie-zalogi/new"         element={<RoleGuard roles={['Administrator']}><CzlonekZalogiFormPage /></RoleGuard>} />
              <Route path="/czlonkowie-zalogi/edit/:id"    element={<RoleGuard roles={['Administrator']}><CzlonekZalogiFormPage /></RoleGuard>} />
              <Route path="/ladowiska"                     element={<RoleGuard roles={['Administrator']}><LadowiskaPage /></RoleGuard>} />
              <Route path="/ladowiska/new"                 element={<RoleGuard roles={['Administrator']}><LadowiskoFormPage /></RoleGuard>} />
              <Route path="/ladowiska/edit/:id"            element={<RoleGuard roles={['Administrator']}><LadowiskoFormPage /></RoleGuard>} />
              <Route path="/uzytkownicy"                   element={<RoleGuard roles={['Administrator']}><UzytkownicyPage /></RoleGuard>} />
              <Route path="/uzytkownicy/new"               element={<RoleGuard roles={['Administrator']}><UzytkownikFormPage /></RoleGuard>} />
              <Route path="/uzytkownicy/edit/:id"          element={<RoleGuard roles={['Administrator']}><UzytkownikFormPage /></RoleGuard>} />
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
        colorPrimary: '#1a5fa8',
        borderRadius: 10,
        colorBgContainer: '#0f1e30',
        colorBgElevated:  '#162840',
        colorBgLayout:    '#080f1a',
        colorBorder:      '#1e3a5c',
        colorText:        '#e8eef6',
        colorTextSecondary: '#7a9abf',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      components: {
        Table: { borderRadius: 12 },
        Card:  { borderRadius: 16 },
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
