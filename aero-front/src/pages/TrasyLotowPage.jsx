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

const { Text } = Typography;

// ── Sidebar z listą punktów ─────────────────────────────────────

function PointsSidebar({ points, hoveredIdx, onHover, onRemove, onClear, dist, open }) {
  return (
    <div style={{
      width: open ? 270 : 0, minWidth: open ? 270 : 0,
      overflow: 'hidden', transition: 'width 0.22s ease, min-width 0.22s ease',
      background: '#0f1e30', borderLeft: open ? '1px solid #1e3a5c' : 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1e3a5c',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <Text style={{ fontSize: 11, letterSpacing: '0.12em', color: '#7a9abf', textTransform: 'uppercase' }}>
          Punkty trasy
        </Text>
        {points.length > 0 && (
          <Tooltip title="Wyczyść trasę">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onClear} />
          </Tooltip>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {points.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#1e3a5c', fontSize: 12, lineHeight: 2, fontStyle: 'italic' }}>
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
                    <span style={{ fontSize: 10, color: '#7a9abf', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                    {isFirst && <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 3, background: 'rgba(26,95,168,0.20)', color: '#5b8fd4', letterSpacing: '0.08em' }}>START</span>}
                    {isLast  && <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 3, background: 'rgba(167,30,45,0.20)', color: '#d4626e', letterSpacing: '0.08em' }}>LĄDOWANIE</span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#7a9abf', fontVariantNumeric: 'tabular-nums' }}>{p.lat.toFixed(5)}° N</div>
                  <div style={{ fontSize: 10, color: '#7a9abf', fontVariantNumeric: 'tabular-nums' }}>{p.lng.toFixed(5)}° E</div>
                </div>
                <Button type="text" size="small" danger onClick={() => onRemove(i)}
                  style={{ opacity: hovered ? 1 : 0.3, transition: 'opacity 0.15s', fontSize: 14, padding: '0 4px' }}>×</Button>
              </div>
            );
          })
        )}
      </div>

      {points.length > 1 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e3a5c', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Punkty nawigacyjne', value: points.length },
            { label: 'Odcinki trasy',       value: points.length - 1 },
            { label: 'Łączny dystans',       value: formatDistance(dist), accent: true },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#7a9abf', letterSpacing: '0.06em' }}>{s.label}</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, color: s.accent ? lerpColor(0.35) : '#e8eef6', fontVariantNumeric: 'tabular-nums' }}>{s.value}</Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Główna strona ───────────────────────────────────────────────

export default function TrasyLotowPage() {
  const [points,      setPoints]      = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast,       setToast]       = useState(null);

  const fileInputRef = useRef(null);
  const toastTimer   = useRef(null);
  const touchRef     = useRef(null);

  const map = useSlippyMap(points);

  const showToast = useCallback((msg, type = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Click to add point ────────────────────────────────────────

  const handleMapClick = useCallback(e => {
    if (map.wasDrag()) return;
    const rect = map.mapRef.current.getBoundingClientRect();
    const { lat, lng } = pixelToLatLng(
      e.clientX - rect.left, e.clientY - rect.top,
      map.zoom, map.mapSize.width, map.mapSize.height, map.center.lat, map.center.lng,
    );
    setPoints(prev => [...prev, { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }]);
  }, [map]);

  // ── Touch ─────────────────────────────────────────────────────

  const handleTouchStart = useCallback(e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, center: { ...map.center }, moved: false };
  }, [map.center]);

  const handleTouchMove = useCallback(e => {
    if (e.touches.length !== 1 || !touchRef.current) return;
    e.preventDefault();
    const t  = e.touches[0];
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

  const handleTouchEnd = useCallback(e => {
    if (!touchRef.current?.moved && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const rect = map.mapRef.current.getBoundingClientRect();
      const { lat, lng } = pixelToLatLng(
        t.clientX - rect.left, t.clientY - rect.top,
        map.zoom, map.mapSize.width, map.mapSize.height, map.center.lat, map.center.lng,
      );
      setPoints(prev => [...prev, { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }]);
    }
    touchRef.current = null;
  }, [map]);

  // ── File I/O ──────────────────────────────────────────────────

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

  const loadFromFile = useCallback(e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target.result);
        let loaded = Array.isArray(raw) ? raw : Array.isArray(raw.points) ? raw.points : null;
        if (!loaded) throw new Error('Nieznany format pliku');
        loaded = loaded.filter(p => p != null && typeof p.lat === 'number' && typeof p.lng === 'number')
          .map(p => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
        if (loaded.length === 0) throw new Error('Plik nie zawiera prawidłowych punktów');
        setPoints(loaded);
        const avgLat = loaded.reduce((s, p) => s + p.lat, 0) / loaded.length;
        const avgLng = loaded.reduce((s, p) => s + p.lng, 0) / loaded.length;
        map.setCenter({ lat: avgLat, lng: avgLng }); map.setZoom(8);
        showToast(`Wczytano ${loaded.length} punkt${loaded.length === 1 ? '' : 'ów'}`, 'success');
      } catch (err) { showToast('Błąd: ' + err.message, 'error'); }
    };
    reader.readAsText(file); e.target.value = '';
  }, [showToast, map]);

  const removePoint = useCallback(idx => { setPoints(prev => prev.filter((_, i) => i !== idx)); map.setHoveredIdx(null); }, [map]);
  const clearAll    = useCallback(() => { setPoints([]); showToast('Trasa wyczyszczona'); }, [showToast]);

  // ── Extra dot rendering for editor (point numbers on hover) ───

  const renderExtraDot = useCallback((i, p, { color, hov, isFirst, isLast }) => {
    if (isFirst || isLast || !hov) return null;
    return (
      <text x={p.x + 10} y={p.y - 7} fill={color} fontSize="8"
        fontFamily="'DM Sans', sans-serif" fillOpacity="0.85">
        {String(i + 1).padStart(2, '0')}
      </text>
    );
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px)', gap: 0 }}>

      <PageHeader
        icon={<RouteIcon size={22} style={{ color: '#fff' }} />}
        gradient="linear-gradient(135deg, #1a5fa8 0%, #a71e2d 100%)"
        title="Trasy lotów"
        subtitle="Planuj i zapisuj trasy lotów — kliknij na mapie, aby dodać punkt nawigacyjny"
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}
              style={{ borderColor: '#1e3a5c', color: '#7a9abf' }}>Wczytaj trasę</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={saveToFile}
              disabled={points.length === 0}
              style={{ background: points.length > 0 ? 'linear-gradient(90deg, #1a5fa8 0%, #a71e2d 100%)' : undefined, border: 'none' }}>
              Zapisz trasę
            </Button>
            <Tooltip title={sidebarOpen ? 'Ukryj panel punktów' : 'Pokaż panel punktów'}>
              <Badge count={!sidebarOpen && points.length > 0 ? points.length : 0} size="small">
                <Button icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setSidebarOpen(v => !v)} style={{ borderColor: '#1e3a5c', color: '#7a9abf' }} />
              </Badge>
            </Tooltip>
          </div>
        }
      />

      <Card
        styles={{ body: { padding: 0, height: '100%', display: 'flex', overflow: 'hidden' } }}
        style={{ flex: 1, borderRadius: 16, border: '1px solid #1e3a5c', background: '#0f1e30', overflow: 'hidden', minHeight: 0 }}>

        {/* MAPA */}
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
            {/* Przycisk centruj na Polsce */}
            <Tooltip title="Wyśrodkuj na Polsce">
              <button onClick={e => { e.stopPropagation(); map.resetView(); }}
                style={{
                  position: 'absolute', right: 14, bottom: 120,
                  width: 32, height: 32, background: '#0f1e30cc', border: '1px solid #1e3a5c',
                  color: '#7a9abf', cursor: 'pointer', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
                }}>
                <AimOutlined style={{ fontSize: 14 }} />
              </button>
            </Tooltip>
          </MapControls>

          {/* Hint */}
          {points.length === 0 && map.mapReady && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 5, textAlign: 'center' }}>
              <div style={{ background: '#0f1e30e0', border: '1px solid #1e3a5c', borderRadius: 12, padding: '18px 28px' }}>
                <RouteIcon size={28} style={{ color: '#1e3a5c', display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 12, color: '#3a5a80', letterSpacing: '0.12em', fontWeight: 600 }}>KLIKNIJ NA MAPIE</div>
                <div style={{ fontSize: 10, color: '#1e3a5c', marginTop: 4 }}>aby dodać punkt nawigacyjny trasy</div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <PointsSidebar points={points} hoveredIdx={map.hoveredIdx} onHover={map.setHoveredIdx}
          onRemove={removePoint} onClear={clearAll} dist={map.dist} open={sidebarOpen} />
      </Card>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={loadFromFile} />

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 22px', borderRadius: 10, border: '1px solid',
          fontSize: 12, letterSpacing: '0.06em', zIndex: 2000, pointerEvents: 'none', whiteSpace: 'nowrap',
          background: toast.type === 'error' ? 'rgba(167,30,45,0.12)' : toast.type === 'success' ? 'rgba(26,95,168,0.14)' : '#0f1e30',
          borderColor: toast.type === 'error' ? '#a71e2d' : '#1a5fa8',
          color: toast.type === 'error' ? '#d4626e' : '#7ab4e0',
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
