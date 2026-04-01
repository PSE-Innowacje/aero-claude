import React from 'react';

/**
 * Ikona trasy (SVG inline) — używana w mapie i sidebarze.
 */
export default function RouteIcon({ size = 22, style }) {
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
