import React, { useMemo, useCallback } from 'react';
import { latLngToWorld } from '../mapUtils';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_SIZE = 256;

interface MapTilesProps {
  zoom: number;
  centerLat: number;
  centerLng: number;
  mapWidth: number;
  mapHeight: number;
}

export default function MapTiles({ zoom, centerLat, centerLng, mapWidth, mapHeight }: MapTilesProps) {
  const handleTileError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.style.opacity = '0';
  }, []);

  const tiles = useMemo(() => {
    if (!mapWidth || !mapHeight) return [];

    const n = Math.pow(2, zoom);
    const center = latLngToWorld(centerLat, centerLng, zoom);
    const centerTileX = center.x / TILE_SIZE;
    const centerTileY = center.y / TILE_SIZE;

    const tilesX = Math.ceil(mapWidth / TILE_SIZE) + 2;
    const tilesY = Math.ceil(mapHeight / TILE_SIZE) + 2;

    const startTX = Math.floor(centerTileX - tilesX / 2);
    const startTY = Math.floor(centerTileY - tilesY / 2);

    const result: { key: string; src: string; left: number; top: number }[] = [];

    for (let tx = startTX; tx <= startTX + tilesX; tx++) {
      for (let ty = startTY; ty <= startTY + tilesY; ty++) {
        if (ty < 0 || ty >= n) continue;
        const wrappedTx = ((tx % n) + n) % n;
        result.push({
          key: `${tx}-${ty}-${zoom}`,
          src: TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(wrappedTx)).replace('{y}', String(ty)),
          left: (tx - centerTileX) * TILE_SIZE + mapWidth / 2,
          top: (ty - centerTileY) * TILE_SIZE + mapHeight / 2,
        });
      }
    }
    return result;
  }, [zoom, centerLat, centerLng, mapWidth, mapHeight]);

  return (
    <>
      {tiles.map(t => (
        <img
          key={t.key}
          src={t.src}
          alt=""
          style={{
            position: 'absolute',
            left: t.left,
            top: t.top,
            width: TILE_SIZE,
            height: TILE_SIZE,
            imageRendering: 'crisp-edges',
            userSelect: 'none',
            pointerEvents: 'none',
            display: 'block',
          }}
          draggable={false}
          loading="eager"
          onError={handleTileError}
        />
      ))}
    </>
  );
}
