// Map projection utilities (Web Mercator / EPSG:3857)

export function latLngToWorld(lat, lng, zoom) {
  const n = Math.pow(2, zoom) * 256
  const x = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

export function worldToLatLng(wx, wy, zoom) {
  const n = Math.pow(2, zoom) * 256
  const lng = (wx / n) * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * wy) / n)))
  const lat = (latRad * 180) / Math.PI
  return { lat, lng }
}

export function latLngToPixel(lat, lng, zoom, mapW, mapH, centerLat, centerLng) {
  const c = latLngToWorld(centerLat, centerLng, zoom)
  const p = latLngToWorld(lat, lng, zoom)
  return {
    x: p.x - c.x + mapW / 2,
    y: p.y - c.y + mapH / 2,
  }
}

export function pixelToLatLng(px, py, zoom, mapW, mapH, centerLat, centerLng) {
  const c = latLngToWorld(centerLat, centerLng, zoom)
  return worldToLatLng(px - mapW / 2 + c.x, py - mapH / 2 + c.y, zoom)
}

// Haversine distance in km
export function haversine(p1, p2) {
  const R = 6371
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function totalDistance(points) {
  let d = 0
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i])
  return d
}

export function formatDistance(km) {
  if (km >= 1) return km.toFixed(2) + ' km'
  return (km * 1000).toFixed(0) + ' m'
}
