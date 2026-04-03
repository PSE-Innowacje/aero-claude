import { describe, it, expect } from 'vitest';
import { lerp, lerpColor, lerpColorRgb, toHex, cardGradient, PSE_BLUE, PSE_RED } from '../utils/colors';

describe('lerp', () => {
  it('returns a at t=0', () => expect(lerp(10, 50, 0)).toBe(10));
  it('returns b at t=1', () => expect(lerp(10, 50, 1)).toBe(50));
  it('returns midpoint at t=0.5', () => expect(lerp(10, 50, 0.5)).toBe(30));
  it('rounds to integer', () => expect(lerp(0, 7, 0.5)).toBe(4)); // 3.5 → 4
});

describe('lerpColor', () => {
  it('returns PSE blue at t=0', () => {
    expect(lerpColor(0)).toBe(`rgb(${PSE_BLUE[0]},${PSE_BLUE[1]},${PSE_BLUE[2]})`);
  });

  it('returns PSE red at t=1', () => {
    expect(lerpColor(1)).toBe(`rgb(${PSE_RED[0]},${PSE_RED[1]},${PSE_RED[2]})`);
  });

  it('returns rgb() string format', () => {
    expect(lerpColor(0.5)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });
});

describe('lerpColorRgb', () => {
  it('returns [r,g,b] tuple at t=0', () => {
    expect(lerpColorRgb(0)).toEqual(PSE_BLUE);
  });

  it('returns [r,g,b] tuple at t=1', () => {
    expect(lerpColorRgb(1)).toEqual(PSE_RED);
  });
});

describe('toHex', () => {
  it('converts [0,0,0] to #000000', () => expect(toHex([0, 0, 0])).toBe('#000000'));
  it('converts [255,255,255] to #ffffff', () => expect(toHex([255, 255, 255])).toBe('#ffffff'));
  it('converts PSE blue', () => expect(toHex(PSE_BLUE)).toBe('#1a5fa8'));
  it('converts PSE red', () => expect(toHex(PSE_RED)).toBe('#a71e2d'));
});

describe('cardGradient', () => {
  it('returns CSS linear-gradient string', () => {
    const g = cardGradient(0, 4);
    expect(g).toMatch(/^linear-gradient\(90deg, #[0-9a-f]{6} 0%, #[0-9a-f]{6} 100%\)$/);
  });

  it('first card starts with PSE blue', () => {
    const g = cardGradient(0, 4);
    expect(g).toContain('#1a5fa8');
  });

  it('last card ends with PSE red', () => {
    const g = cardGradient(3, 4);
    expect(g).toContain('#a71e2d');
  });

  it('adjacent cards share boundary color', () => {
    // Card 0 ends at t=0.25, Card 1 starts at t=0.25
    // End color of card 0 = start color of card 1
    const g0 = cardGradient(0, 4);
    const g1 = cardGradient(1, 4);
    const endColor0   = g0.match(/100%\)$/)?.[0] ? g0.split(' ').slice(-1)[0].replace(')', '') : '';
    const startColor1 = g1.match(/#[0-9a-f]{6}/)?.[0] ?? '';
    // Both use toHex(lerpColorRgb(0.25))
    expect(g0).toContain(startColor1);
  });
});
