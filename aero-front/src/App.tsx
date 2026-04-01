import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Button, Drawer, Grid, Avatar, Dropdown, Typography, Spin, theme } from 'antd';
import {
  DashboardOutlined, MenuOutlined, AppstoreOutlined,
  RocketOutlined, FileTextOutlined, TeamOutlined,
  UserOutlined, LogoutOutlined, SettingOutlined,
  SendOutlined, EnvironmentOutlined, NodeIndexOutlined,
} from '@ant-design/icons';

import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import RoleGuard from './components/RoleGuard';
import GradientMenu, { type NavItem } from './components/GradientMenu';
import { palette, gradients, radii, antdThemeToken } from './theme';

// ── Lazy-loaded pages ─────────────────────────────────────────
const LoginPage             = lazy(() => import('./pages/LoginPage'));
const DashboardPage         = lazy(() => import('./pages/DashboardPage'));
const OperacjePage          = lazy(() => import('./pages/OperacjePage'));
const OperacjaFormPage      = lazy(() => import('./pages/OperacjaFormPage'));
const OperacjaDetailPage    = lazy(() => import('./pages/OperacjaDetailPage'));
const ZleceniaPage          = lazy(() => import('./pages/ZleceniaPage'));
const ZlecenieFormPage      = lazy(() => import('./pages/ZlecenieFormPage'));
const ZlecenieDetailPage    = lazy(() => import('./pages/ZlecenieDetailPage'));
const HelikopteryPage       = lazy(() => import('./pages/HelikopteryPage'));
const HelikopterFormPage    = lazy(() => import('./pages/HelikopterFormPage'));
const CzlonkowieZalogiPage  = lazy(() => import('./pages/CzlonkowieZalogiPage'));
const CzlonekZalogiFormPage = lazy(() => import('./pages/CzlonekZalogiFormPage'));
const LadowiskaPage         = lazy(() => import('./pages/LadowiskaPage'));
const LadowiskoFormPage     = lazy(() => import('./pages/LadowiskoFormPage'));
const UzytkownicyPage       = lazy(() => import('./pages/UzytkownicyPage'));
const UzytkownikFormPage    = lazy(() => import('./pages/UzytkownikFormPage'));
const TrasyLotowPage        = lazy(() => import('./pages/TrasyLotowPage'));
const NotFoundPage          = lazy(() => import('./pages/NotFoundPage'));

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;
const { Text } = Typography;

const NAV_ITEMS: NavItem[] = [
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

// ── Spinner fallback ──────────────────────────────────────────
const PageSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
    <Spin size="large" />
  </div>
);

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
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Wyloguj', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    },
  };

  const handleSelect = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const sideMenu = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '20px 16px 16px',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: radii.md,
          background: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AppstoreOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>LotyAdmin</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Operacje lotnicze</div>
        </div>
      </div>

      <GradientMenu
        items={visibleItems}
        selectedKey={selectedKey}
        onSelect={handleSelect}
      />

      {/* User section */}
      <div style={{ padding: '14px 12px', borderTop: `1px solid ${palette.sidebarDivider}` }}>
        <Dropdown menu={userMenu} placement="topLeft" trigger={['click']}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: radii.md,
            background: palette.sidebarUserBg, cursor: 'pointer',
            border: `1px solid ${palette.sidebarUserBorder}`,
          }}>
            <Avatar size={30} style={{
              background: gradients.avatar,
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

  const siderStyle: React.CSSProperties = {
    background: gradients.sidebar,
    borderRight: '1px solid rgba(255,255,255,0.07)',
    position: 'fixed', left: 0, top: 0, bottom: 0,
    zIndex: 100, overflow: 'hidden',
  };

  return (
    <Layout style={{ minHeight: '100vh', background: palette.bgDeep }}>
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
            wrapper: { background: gradients.sidebar },
          }}
        >
          {sideMenu}
        </Drawer>
      )}

      <Layout style={{ marginLeft: screens.md ? 230 : 0, background: palette.bgDeep }}>
        <Header style={{
          background: palette.bgBase,
          borderBottom: `1px solid ${palette.border}`,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 99, height: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!screens.md && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: palette.text }} />}
                onClick={() => setDrawerOpen(true)}
                aria-label="Otwórz menu"
              />
            )}
            <span style={{ color: palette.textMuted, fontSize: 13 }}>
              {visibleItems.find(i => i.key === selectedKey)?.label ?? ''}
            </span>
          </div>
        </Header>

        <Content style={{ padding: 28, background: palette.bgDeep, minHeight: 'calc(100vh - 60px)' }}>
          <ErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
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
                  <Route path="*"                              element={<NotFoundPage />} />
                </Routes>
              </div>
            </Suspense>
          </ErrorBoundary>
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
      token: antdThemeToken,
      components: {
        Table: { borderRadius: radii.lg },
        Card:  { borderRadius: radii.xl },
      },
    }}>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={
              <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: palette.bgDeep }}>
                <Spin size="large" />
              </div>
            }>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*"     element={<ProtectedApp />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
