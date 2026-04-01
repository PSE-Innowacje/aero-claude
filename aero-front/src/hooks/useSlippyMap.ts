import { useState, useCallback, useRef, useEffect, useMemo, type RefObject } from 'react';
import { latLngToPixel, latLngToWorld, pixelToLatLng, totalDistance } from '../mapUtils';
import type { LatLng, Pixel } from '../types/api';

interface MapSize {
  width: number;
  height: number;
}

interface DragStart {
  x: number;
  y: number;
  center: LatLng;
}

interface UseSlippyMapOptions {
  fitPadding?: number;
}

export interface UseSlippyMapReturn {
  mapRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  center: LatLng;
  mapSize: MapSize;
  isDragging: boolean;
  mapReady: boolean;
  hoveredIdx: number | null;
  setHoveredIdx: (idx: number | null) => void;
  setZoom: (z: number | ((prev: number) => number)) => void;
  setCenter: (c: LatLng) => void;
  polyPixels: Pixel[];
  dist: number;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  wasDrag: () => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitBounds: (pts: LatLng[], w: number, h: number) => void;
  scheduleFitBounds: (pts: LatLng[]) => void;
}

const DEFAULT_CENTER: LatLng = { lat: 52.237049, lng: 21.017532 };
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 2;
const MAX_ZOOM = 19;

export default function useSlippyMap(
  points: LatLng[],
  { fitPadding = 48 }: UseSlippyMapOptions = {}
): UseSlippyMapReturn {
  const [zoom, setZoom]           = useState(DEFAULT_ZOOM);
  const [center, setCenter]       = useState<LatLng>(DEFAULT_CENTER);
  const [mapSize, setMapSize]     = useState<MapSize>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mapReady, setMapReady]   = useState(false);

  const mapRef     = useRef<HTMLDivElement | null>(null);
  const dragMoved  = useRef(false);
  const pendingFit = useRef<LatLng[] | null>(null);

  const clampZoom = useCallback(
    (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)), []
  );

  // ── ResizeObserver ─────────────────────────────────────────

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setMapSize({ width: e.contentRect.width, height: e.contentRect.height });
        if (!mapReady && e.contentRect.width > 0) setMapReady(true);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [mapReady]);

  // ── Wheel zoom ─────────────────────────────────────────────

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => clampZoom(z + (e.deltaY < 0 ? 1 : -1)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [clampZoom]);

  // ── fitBounds ──────────────────────────────────────────────

  const fitBounds = useCallback((pts: LatLng[], w: number, h: number) => {
    if (!pts || pts.length === 0 || w === 0 || h === 0) return;
    if (pts.length === 1) {
      setCenter({ lat: pts[0].lat, lng: pts[0].lng });
      setZoom(12);
      return;
    }
    const minLat = Math.min(...pts.map(p => p.lat));
    const maxLat = Math.max(...pts.map(p => p.lat));
    const minLng = Math.min(...pts.map(p => p.lng));
    const maxLng = Math.max(...pts.map(p => p.lng));
    setCenter({ lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 });

    let bestZoom = 3;
    for (let z = 18; z >= 2; z--) {
      const ne = latLngToWorld(maxLat, maxLng, z);
      const sw = latLngToWorld(minLat, minLng, z);
      if (Math.abs(ne.x - sw.x) <= (w - fitPadding * 2)
       && Math.abs(sw.y - ne.y) <= (h - fitPadding * 2)) {
        bestZoom = z;
        break;
      }
    }
    setZoom(bestZoom);
  }, [fitPadding]);

  useEffect(() => {
    if (mapReady && pendingFit.current && mapSize.width > 0 && mapSize.height > 0) {
      fitBounds(pendingFit.current, mapSize.width, mapSize.height);
      pendingFit.current = null;
    }
  }, [mapReady, mapSize, fitBounds]);

  const scheduleFitBounds = useCallback((pts: LatLng[]) => {
    if (mapReady && mapSize.width > 0 && mapSize.height > 0) {
      fitBounds(pts, mapSize.width, mapSize.height);
    } else {
      pendingFit.current = pts;
    }
  }, [mapReady, mapSize, fitBounds]);

  // ── Drag ───────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragMoved.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, center: { ...center } });
  }, [center]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
    const pos = pixelToLatLng(
      mapSize.width / 2 - dx, mapSize.height / 2 - dy,
      zoom, mapSize.width, mapSize.height,
      dragStart.center.lat, dragStart.center.lng,
    );
    setCenter({ lat: pos.lat, lng: pos.lng });
  }, [isDragging, dragStart, zoom, mapSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const wasDrag = useCallback(() => dragMoved.current, []);

  // ── Projekcja ──────────────────────────────────────────────

  const polyPixels = useMemo<Pixel[]>(() =>
    points.map(p =>
      latLngToPixel(p.lat, p.lng, zoom, mapSize.width, mapSize.height, center.lat, center.lng)
    ),
    [points, zoom, mapSize.width, mapSize.height, center.lat, center.lng]
  );

  const dist = useMemo(() =>
    points.length > 1 ? totalDistance(points) : 0,
    [points]
  );

  // ── Controls ───────────────────────────────────────────────

  const zoomIn  = useCallback(() => setZoom(z => clampZoom(z + 1)), [clampZoom]);
  const zoomOut = useCallback(() => setZoom(z => clampZoom(z - 1)), [clampZoom]);

  const resetView = useCallback(() => {
    setCenter(DEFAULT_CENTER);
    setZoom(DEFAULT_ZOOM);
  }, []);

  return {
    mapRef, zoom, center, mapSize, isDragging, mapReady,
    hoveredIdx, setHoveredIdx, setZoom, setCenter,
    polyPixels, dist,
    handleMouseDown, handleMouseMove, handleMouseUp,
    wasDrag, zoomIn, zoomOut, resetView,
    fitBounds, scheduleFitBounds,
  };
}
