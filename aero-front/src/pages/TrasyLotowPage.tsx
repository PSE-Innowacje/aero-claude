import React, { useState, useCallback, useRef } from 'react';
import { Button, Typography, Card, Tooltip, Badge } from 'antd';
import {
  UploadOutlined, DownloadOutlined, DeleteOutlined,
  AimOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';

import MapTiles from '../components/MapTiles';
import MapOverlay from '../components/MapOverlay';
import MapControls from '../components/MapControls';
import RouteIcon from '../components/RouteIcon';
import PageHeader from '../components/PageHeader';
import useSlippyMap from '../hooks/useSlippyMap';
import { pixelToLatLng, totalDistance, formatDistance } from '../mapUtils';
import { lerpColor } from '../utils/colors';
import { palette, radii, gradients } from '../theme';
import type { LatLng, Pixel } from '../types/api';

const { Text } = Typography;

// ── Sidebar ───────────────────────────────────────────────────

interface PointsSidebarProps {
  points: LatLng[];
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
  onRemove: (idx: number) => void;
  onClear: () => void;
  dist: number;
  open: boolean;
}

function PointsSidebar({ points, hoveredIdx, onHover, onRemove, onClear, dist, open }: PointsSidebarProps) {
  return (
    <div style={{
      width: open ? 270 : 0, minWidth: open ? 270 : 0,
      overflow: 'hidden', transition: 'width 0.22s ease, min-width 0.22s ease',
      background: palette.bgBase, borderLeft: open ? `1px solid ${palette.border}` : 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: `1px solid ${palette.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <Text style={{ fontSize: 11, letterSpacing: '0.12em', color: palette.textMuted, textTransform: 'uppercase' }}>
          Punkty trasy
        </Text>
        {points.length > 0 && (
          <Tooltip title="Wyczyść trasę">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onClear} aria-label="Wyczyść trasę" />
          </Tooltip>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {points.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: palette.textFaint, fontSize: 12, lineHeight: 2, fontStyle: 'italic' }}>
            Kliknij na mapie,<br />aby dodać punkt trasy
          </div>
        ) : (
          points.map((p, i) => {
            const isFirst = i === 0;
            const isLast  = i === points.length - 1 && i !== 0;
            const t       = points.length > 1 ? i / (points.length - 1) : 0;
            const dotColor = lerpColor(t);
            const hovered  = hoveredIdx === i;
            return (
              <div key={i}
                onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 8, cursor: 'default', marginBottom: 2,
                  background: hovered ? 'rgba(26,95,168,0.10)' : 'transparent',
                  border: hovered ? '1px solid rgba(26,95,168,0.25)' : '1px solid transparent',
                  transition: 'all 0.12s',
                }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}80`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                    <span style={{ fontSize: 10, color: palette.textMuted, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                    {isFirst && <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 3, background: 'rgba(26,95,168,0.20)', color: '#5b8fd4', letterSpacing: '0.08em' }}>START</span>}
                    {isLast  && <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 3, background: 'rgba(167,30,45,0.20)', color: '#d4626e', letterSpacing: '0.08em' }}>LĄDOWANIE</span>}
                  </div>
                  <div style={{ fontSize: 10, color: palette.textMuted, fontVariantNumeric: 'tabular-nums' }}>{p.lat.toFixed(5)}° N</div>
                  <div style={{ fontSize: 10, color: palette.textMuted, fontVariantNumeric: 'tabular-nums' }}>{p.lng.toFixed(5)}° E</div>
                </div>
                <Button type="text" size="small" danger onClick={() => onRemove(i)}
                  style={{ opacity: hovered ? 1 : 0.3, transition: 'opacity 0.15s', fontSize: 14, padding: '0 4px' }}
                  aria-label={`Usuń punkt ${i + 1}`}>×</Button>
              </div>
            );
          })
        )}
      </div>

      {points.length > 1 && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${palette.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Punkty nawigacyjne', value: String(points.length) },
            { label: 'Odcinki trasy', value: String(points.length - 1) },
            { label: 'Łączny dystans', value: formatDistance(dist), accent: true },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: palette.textMuted, letterSpacing: '0.06em' }}>{s.label}</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, color: s.accent ? lerpColor(0.35) : palette.text, fontVariantNumeric: 'tabular-nums' }}>{s.value}</Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

interface ToastState {
  msg: string;
  type: 'info' | 'success' | 'error';
}

export default function TrasyLotowPage() {
  const [points, setPoints]         = useState<LatLng[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast]           = useState<ToastState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchRef     = useRef<{ x: number; y: number; center: LatLng; moved: boolean } | null>(null);

  const map = useSlippyMap(points);

  const showToast = useCallback((msg: string, type: ToastState['type'] = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleMapClick = useCallback((e: React.MouseEvent) => {
    if (map.wasDrag()) return;
    const rect = map.mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { lat, lng } = pixelToLatLng(
      e.clientX - rect.left, e.clientY - rect.top,
      map.zoom, map.mapSize.width, map.mapSize.height, map.center.lat, map.center.lng,
    );
    setPoints(prev => [...prev, { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }]);
  }, [map]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, center: { ...map.center }, moved: false };
  }, [map.center]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !touchRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchRef.current.moved = true;
    const { lat, lng } = pixelToLatLng(
      map.mapSize.width / 2 - dx, map.mapSize.height / 2 - dy,
      map.zoom, map.mapSize.width, map.mapSize.height,
      touchRef.current.center.lat, touchRef.current.center.lng,
    );
    map.setCenter({ lat, lng });
  }, [map]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current?.moved && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const rect = map.mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { lat, lng } = pixelToLatLng(
        t.clientX - rect.left, t.clientY - rect.top,
        map.zoom, map.mapSize.width, map.mapSize.height, map.center.lat, map.center.lng,
      );
      setPoints(prev => [...prev, { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }]);
    }
    touchRef.current = null;
  }, [map]);

  const saveToFile = useCallback(() => {
    if (points.length === 0) { showToast('Brak punktów do zapisania', 'error'); return; }
    const payload = {
      version: '1.0', app: 'LotyAdmin – Trasy lotów',
      created: new Date().toISOString(), count: points.length,
      totalDistanceKm: points.length > 1 ? +totalDistance(points).toFixed(3) : 0,
      points: points.map((p, i) => ({ id: i + 1, lat: p.lat, lng: p.lng })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `trasa_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Zapisano ${points.length} punkt${points.length === 1 ? '' : 'ów'}`, 'success');
  }, [points, showToast]);

  const loadFromFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        let loaded: LatLng[] = Array.isArray(raw) ? raw : Array.isArray(raw.points) ? raw.points : null!;
        if (!loaded) throw new Error('Nieznany format pliku');
        loaded = loaded
          .filter((p): p is LatLng => p != null && typeof p.lat === 'number' && typeof p.lng === 'number')
          .map(p => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
        if (loaded.length === 0) throw new Error('Plik nie zawiera prawidłowych punktów');
        setPoints(loaded);
        map.scheduleFitBounds(loaded);
        showToast(`Wczytano ${loaded.length} punkt${loaded.length === 1 ? '' : 'ów'}`, 'success');
      } catch (err) { showToast('Błąd: ' + (err instanceof Error ? err.message : 'Nieznany'), 'error'); }
    };
    reader.readAsText(file); e.target.value = '';
  }, [showToast, map]);

  const removePoint = useCallback((idx: number) => { setPoints(prev => prev.filter((_, i) => i !== idx)); map.setHoveredIdx(null); }, [map]);
  const clearAll    = useCallback(() => { setPoints([]); showToast('Trasa wyczyszczona'); }, [showToast]);

  const renderExtraDot = useCallback((i: number, p: Pixel, { color, hov, isFirst, isLast }: { color: string; hov: boolean; isFirst: boolean; isLast: boolean }) => {
    if (isFirst || isLast || !hov) return null;
    return (
      <text x={p.x + 10} y={p.y - 7} fill={color} fontSize="8"
        fontFamily="'DM Sans', sans-serif" fillOpacity="0.85">
        {String(i + 1).padStart(2, '0')}
      </text>
    );
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px)', gap: 0 }}>

      <PageHeader
        icon={<RouteIcon size={22} style={{ color: '#fff' }} />}
        gradient={gradients.brand}
        title="Trasy lotów"
        subtitle="Planuj i zapisuj trasy lotów — kliknij na mapie, aby dodać punkt nawigacyjny"
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}
              style={{ borderColor: palette.border, color: palette.textMuted }}>Wczytaj trasę</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={saveToFile}
              disabled={points.length === 0}
              style={{ background: points.length > 0 ? `linear-gradient(90deg, ${palette.brandBlue} 0%, ${palette.brandRed} 100%)` : undefined, border: 'none' }}>
              Zapisz trasę
            </Button>
            <Tooltip title={sidebarOpen ? 'Ukryj panel punktów' : 'Pokaż panel punktów'}>
              <Badge count={!sidebarOpen && points.length > 0 ? points.length : 0} size="small">
                <Button icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setSidebarOpen(v => !v)} style={{ borderColor: palette.border, color: palette.textMuted }} />
              </Badge>
            </Tooltip>
          </div>
        }
      />

      <Card
        styles={{ body: { padding: 0, height: '100%', display: 'flex', overflow: 'hidden' } }}
        style={{ flex: 1, borderRadius: radii.xl, border: `1px solid ${palette.border}`, background: palette.bgBase, overflow: 'hidden', minHeight: 0 }}>

        <div ref={map.mapRef} style={{
          flex: 1, position: 'relative', overflow: 'hidden', background: '#0a1520',
          cursor: map.isDragging ? 'grabbing' : 'crosshair',
        }}
          onClick={handleMapClick}
          onMouseDown={map.handleMouseDown} onMouseMove={map.handleMouseMove}
          onMouseUp={map.handleMouseUp} onMouseLeave={map.handleMouseUp}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        >
          <MapTiles zoom={map.zoom} centerLat={map.center.lat} centerLng={map.center.lng}
            mapWidth={map.mapSize.width} mapHeight={map.mapSize.height} />

          <MapOverlay idPrefix="tl"
            polyPixels={map.polyPixels} points={points}
            width={map.mapSize.width} height={map.mapSize.height}
            hoveredIdx={map.hoveredIdx} onHover={map.setHoveredIdx}
            renderExtraDot={renderExtraDot} />

          <MapControls zoom={map.zoom} center={map.center} dist={map.dist}
            onZoomIn={map.zoomIn} onZoomOut={map.zoomOut}>
            <Tooltip title="Wyśrodkuj na Polsce">
              <button onClick={e => { e.stopPropagation(); map.resetView(); }}
                aria-label="Wyśrodkuj na Polsce"
                style={{
                  position: 'absolute', right: 14, bottom: 120,
                  width: 32, height: 32, background: `${palette.bgBase}cc`, border: `1px solid ${palette.border}`,
                  color: palette.textMuted, cursor: 'pointer', borderRadius: radii.sm,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
                }}>
                <AimOutlined style={{ fontSize: 14 }} />
              </button>
            </Tooltip>
          </MapControls>

          {points.length === 0 && map.mapReady && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 5, textAlign: 'center' }}>
              <div style={{ background: `${palette.bgBase}e0`, border: `1px solid ${palette.border}`, borderRadius: radii.lg, padding: '18px 28px' }}>
                <RouteIcon size={28} style={{ color: palette.textFaint, display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 12, color: palette.textDimmed, letterSpacing: '0.12em', fontWeight: 600 }}>KLIKNIJ NA MAPIE</div>
                <div style={{ fontSize: 10, color: palette.textFaint, marginTop: 4 }}>aby dodać punkt nawigacyjny trasy</div>
              </div>
            </div>
          )}
        </div>

        <PointsSidebar points={points} hoveredIdx={map.hoveredIdx} onHover={map.setHoveredIdx}
          onRemove={removePoint} onClear={clearAll} dist={map.dist} open={sidebarOpen} />
      </Card>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={loadFromFile} />

      {toast && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 22px', borderRadius: radii.md, border: '1px solid',
          fontSize: 12, letterSpacing: '0.06em', zIndex: 2000, pointerEvents: 'none', whiteSpace: 'nowrap',
          background: toast.type === 'error' ? palette.errorBg : toast.type === 'success' ? palette.infoBg : palette.bgBase,
          borderColor: toast.type === 'error' ? palette.errorBorder : palette.brandBlue,
          color: toast.type === 'error' ? palette.errorText : palette.infoText,
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
