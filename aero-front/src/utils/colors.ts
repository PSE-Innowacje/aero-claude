// ── Kolory PSE (Polskie Sieci Elektroenergetyczne) ───────────

export type RgbTuple = [number, number, number];

export const PSE_BLUE: RgbTuple = [26, 95, 168];   // #1a5fa8
export const PSE_RED: RgbTuple  = [167, 30, 45];    // #a71e2d

/** Interpolacja liniowa jednej wartości. */
export function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Interpoluje kolor PSE gradient (granat → czerwony) wg pozycji t ∈ [0, 1]. */
export function lerpColor(t: number): string {
  return `rgb(${lerp(PSE_BLUE[0], PSE_RED[0], t)},${lerp(PSE_BLUE[1], PSE_RED[1], t)},${lerp(PSE_BLUE[2], PSE_RED[2], t)})`;
}

/** Interpoluje kolor PSE i zwraca jako tablicę [r,g,b]. */
export function lerpColorRgb(t: number): RgbTuple {
  return [
    lerp(PSE_BLUE[0], PSE_RED[0], t),
    lerp(PSE_BLUE[1], PSE_RED[1], t),
    lerp(PSE_BLUE[2], PSE_RED[2], t),
  ];
}

/** Konwertuje tablicę [r,g,b] na string hex #rrggbb. */
export function toHex([r, g, b]: RgbTuple): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Generuje CSS gradient dla karty statystyk na dashboardzie. */
export function cardGradient(idx: number, total: number): string {
  const tStart = idx / total;
  const tEnd   = (idx + 1) / total;
  return `linear-gradient(90deg, ${toHex(lerpColorRgb(tStart))} 0%, ${toHex(lerpColorRgb(tEnd))} 100%)`;
}
