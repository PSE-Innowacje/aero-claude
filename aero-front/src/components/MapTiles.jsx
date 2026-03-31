import { latLngToWorld } from '../mapUtils'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function MapTiles({ zoom, centerLat, centerLng, mapWidth, mapHeight }) {
  if (!mapWidth || !mapHeight) return null

  const tileSize = 256
  const n = Math.pow(2, zoom)
  const center = latLngToWorld(centerLat, centerLng, zoom)
  const centerTileX = center.x / tileSize
  const centerTileY = center.y / tileSize

  const tilesX = Math.ceil(mapWidth / tileSize) + 2
  const tilesY = Math.ceil(mapHeight / tileSize) + 2

  const startTX = Math.floor(centerTileX - tilesX / 2)
  const startTY = Math.floor(centerTileY - tilesY / 2)

  const tiles = []
  for (let tx = startTX; tx <= startTX + tilesX; tx++) {
    for (let ty = startTY; ty <= startTY + tilesY; ty++) {
      if (ty < 0 || ty >= n) continue
      const wrappedTx = ((tx % n) + n) % n
      const left = (tx - centerTileX) * tileSize + mapWidth / 2
      const top = (ty - centerTileY) * tileSize + mapHeight / 2
      tiles.push(
        <img
          key={`${tx}-${ty}-${zoom}`}
          src={TILE_URL.replace('{z}', zoom).replace('{x}', wrappedTx).replace('{y}', ty)}
          alt=""
          style={{
            position: 'absolute',
            left,
            top,
            width: tileSize,
            height: tileSize,
            imageRendering: 'crisp-edges',
            userSelect: 'none',
            pointerEvents: 'none',
            display: 'block',
          }}
          draggable={false}
          loading="eager"
        />
      )
    }
  }
  return <>{tiles}</>
}
