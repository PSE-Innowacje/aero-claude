import React, { useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { PSE_BLUE, PSE_RED, lerpColor } from '../utils/colors';
import { radii, fontFamily } from '../theme';

export interface NavItem {
  key?: string;
  icon?: ReactNode;
  label?: string;
  divider?: boolean;
  adminOnly?: boolean;
}

interface GradientMenuProps {
  items: NavItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export default function GradientMenu({ items, selectedKey, onSelect }: GradientMenuProps) {
  const navItems = items.filter((i): i is NavItem & { key: string } => Boolean(i.key));
  const total = navItems.length;

  const handleKeyDown = useCallback((e: KeyboardEvent, key: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(key);
    }
  }, [onSelect]);

  return (
    <nav style={{ padding: '4px 0', flex: 1 }} aria-label="Nawigacja główna">
      {items.map((item, globalIdx) => {
        if (item.divider) {
          return (
            <div key={`div-${globalIdx}`} style={{
              margin: '8px 16px', height: 1,
              background: 'rgba(255,255,255,0.10)',
            }} role="separator" />
          );
        }

        const navIdx = navItems.findIndex(n => n.key === item.key);
        const t = total > 1 ? navIdx / (total - 1) : 0;
        const color = lerpColor(t);
        const isSelected = selectedKey === item.key;

        const bgR = PSE_BLUE[0] + (PSE_RED[0] - PSE_BLUE[0]) * t;
        const bgG = PSE_BLUE[1] + (PSE_RED[1] - PSE_BLUE[1]) * t;
        const bgB = PSE_BLUE[2] + (PSE_RED[2] - PSE_BLUE[2]) * t;

        return (
          <div
            key={item.key}
            role="link"
            tabIndex={0}
            aria-current={isSelected ? 'page' : undefined}
            onClick={() => onSelect(item.key!)}
            onKeyDown={e => handleKeyDown(e, item.key!)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '2px 8px',
              padding: '9px 14px',
              borderRadius: radii.md,
              cursor: 'pointer',
              transition: 'background 0.18s, box-shadow 0.18s',
              background: isSelected
                ? `rgba(${bgR}, ${bgG}, ${bgB}, 0.22)`
                : 'transparent',
              border: isSelected
                ? `1px solid ${color}55`
                : '1px solid transparent',
              boxShadow: isSelected ? `0 0 12px ${color}30` : 'none',
              outline: 'none',
            }}
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
            }}
            onMouseLeave={e => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
            onFocus={e => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
            }}
            onBlur={e => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{
              color: '#ffffff',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              opacity: isSelected ? 1 : 0.75,
              transition: 'opacity 0.18s',
            }}>
              {item.icon}
            </span>

            <span style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: isSelected ? 700 : 500,
              fontFamily,
              letterSpacing: '0.01em',
              opacity: isSelected ? 1 : 0.75,
              transition: 'font-weight 0.1s, opacity 0.18s',
            }}>
              {item.label}
            </span>

            {isSelected && (
              <div style={{
                marginLeft: 'auto',
                width: 4, height: 16,
                borderRadius: 2,
                background: color,
                boxShadow: `0 0 6px ${color}`,
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
