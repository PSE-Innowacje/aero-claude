import React, { useState, useEffect } from 'react';
import { Typography } from 'antd';
import MapTiles from './MapTiles';
import MapOverlay from './MapOverlay';
import MapControls from './MapControls';
import RouteIcon from './RouteIcon';
import useSlippyMap from '../hooks/useSlippyMap';
import { formatDistance } from '../mapUtils';
import { lerpColor } from '../utils/colors';

const { Text } = Typography;

/**
 * TrasaMapWidget – read-only mapa trasy wczytanej z kmlZawartosc (format JSON).
 */
export default function TrasaMapWidget({ kmlZawartosc, height = 400 }) {
  const [points, setPoints] = useState([]);
  const [error,  setError]  = useState(null);

  const map = useSlippyMap(points);

  // ── Parsuj kmlZawartosc ────────────────────────────────────
  useEffect(() => {
    setError(null);
    setPoints([]);
    map.resetView();
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
      map.scheduleFitBounds(loaded);
    } catch (e) {
      setError(e.message);
    }
  }, [kmlZawartosc]);

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
                  {formatDistance(map.dist)}
                </Text>
              </>
            )}
          </div>

          {/* Mapa */}
          <div
            ref={map.mapRef}
            style={{
              position: 'relative', width: '100%', height,
              overflow: 'hidden', background: '#0a1520',
              cursor: map.isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
            onMouseDown={map.handleMouseDown}
            onMouseMove={map.handleMouseMove}
            onMouseUp={map.handleMouseUp}
            onMouseLeave={map.handleMouseUp}
          >
            <MapTiles zoom={map.zoom} centerLat={map.center.lat} centerLng={map.center.lng}
              mapWidth={map.mapSize.width} mapHeight={map.mapSize.height} />

            <MapOverlay idPrefix="tw"
              polyPixels={map.polyPixels} points={points}
              width={map.mapSize.width} height={map.mapSize.height}
              hoveredIdx={map.hoveredIdx} onHover={map.setHoveredIdx} />

            <MapControls zoom={map.zoom} center={map.center} dist={map.dist}
              onZoomIn={map.zoomIn} onZoomOut={map.zoomOut} />

            {points.length === 0 && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 5,
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
          </div>
        </div>
      )}
    </div>
  );
}
