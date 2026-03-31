import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Typography, Card, Tooltip, Badge } from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  AimOutlined,
  ColumnWidthOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

import MapTiles from '../components/MapTiles';
import { latLngToPixel, pixelToLatLng, totalDistance, formatDistance } from '../mapUtils';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;

const DEFAULT_CENTER = { lat: 52.237049, lng: 21.017532 }; // Warszawa
const DEFAULT_ZOOM   = 6;

// ── Kolory PSE ──────────────────────────────────────────────────
const PSE_BLUE = [26,  95, 168];
const PSE_RED  = [167, 30,  45];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}
function lerpColor(t) {
  return `rgb(${lerp(PSE_BLUE[0], PSE_RED[0], t)},${lerp(PSE_BLUE[1], PSE_RED[1], t)},${lerp(PSE_BLUE[2], PSE_RED[2], t)})`;
}

// ── Ikona routy (SVG inline) ────────────────────────────────────
function RouteIcon({ size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >
      <circle cx="5"  cy="5"  r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M5 7v3a5 5 0 0 0 5 5h4a5 5 0 0 1 5 5" />
    </svg>
  );
}

// ── Sidebar z listą punktów ─────────────────────────────────────
function PointsSidebar({ points, hoveredIdx, onHover, onRemove, onClear, dist, open }) {
  return (
    <div style={{
      width: open ? 270 : 0,
      minWidth: open ? 270 : 0,
      overflow: 'hidden',
      transition: 'width 0.22s ease, min-width 0.22s ease',
      background: '#0f1e30',
      borderLeft: open ? '1px solid #1e3a5c' : 'none',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header sidebara */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1e3a5c',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <Text style={{ fontSize: 11, letterSpacing: '0.12em', color: '#7a9abf', textTransform: 'uppercase' }}>
          Punkty trasy
        </Text>
        {points.length > 0 && (
          <Tooltip title="Wyczyść trasę">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={onClear}
              style={{ fontSize: 12 }}
            />
          </Tooltip>
        )}
      </div>

      {/* Lista punktów */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {points.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#1e3a5c',
            fontSize: 12,
            lineHeight: 2,
            fontStyle: 'italic',
          }}>
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
              <div
                key={i}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 8,
                  cursor: 'default',
                  background: hovered ? 'rgba(26,95,168,0.10)' : 'transparent',
                  border: hovered ? '1px solid rgba(26,95,168,0.25)' : '1px solid transparent',
                  transition: 'all 0.12s',
                  marginBottom: 2,
                }}
              >
                {/* Dot */}
                <div style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 6px ${dotColor}80`,
                  flexShrink: 0,
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                    <span style={{ fontSize: 10, color: '#7a9abf', fontWeight: 600 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {isFirst && (
                      <span style={{
                        fontSize: 9, padding: '0 5px', borderRadius: 3,
                        background: 'rgba(26,95,168,0.20)', color: '#5b8fd4',
                        letterSpacing: '0.08em',
                      }}>START</span>
                    )}
                    {isLast && (
                      <span style={{
                        fontSize: 9, padding: '0 5px', borderRadius: 3,
                        background: 'rgba(167,30,45,0.20)', color: '#d4626e',
                        letterSpacing: '0.08em',
                      }}>LĄDOWANIE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#7a9abf', fontVariantNumeric: 'tabular-nums' }}>
                    {p.lat.toFixed(5)}° N
                  </div>
                  <div style={{ fontSize: 10, color: '#7a9abf', fontVariantNumeric: 'tabular-nums' }}>
                    {p.lng.toFixed(5)}° E
                  </div>
                </div>

                {/* Usuń */}
                <Button
                  type="text"
                  size="small"
                  danger
                  onClick={() => onRemove(i)}
                  style={{ opacity: hovered ? 1 : 0.3, transition: 'opacity 0.15s', fontSize: 14, padding: '0 4px' }}
                >×</Button>
              </div>
            );
          })
        )}
      </div>

      {/* Statystyki */}
      {points.length > 1 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #1e3a5c',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {[
            { label: 'Punkty nawigacyjne', value: points.length },
            { label: 'Odcinki trasy',       value: points.length - 1 },
            { label: 'Łączny dystans',       value: formatDistance(dist), accent: true },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#7a9abf', letterSpacing: '0.06em' }}>{s.label}</Text>
              <Text style={{
                fontSize: 11, fontWeight: 600,
                color: s.accent ? lerpColor(0.35) : '#e8eef6',
                fontVariantNumeric: 'tabular-nums',
              }}>{s.value}</Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Główna strona ───────────────────────────────────────────────
export default function TrasyLotowPage() {
  const [points,     setPoints]     = useState([]);
  const [zoom,       setZoom]       = useState(DEFAULT_ZOOM);
  const [center,     setCenter]     = useState(DEFAULT_CENTER);
  const [mapSize,    setMapSize]    = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart]  = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [sidebarOpen,setSidebarOpen]= useState(true);
  const [mapReady,   setMapReady]   = useState(false);
  const [toast,      setToast]      = useState(null);

  const mapRef      = useRef(null);
  const fileInputRef= useRef(null);
  const dragMoved   = useRef(false);
  const toastTimer  = useRef(null);

  // Observe map size
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setMapSize({ width: e.contentRect.width, height: e.contentRect.height });
        if (!mapReady && e.contentRect.width > 0) setMapReady(true);
      }
    });
    if (mapRef.current) obs.observe(mapRef.current);
    return () => obs.disconnect();
  }, [mapReady]);

  // Blokuj scroll strony nad mapą
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const handler = e => {
      e.preventDefault();
      setZoom(z => Math.max(2, Math.min(19, z + (e.deltaY < 0 ? 1 : -1))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const showToast = useCallback((msg, type = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Interakcje z mapą ─────────────────────────────────────────

  const handleMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    dragMoved.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, center: { ...center } });
  }, [center]);

  const handleMouseMove = useCallback(e => {
    if (!isDragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
    const { lat, lng } = pixelToLatLng(
      mapSize.width / 2 - dx, mapSize.height / 2 - dy,
      zoom, mapSize.width, mapSize.height,
      dragStart.center.lat, dragStart.center.lng,
    );
    setCenter({ lat, lng });
  }, [isDragging, dragStart, zoom, mapSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMapClick = useCallback(e => {
    if (dragMoved.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const { lat, lng } = pixelToLatLng(
      e.clientX - rect.left, e.clientY - rect.top,
      zoom, mapSize.width, mapSize.height, center.lat, center.lng,
    );
    setPoints(prev => [...prev, { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }]);
  }, [zoom, mapSize, center]);

  // Touch
  const touchRef = useRef(null);
  const handleTouchStart = useCallback(e => {
    if (e.touches.length !== 1) return;
    dragMoved.current = false;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, center: { ...center } };
  }, [center]);

  const handleTouchMove = useCallback(e => {
    if (e.touches.length !== 1 || !touchRef.current) return;
    e.preventDefault();
    const t  = e.touches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
    const { lat, lng } = pixelToLatLng(
      mapSize.width / 2 - dx, mapSize.height / 2 - dy,
      zoom, mapSize.width, mapSize.height,
      touchRef.current.center.lat, touchRef.current.center.lng,
    );
    setCenter({ lat, lng });
  }, [zoom, mapSize]);

  const handleTouchEnd = useCallback(e => {
    if (!dragMoved.current && touchRef.current && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const rect = mapRef.current.getBoundingClientRect();
      const { lat, lng } = pixelToLatLng(
        t.clientX - rect.left, t.clientY - rect.top,
        zoom, mapSize.width, mapSize.height, center.lat, center.lng,
      );
      setPoints(prev => [...prev, { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }]);
    }
    touchRef.current = null;
  }, [zoom, mapSize, center]);

  // ── Operacje na danych ────────────────────────────────────────

  const saveToFile = useCallback(() => {
    if (points.length === 0) { showToast('Brak punktów do zapisania', 'error'); return; }
    const payload = {
      version: '1.0',
      app: 'LotyAdmin – Trasy lotów',
      created: new Date().toISOString(),
      count: points.length,
      totalDistanceKm: points.length > 1 ? +totalDistance(points).toFixed(3) : 0,
      points: points.map((p, i) => ({ id: i + 1, lat: p.lat, lng: p.lng })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `trasa_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
        loaded = loaded
          .filter(p => p != null && typeof p.lat === 'number' && typeof p.lng === 'number')
          .map(p => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
        if (loaded.length === 0) throw new Error('Plik nie zawiera prawidłowych punktów');
        setPoints(loaded);
        const avgLat = loaded.reduce((s, p) => s + p.lat, 0) / loaded.length;
        const avgLng = loaded.reduce((s, p) => s + p.lng, 0) / loaded.length;
        setCenter({ lat: avgLat, lng: avgLng });
        setZoom(8);
        showToast(`Wczytano ${loaded.length} punkt${loaded.length === 1 ? '' : 'ów'}`, 'success');
      } catch (err) {
        showToast('Błąd: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [showToast]);

  const removePoint = useCallback(idx => {
    setPoints(prev => prev.filter((_, i) => i !== idx));
    setHoveredIdx(null);
  }, []);

  const clearAll = useCallback(() => {
    setPoints([]);
    showToast('Trasa wyczyszczona');
  }, [showToast]);

  const centerOnPoland = useCallback(() => {
    setCenter(DEFAULT_CENTER);
    setZoom(DEFAULT_ZOOM);
  }, []);

  // ── Obliczenia ────────────────────────────────────────────────

  const polyPixels = points.map(p =>
    latLngToPixel(p.lat, p.lng, zoom, mapSize.width, mapSize.height, center.lat, center.lng)
  );
  const dist = points.length > 1 ? totalDistance(points) : 0;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px)', gap: 0 }}>

      {/* PageHeader */}
      <PageHeader
        icon={<RouteIcon size={22} style={{ color: '#fff' }} />}
        gradient="linear-gradient(135deg, #1a5fa8 0%, #a71e2d 100%)"
        title="Trasy lotów"
        subtitle="Planuj i zapisuj trasy lotów — kliknij na mapie, aby dodać punkt nawigacyjny"
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Wczytaj */}
            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
              style={{ borderColor: '#1e3a5c', color: '#7a9abf' }}
            >
              Wczytaj trasę
            </Button>

            {/* Zapisz */}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={saveToFile}
              disabled={points.length === 0}
              style={{
                background: points.length > 0
                  ? 'linear-gradient(90deg, #1a5fa8 0%, #a71e2d 100%)'
                  : undefined,
                border: 'none',
              }}
            >
              Zapisz trasę
            </Button>

            {/* Toggle sidebar */}
            <Tooltip title={sidebarOpen ? 'Ukryj panel punktów' : 'Pokaż panel punktów'}>
              <Badge count={!sidebarOpen && points.length > 0 ? points.length : 0} size="small">
                <Button
                  icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setSidebarOpen(v => !v)}
                  style={{ borderColor: '#1e3a5c', color: '#7a9abf' }}
                />
              </Badge>
            </Tooltip>
          </div>
        }
      />

      {/* Mapa + sidebar */}
      <Card
        styles={{ body: { padding: 0, height: '100%', display: 'flex', overflow: 'hidden' } }}
        style={{
          flex: 1,
          borderRadius: 16,
          border: '1px solid #1e3a5c',
          background: '#0f1e30',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── MAPA ── */}
        <div
          ref={mapRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#0a1520',
            cursor: isDragging ? 'grabbing' : 'crosshair',
          }}
          onClick={handleMapClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <MapTiles
            zoom={zoom}
            centerLat={center.lat}
            centerLng={center.lng}
            mapWidth={mapSize.width}
            mapHeight={mapSize.height}
          />

          {/* SVG overlay – linie i punkty */}
          <svg
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            width={mapSize.width}
            height={mapSize.height}
          >
            <defs>
              <filter id="tl-lineGlow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="tl-dotGlow">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* gradient wzdłuż trasy */}
              {polyPixels.length > 1 && (
                <linearGradient id="tl-lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#1a5fa8" />
                  <stop offset="100%" stopColor="#a71e2d" />
                </linearGradient>
              )}
            </defs>

            {/* Cień linii */}
            {polyPixels.length > 1 && (
              <polyline
                points={polyPixels.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#1a5fa8"
                strokeWidth="6"
                strokeOpacity="0.15"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#tl-lineGlow)"
              />
            )}
            {/* Linia trasy */}
            {polyPixels.length > 1 && (
              <polyline
                points={polyPixels.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="url(#tl-lineGrad)"
                strokeWidth="2"
                strokeOpacity="0.9"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="8 5"
              />
            )}

            {/* Punkty nawigacyjne */}
            {polyPixels.map((p, i) => {
              const t       = points.length > 1 ? i / (points.length - 1) : 0;
              const color   = lerpColor(t);
              const isFirst = i === 0;
              const isLast  = i === polyPixels.length - 1 && i !== 0;
              const hovered = hoveredIdx === i;

              return (
                <g key={i} filter="url(#tl-dotGlow)">
                  {/* Outer ring */}
                  <circle
                    cx={p.x} cy={p.y}
                    r={hovered ? 14 : 10}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    strokeOpacity={hovered ? 0.6 : 0.25}
                  />
                  {/* Inner dot */}
                  <circle
                    cx={p.x} cy={p.y}
                    r={hovered ? 6 : 4.5}
                    fill={color}
                    fillOpacity={hovered ? 1 : 0.90}
                  />
                  {/* Label START / LĄD */}
                  {(isFirst || isLast) && (
                    <text
                      x={p.x + 13} y={p.y - 8}
                      fill={color}
                      fontSize="9"
                      fontFamily="'DM Sans', sans-serif"
                      fontWeight="700"
                      letterSpacing="0.08em"
                      fillOpacity="0.9"
                    >
                      {isFirst ? 'START' : 'LĄDOW.'}
                    </text>
                  )}
                  {/* Numer punktu */}
                  {!isFirst && !isLast && hovered && (
                    <text
                      x={p.x + 10} y={p.y - 7}
                      fill={color}
                      fontSize="8"
                      fontFamily="'DM Sans', sans-serif"
                      fillOpacity="0.85"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Kontrolki zoom */}
          <div style={{
            position: 'absolute', right: 14, bottom: 52,
            display: 'flex', flexDirection: 'column', gap: 2, zIndex: 5,
          }}>
            {[{ l: '+', d: 1 }, { l: '−', d: -1 }].map(({ l, d }) => (
              <button
                key={l}
                onClick={e => { e.stopPropagation(); setZoom(z => Math.max(2, Math.min(19, z + d))); }}
                style={{
                  width: 32, height: 32,
                  background: '#0f1e30cc',
                  border: '1px solid #1e3a5c',
                  color: '#7a9abf',
                  fontSize: 18,
                  cursor: 'pointer',
                  borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}
              >{l}</button>
            ))}
          </div>

          {/* Przycisk centruj na Polsce */}
          <Tooltip title="Wyśrodkuj na Polsce">
            <button
              onClick={e => { e.stopPropagation(); centerOnPoland(); }}
              style={{
                position: 'absolute', right: 14, bottom: 120,
                width: 32, height: 32,
                background: '#0f1e30cc',
                border: '1px solid #1e3a5c',
                color: '#7a9abf',
                cursor: 'pointer',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 5,
              }}
            >
              <AimOutlined style={{ fontSize: 14 }} />
            </button>
          </Tooltip>

          {/* Pasek statusu */}
          <div style={{
            position: 'absolute', left: 10, bottom: 10,
            background: '#0f1e30cc',
            border: '1px solid #1e3a5c',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 10,
            color: '#7a9abf',
            letterSpacing: '0.07em',
            display: 'flex', gap: 8, alignItems: 'center',
            zIndex: 5,
          }}>
            <span>ZOOM {zoom}</span>
            <span style={{ color: '#1e3a5c' }}>·</span>
            <span>{center.lat.toFixed(4)}°N {center.lng.toFixed(4)}°E</span>
            {dist > 0 && (
              <>
                <span style={{ color: '#1e3a5c' }}>·</span>
                <span style={{ color: lerpColor(0.35), fontWeight: 600 }}>{formatDistance(dist)}</span>
              </>
            )}
          </div>

          {/* Attribution */}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            style={{
              position: 'absolute', right: 5, bottom: 5,
              fontSize: 9, color: '#3a5070',
              textDecoration: 'none', zIndex: 5,
            }}
          >© OpenStreetMap</a>

          {/* Hint – pusta mapa */}
          {points.length === 0 && mapReady && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 5, textAlign: 'center',
            }}>
              <div style={{
                background: '#0f1e30e0',
                border: '1px solid #1e3a5c',
                borderRadius: 12,
                padding: '18px 28px',
              }}>
                <RouteIcon size={28} style={{ color: '#1e3a5c', marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 12, color: '#3a5a80', letterSpacing: '0.12em', fontWeight: 600 }}>
                  KLIKNIJ NA MAPIE
                </div>
                <div style={{ fontSize: 10, color: '#1e3a5c', marginTop: 4 }}>
                  aby dodać punkt nawigacyjny trasy
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <PointsSidebar
          points={points}
          hoveredIdx={hoveredIdx}
          onHover={setHoveredIdx}
          onRemove={removePoint}
          onClear={clearAll}
          dist={dist}
          open={sidebarOpen}
        />
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={loadFromFile}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 22px',
          borderRadius: 10,
          border: '1px solid',
          fontSize: 12,
          letterSpacing: '0.06em',
          zIndex: 2000,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          background: toast.type === 'error'
            ? 'rgba(167,30,45,0.12)'
            : toast.type === 'success'
            ? 'rgba(26,95,168,0.14)'
            : '#0f1e30',
          borderColor: toast.type === 'error' ? '#a71e2d' : '#1a5fa8',
          color: toast.type === 'error' ? '#d4626e' : '#7ab4e0',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
