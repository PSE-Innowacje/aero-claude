import { describe, it, expect } from 'vitest';
import {
  latLngToWorld,
  worldToLatLng,
  latLngToPixel,
  pixelToLatLng,
  haversine,
  totalDistance,
  formatDistance,
} from '../mapUtils';

describe('latLngToWorld / worldToLatLng', () => {
  it('are inverse operations', () => {
    const lat = 52.23;
    const lng = 21.01;
    const zoom = 10;
    const { x, y } = latLngToWorld(lat, lng, zoom);
    const back = worldToLatLng(x, y, zoom);
    expect(back.lat).toBeCloseTo(lat, 5);
    expect(back.lng).toBeCloseTo(lng, 5);
  });

  it('maps equator+prime-meridian to the centre of the world tile at zoom 0', () => {
    const { x, y } = latLngToWorld(0, 0, 0);
    expect(x).toBeCloseTo(128, 1);
    expect(y).toBeCloseTo(128, 1);
  });

  it('maps lng -180 to x ≈ 0 at zoom 0', () => {
    const { x } = latLngToWorld(0, -180, 0);
    expect(x).toBeCloseTo(0, 1);
  });

  it('maps lng +180 to x ≈ 256 at zoom 0', () => {
    const { x } = latLngToWorld(0, 180, 0);
    expect(x).toBeCloseTo(256, 1);
  });
});

describe('latLngToPixel / pixelToLatLng', () => {
  it('point at map centre returns pixel (mapW/2, mapH/2)', () => {
    const zoom = 12;
    const mapW = 800;
    const mapH = 600;
    const lat = 52.0;
    const lng = 20.0;
    const px = latLngToPixel(lat, lng, zoom, mapW, mapH, lat, lng);
    expect(px.x).toBeCloseTo(mapW / 2, 5);
    expect(px.y).toBeCloseTo(mapH / 2, 5);
  });

  it('are inverse operations', () => {
    const zoom = 10;
    const mapW = 800;
    const mapH = 600;
    const centerLat = 52.0;
    const centerLng = 21.0;
    const lat = 52.5;
    const lng = 21.5;
    const { x, y } = latLngToPixel(lat, lng, zoom, mapW, mapH, centerLat, centerLng);
    const back = pixelToLatLng(x, y, zoom, mapW, mapH, centerLat, centerLng);
    expect(back.lat).toBeCloseTo(lat, 5);
    expect(back.lng).toBeCloseTo(lng, 5);
  });
});

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 52.0, lng: 21.0 };
    expect(haversine(p, p)).toBe(0);
  });

  it('Warsaw → Kraków ≈ 252 km', () => {
    const warsaw = { lat: 52.2297, lng: 21.0122 };
    const krakow = { lat: 50.0647, lng: 19.945 };
    const dist = haversine(warsaw, krakow);
    expect(dist).toBeGreaterThan(245);
    expect(dist).toBeLessThan(260);
  });

  it('is symmetric', () => {
    const a = { lat: 52.0, lng: 21.0 };
    const b = { lat: 50.0, lng: 19.0 };
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 10);
  });
});

describe('totalDistance', () => {
  it('returns 0 for a single-point array', () => {
    expect(totalDistance([{ lat: 52, lng: 21 }])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(totalDistance([])).toBe(0);
  });

  it('equals sum of individual haversine segments', () => {
    const points = [
      { lat: 52.0, lng: 21.0 },
      { lat: 52.5, lng: 21.5 },
      { lat: 53.0, lng: 22.0 },
    ];
    const expected = haversine(points[0], points[1]) + haversine(points[1], points[2]);
    expect(totalDistance(points)).toBeCloseTo(expected, 10);
  });
});

describe('formatDistance', () => {
  it('formats values >= 1 km with two decimal places and "km" unit', () => {
    expect(formatDistance(1)).toBe('1.00 km');
    expect(formatDistance(252.5)).toBe('252.50 km');
  });

  it('formats values < 1 km in metres without decimals', () => {
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.123)).toBe('123 m');
  });

  it('boundary: exactly 1 km shows km', () => {
    expect(formatDistance(1)).toMatch(/km$/);
  });
});
