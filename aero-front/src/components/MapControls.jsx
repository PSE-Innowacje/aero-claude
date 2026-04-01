import React from 'react';
import { formatDistance } from '../mapUtils';
import { lerpColor } from '../utils/colors';

/**
 * Kontrolki mapy: przyciski zoom, pasek statusu z koordynatami, attribution OSM.
 * Współdzielone między widgetem i edytorem tras.
 */
export default function MapControls({ zoom, center, dist, onZoomIn, onZoomOut, children }) {
  return (
    <>
      {/* Kontrolki zoom */}
      <div style={{
        position: 'absolute', right: 14, bottom: 40,
        display: 'flex', flexDirection: 'column', gap: 2, zIndex: 5,
      }}>
        {[{ l: '+', fn: onZoomIn }, { l: '−', fn: onZoomOut }].map(({ l, fn }) => (
          <button key={l}
            onClick={e => { e.stopPropagation(); fn(); }}
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

      {/* Dodatkowe przyciski (np. "Wyśrodkuj na Polsce") */}
      {children}

      {/* Pasek statusu */}
      <div style={{
        position: 'absolute', left: 10, bottom: 10, zIndex: 5,
        background: '#0f1e30cc', border: '1px solid #1e3a5c',
        padding: '3px 10px', borderRadius: 6,
        fontSize: 10, color: '#7a9abf', letterSpacing: '0.07em',
        display: 'flex', gap: 8, alignItems: 'center',
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
        style={{
          position: 'absolute', right: 5, bottom: 5,
          fontSize: 9, color: '#3a5070', textDecoration: 'none', zIndex: 5,
        }}>
        © OpenStreetMap
      </a>
    </>
  );
}
