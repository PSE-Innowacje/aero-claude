import React, { useState, useEffect, useRef } from 'react';
import { Typography } from 'antd';
import MapTiles from './MapTiles';
import MapOverlay from './MapOverlay';
import MapControls from './MapControls';
import RouteIcon from './RouteIcon';
import useSlippyMap from '../hooks/useSlippyMap';
import { formatDistance } from '../mapUtils';
import { lerpColor } from '../utils/colors';
import { palette, radii } from '../theme';
import type { LatLng } from '../types/api';

const { Text } = Typography;

interface TrasaMapWidgetProps {
  kmlZawartosc: string | null | undefined;
  height?: number;
}

export default function TrasaMapWidget({ kmlZawartosc, height = 400 }: TrasaMapWidgetProps) {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [error, setError]   = useState<string | null>(null);

  const map = useSlippyMap(points);
  const prevKml = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Only re-parse when kmlZawartosc actually changes
    if (prevKml.current === kmlZawartosc) return;
    prevKml.current = kmlZawartosc;

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
        .filter((p: unknown) => p != null && typeof (p as LatLng).lat === 'number' && typeof (p as LatLng).lng === 'number')
        .map((p: LatLng) => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
      if (loaded.length === 0) throw new Error('Punkty trasy mają nieprawidłowy format.');
      setPoints(loaded);
      map.scheduleFitBounds(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    }
  }, [kmlZawartosc, map]);

  if (!kmlZawartosc) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {error ? (
        <div style={{
          padding: '14px 18px', borderRadius: radii.md,
          background: palette.errorBg, border: `1px solid rgba(167,30,45,0.25)`,
          color: palette.errorText, fontSize: 13,
        }}>
          ⚠ Nie można wyświetlić trasy: {error}
        </div>
      ) : (
        <div style={{ borderRadius: radii.lg, overflow: 'hidden', border: `1px solid ${palette.border}`, background: palette.bgBase }}>
          <div style={{
            padding: '8px 16px', background: '#0d1b2a',
            borderBottom: `1px solid ${palette.border}`,
            display: 'flex', gap: 20, alignItems: 'center',
          }}>
            <RouteIcon size={16} style={{ color: palette.textMuted, flexShrink: 0 }} />
            <Text style={{ fontSize: 11, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Trasa lotu
            </Text>
            {points.length > 0 && (
              <>
                <Text style={{ fontSize: 12, color: palette.text, fontVariantNumeric: 'tabular-nums' }}>
                  {points.length} pkt
                </Text>
                <Text style={{ fontSize: 12, color: lerpColor(0.35), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatDistance(map.dist)}
                </Text>
              </>
            )}
          </div>

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
                  background: `${palette.bgBase}e0`, border: `1px solid ${palette.border}`,
                  borderRadius: radii.lg, padding: '16px 24px',
                }}>
                  <div style={{ fontSize: 12, color: palette.textDimmed, letterSpacing: '0.1em' }}>
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
