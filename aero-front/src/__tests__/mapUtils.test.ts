import { describe, it, expect } from 'vitest';
import {
  latLngToWorld, worldToLatLng, latLngToPixel, pixelToLatLng,
  haversine, totalDistance, formatDistance,
} from '../mapUtils';

describe('latLngToWorld / worldToLatLng', () => {
  it('projects equator/prime meridian to center of world', () => {
    const { x, y } = latLngToWorld(0, 0, 0);
    // Zoom 0: world is 256x256 px. (0,0) → center
    expect(x).toBeCloseTo(128, 0);
    expect(y).toBeCloseTo(128, 0);
  });

  it('roundtrips through world coordinates', () => {
    const lat = 52.237, lng = 21.017, zoom = 10;
    const world = latLngToWorld(lat, lng, zoom);
    const back = worldToLatLng(world.x, world.y, zoom);
    expect(back.lat).toBeCloseTo(lat, 3);
    expect(back.lng).toBeCloseTo(lng, 3);
  });
});

describe('latLngToPixel / pixelToLatLng', () => {
  it('center of map projects to center pixel', () => {
    const px = latLngToPixel(52.0, 21.0, 10, 800, 600, 52.0, 21.0);
    expect(px.x).toBeCloseTo(400, 0); // mapW/2
    expect(px.y).toBeCloseTo(300, 0); // mapH/2
  });

  it('roundtrips pixel↔latLng', () => {
    const centerLat = 52.237, centerLng = 21.017;
    const zoom = 12, mapW = 1024, mapH = 768;

    // Project a point, then unproject it
    const px = latLngToPixel(52.25, 21.05, zoom, mapW, mapH, centerLat, centerLng);
    const back = pixelToLatLng(px.x, px.y, zoom, mapW, mapH, centerLat, centerLng);
    expect(back.lat).toBeCloseTo(52.25, 3);
    expect(back.lng).toBeCloseTo(21.05, 3);
  });
});

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine({ lat: 52.0, lng: 21.0 }, { lat: 52.0, lng: 21.0 })).toBe(0);
  });

  it('calculates Warszawa → Kraków ≈ 252 km', () => {
    const warszawa = { lat: 52.2297, lng: 21.0122 };
    const krakow   = { lat: 50.0647, lng: 19.9450 };
    const dist = haversine(warszawa, krakow);
    expect(dist).toBeGreaterThan(245);
    expect(dist).toBeLessThan(260);
  });

  it('calculates antipodal points ≈ 20000 km', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 180 };
    const dist = haversine(a, b);
    expect(dist).toBeGreaterThan(19900);
    expect(dist).toBeLessThan(20100);
  });
});

describe('totalDistance', () => {
  it('returns 0 for single point', () => {
    expect(totalDistance([{ lat: 52.0, lng: 21.0 }])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(totalDistance([])).toBe(0);
  });

  it('sums segment distances', () => {
    const points = [
      { lat: 52.0, lng: 21.0 },
      { lat: 52.1, lng: 21.0 },
      { lat: 52.2, lng: 21.0 },
    ];
    const total = totalDistance(points);
    const seg1 = haversine(points[0], points[1]);
    const seg2 = haversine(points[1], points[2]);
    expect(total).toBeCloseTo(seg1 + seg2, 6);
  });
});

describe('formatDistance', () => {
  it('formats km', () => {
    expect(formatDistance(12.345)).toBe('12.35 km');
    expect(formatDistance(1)).toBe('1.00 km');
  });

  it('formats meters for < 1 km', () => {
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.123)).toBe('123 m');
  });
});
