import React, { type ReactNode } from 'react';
import { lerpColor } from '../utils/colors';
import type { Pixel, LatLng } from '../types/api';

interface RenderExtraDotInfo {
  color: string;
  hov: boolean;
  isFirst: boolean;
  isLast: boolean;
}

interface MapOverlayProps {
  idPrefix: string;
  polyPixels: Pixel[];
  points: LatLng[];
  width: number;
  height: number;
  hoveredIdx: number | null;
  onHover?: (idx: number | null) => void;
  interactive?: boolean;
  renderExtraDot?: (i: number, p: Pixel, info: RenderExtraDotInfo) => ReactNode;
}

export default function MapOverlay({
  idPrefix, polyPixels, points, width, height,
  hoveredIdx, onHover, interactive = true,
  renderExtraDot,
}: MapOverlayProps) {
  if (!width || !height) return null;

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={width}
      height={height}
      role="img"
      aria-label="Trasa lotu na mapie"
    >
      <defs>
        <filter id={`${idPrefix}-lineGlow`}>
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`${idPrefix}-dotGlow`}>
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {polyPixels.length > 1 && (
          <linearGradient id={`${idPrefix}-lineGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
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
          filter={`url(#${idPrefix}-lineGlow)`}
        />
      )}

      {polyPixels.length > 1 && (
        <polyline
          points={polyPixels.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke={`url(#${idPrefix}-lineGrad)`} strokeWidth="2"
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
          <g key={i} filter={`url(#${idPrefix}-dotGlow)`}
            onMouseEnter={interactive ? () => onHover?.(i) : undefined}
            onMouseLeave={interactive ? () => onHover?.(null) : undefined}
            style={interactive ? { pointerEvents: 'all', cursor: 'default' } : undefined}
          >
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
            {renderExtraDot?.(i, p, { color, hov, isFirst, isLast })}
          </g>
        );
      })}
    </svg>
  );
}
