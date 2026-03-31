import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography } from 'antd';
import MapTiles from './MapTiles';
import { latLngToPixel, latLngToWorld, pixelToLatLng, totalDistance, formatDistance } from '../mapUtils';

const { Text } = Typography;

const DEFAULT_CENTER = { lat: 52.237049, lng: 21.017532 };
const DEFAULT_ZOOM   = 6;

const PSE_BLUE = [26,  95, 168];
const PSE_RED  = [167, 30,  45];
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function lerpColor(t) {
  return `rgb(${lerp(PSE_BLUE[0], PSE_RED[0], t)},${lerp(PSE_BLUE[1], PSE_RED[1], t)},${lerp(PSE_BLUE[2], PSE_RED[2], t)})`;
}

function RouteIcon({ size = 20, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={style}>
      <circle cx="5"  cy="5"  r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M5 7v3a5 5 0 0 0 5 5h4a5 5 0 0 1 5 5" />
    </svg>
  );
}

/**
 * TrasaMapWidget – read-only mapa trasy wczytanej z kmlZawartosc (format JSON).
 * Props:
 *   kmlZawartosc  {string|null}  – treść JSON z polami { points: [{lat, lng}] }
 *   height        {number}       – wysokość mapy w px (domyślnie 400)
 */
export default function TrasaMapWidget({ kmlZawartosc, height = 400 }) {
  const [points,     setPoints]     = useState([]);
  const [zoom,       setZoom]       = useState(DEFAULT_ZOOM);
  const [center,     setCenter]     = useState(DEFAULT_CENTER);
  const [mapSize,    setMapSize]    = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart]  = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [mapReady,   setMapReady]   = useState(false);
  const [error,      setError]      = useState(null);

  const mapRef      = useRef(null);
  const dragMoved   = useRef(false);
  const pendingFit  = useRef(null);  // punkty czekające na fitBounds po poznaniu rozmiaru mapy

  // ── Parsuj kmlZawartosc przy zmianie rekordu ──────────────────
  useEffect(() => {
    setError(null);
    setPoints([]);
    setZoom(DEFAULT_ZOOM);
    setCenter(DEFAULT_CENTER);
    if (!kmlZawartosc) return;
    try {
      const raw = JSON.parse(kmlZawartosc);
      const pts = Array.isArray(raw) ? raw
                : Array.isArray(raw.points) ? raw.points
                : null;
      if (!pts || pts.length === 0) throw new Error('Brak punktów w danych trasy.');
      const loaded = pts
        .filter(p => p != null && typeof p.lat === 'number' && typeof p.lng === 'number')
        .map(p => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
      if (loaded.length === 0) throw new Error('Punkty trasy mają nieprawidłowy format.');
      setPoints(loaded);
      pendingFit.current = loaded;  // uruchom fit gdy mapa pozna swój rozmiar
    } catch (e) {
      setError(e.message);
    }
  }, [kmlZawartosc]);

  // ── ResizeObserver – identycznie jak w TrasyLotowPage ─────────
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

  // ── fitBounds – dopasuj zoom i centrum do bounding box punktów ──
  const fitBounds = useCallback((pts, w, h) => {
    if (!pts || pts.length === 0 || w === 0 || h === 0) return;
    if (pts.length === 1) {
      setCenter({ lat: pts[0].lat, lng: pts[0].lng });
      setZoom(12);
      return;
    }
    const PADDING = 48; // px margines z każdej strony
    const minLat = Math.min(...pts.map(p => p.lat));
    const maxLat = Math.max(...pts.map(p => p.lat));
    const minLng = Math.min(...pts.map(p => p.lng));
    const maxLng = Math.max(...pts.map(p => p.lng));
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    setCenter({ lat: centerLat, lng: centerLng });

    // Szukaj najwyższego zooma, przy którym cały bbox mieści się w (w-2*pad) x (h-2*pad)
    let bestZoom = 3;
    for (let z = 18; z >= 2; z--) {
      const ne = latLngToWorld(maxLat, maxLng, z);
      const sw = latLngToWorld(minLat, minLng, z);
      const bboxW = Math.abs(ne.x - sw.x);
      const bboxH = Math.abs(sw.y - ne.y);
      if (bboxW <= (w - PADDING * 2) && bboxH <= (h - PADDING * 2)) {
        bestZoom = z;
        break;
      }
    }
    setZoom(bestZoom);
  }, []);

  // Uruchom fitBounds gdy mapa jest gotowa i czekają punkty
  useEffect(() => {
    if (mapReady && pendingFit.current && mapSize.width > 0 && mapSize.height > 0) {
      fitBounds(pendingFit.current, mapSize.width, mapSize.height);
      pendingFit.current = null;
    }
  }, [mapReady, mapSize, fitBounds]);

  // ── Wheel – passive:false, identycznie jak w TrasyLotowPage ───
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

  // ── Drag (pan) ────────────────────────────────────────────────
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

  // ── Obliczenia ────────────────────────────────────────────────
  const polyPixels = points.map(p =>
    latLngToPixel(p.lat, p.lng, zoom, mapSize.width, mapSize.height, center.lat, center.lng)
  );
  const dist = points.length > 1 ? totalDistance(points) : 0;

  if (!kmlZawartosc) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {error ? (
        <div style={{
          padding: '14px 18px', borderRadius: 10,
          background: 'rgba(167,30,45,0.08)', border: '1px solid rgba(167,30,45,0.25)',
          color: '#d4626e', fontSize: 13,
        }}>
          ⚠ Nie można wyświetlić trasy: {error}
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1e3a5c', background: '#0f1e30' }}>

          {/* Pasek informacyjny */}
          <div style={{
            padding: '8px 16px', background: '#0d1b2a',
            borderBottom: '1px solid #1e3a5c',
            display: 'flex', gap: 20, alignItems: 'center',
          }}>
            <RouteIcon size={16} style={{ color: '#7a9abf', flexShrink: 0 }} />
            <Text style={{ fontSize: 11, color: '#7a9abf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Trasa lotu
            </Text>
            {points.length > 0 && (
              <>
                <Text style={{ fontSize: 12, color: '#e8eef6', fontVariantNumeric: 'tabular-nums' }}>
                  {points.length} pkt
                </Text>
                <Text style={{ fontSize: 12, color: lerpColor(0.35), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatDistance(dist)}
                </Text>
              </>
            )}
          </div>

          {/* Mapa */}
          <div
            ref={mapRef}
            style={{
              position: 'relative',
              width: '100%',
              height,
              overflow: 'hidden',
              background: '#0a1520',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Kafelki OSM */}
            <MapTiles
              zoom={zoom}
              centerLat={center.lat}
              centerLng={center.lng}
              mapWidth={mapSize.width}
              mapHeight={mapSize.height}
            />

            {/* SVG overlay */}
            <svg
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              width={mapSize.width}
              height={mapSize.height}
            >
              <defs>
                <filter id="tw-lineGlow">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="tw-dotGlow">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {polyPixels.length > 1 && (
                  <linearGradient id="tw-lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#1a5fa8" />
                    <stop offset="100%" stopColor="#a71e2d" />
                  </linearGradient>
                )}
              </defs>

              {polyPixels.length > 1 && (
                <polyline
                  points={polyPixels.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke="#1a5fa8" strokeWidth="6"
                  strokeOpacity="0.15" strokeLinejoin="round" strokeLinecap="round"
                  filter="url(#tw-lineGlow)"
                />
              )}
              {polyPixels.length > 1 && (
                <polyline
                  points={polyPixels.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke="url(#tw-lineGrad)" strokeWidth="2"
                  strokeOpacity="0.9" strokeLinejoin="round" strokeLinecap="round"
                  strokeDasharray="8 5"
                />
              )}

              {polyPixels.map((p, i) => {
                const t       = points.length > 1 ? i / (points.length - 1) : 0;
                const color   = lerpColor(t);
                const isFirst = i === 0;
                const isLast  = i === polyPixels.length - 1 && i !== 0;
                const hov     = hoveredIdx === i;
                return (
                  <g key={i} filter="url(#tw-dotGlow)"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{ pointerEvents: 'all', cursor: 'default' }}>
                    <circle cx={p.x} cy={p.y} r={hov ? 14 : 10}
                      fill="none" stroke={color} strokeWidth="1"
                      strokeOpacity={hov ? 0.6 : 0.25} />
                    <circle cx={p.x} cy={p.y} r={hov ? 6 : 4.5}
                      fill={color} fillOpacity={hov ? 1 : 0.9} />
                    {(isFirst || isLast) && (
                      <text x={p.x + 13} y={p.y - 8}
                        fill={color} fontSize="9"
                        fontFamily="'DM Sans', sans-serif"
                        fontWeight="700" letterSpacing="0.08em" fillOpacity="0.9">
                        {isFirst ? 'START' : 'LĄDOW.'}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hint – brak punktów */}
            {points.length === 0 && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                pointerEvents: 'none', textAlign: 'center', zIndex: 5,
              }}>
                <div style={{
                  background: '#0f1e30e0', border: '1px solid #1e3a5c',
                  borderRadius: 12, padding: '16px 24px',
                }}>
                  <div style={{ fontSize: 12, color: '#3a5a80', letterSpacing: '0.1em' }}>
                    Wczytywanie trasy…
                  </div>
                </div>
              </div>
            )}

            {/* Kontrolki zoom */}
            <div style={{
              position: 'absolute', right: 14, bottom: 40,
              display: 'flex', flexDirection: 'column', gap: 2, zIndex: 5,
            }}>
              {[{ l: '+', d: 1 }, { l: '−', d: -1 }].map(({ l, d }) => (
                <button key={l}
                  onClick={e => { e.stopPropagation(); setZoom(z => Math.max(2, Math.min(19, z + d))); }}
                  style={{
                    width: 32, height: 32,
                    background: '#0f1e30cc', border: '1px solid #1e3a5c',
                    color: '#7a9abf', fontSize: 18, cursor: 'pointer',
                    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >{l}</button>
              ))}
            </div>

            {/* Pasek statusu */}
            <div style={{
              position: 'absolute', left: 10, bottom: 10, zIndex: 5,
              background: '#0f1e30cc', border: '1px solid #1e3a5c',
              padding: '3px 10px', borderRadius: 6,
              fontSize: 10, color: '#7a9abf', letterSpacing: '0.07em',
              display: 'flex', gap: 8,
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
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
              style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 9, color: '#3a5070', textDecoration: 'none', zIndex: 5 }}>
              © OpenStreetMap
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
