import React, { type ReactNode } from 'react';
import { formatDistance } from '../mapUtils';
import { lerpColor } from '../utils/colors';
import { palette, radii } from '../theme';
import type { LatLng } from '../types/api';

interface MapControlsProps {
  zoom: number;
  center: LatLng;
  dist: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  children?: ReactNode;
}

const btnStyle: React.CSSProperties = {
  width: 32, height: 32,
  background: `${palette.bgBase}cc`, border: `1px solid ${palette.border}`,
  color: palette.textMuted, fontSize: 18, cursor: 'pointer',
  borderRadius: radii.sm, display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
};

export default function MapControls({ zoom, center, dist, onZoomIn, onZoomOut, children }: MapControlsProps) {
  return (
    <>
      <div style={{
        position: 'absolute', right: 14, bottom: 40,
        display: 'flex', flexDirection: 'column', gap: 2, zIndex: 5,
      }}>
        {[{ label: '+', fn: onZoomIn, ariaLabel: 'Przybliż' }, { label: '−', fn: onZoomOut, ariaLabel: 'Oddal' }].map(({ label, fn, ariaLabel }) => (
          <button key={label}
            onClick={e => { e.stopPropagation(); fn(); }}
            style={btnStyle}
            aria-label={ariaLabel}
          >{label}</button>
        ))}
      </div>

      {children}

      <div style={{
        position: 'absolute', left: 10, bottom: 10, zIndex: 5,
        background: `${palette.bgBase}cc`, border: `1px solid ${palette.border}`,
        padding: '3px 10px', borderRadius: radii.sm,
        fontSize: 10, color: palette.textMuted, letterSpacing: '0.07em',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <span>ZOOM {zoom}</span>
        <span style={{ color: palette.textFaint }}>·</span>
        <span>{center.lat.toFixed(4)}°N {center.lng.toFixed(4)}°E</span>
        {dist > 0 && (
          <>
            <span style={{ color: palette.textFaint }}>·</span>
            <span style={{ color: lerpColor(0.35), fontWeight: 600 }}>{formatDistance(dist)}</span>
          </>
        )}
      </div>

      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
        style={{
          position: 'absolute', right: 5, bottom: 5,
          fontSize: 9, color: palette.textDimmed, textDecoration: 'none', zIndex: 5,
        }}>
        © OpenStreetMap
      </a>
    </>
  );
}
