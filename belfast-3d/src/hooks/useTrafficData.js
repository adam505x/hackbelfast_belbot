import { useState, useEffect, useRef } from 'react'

const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY || 'jWkgmfWhyuCxtqRX0HrW6Fv91E55ydMm'
const TOMTOM_FLOW = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json'

const VEHICLE_COUNT = 1200
const FRAME_MS = 50
const REFRESH_INTERVAL = 60000 // Re-fetch TomTom data every 60s

// Sample points across Belfast to query traffic flow
const SAMPLE_GRID = []
for (let lat = 54.57; lat <= 54.63; lat += 0.015) {
  for (let lng = -6.00; lng <= -5.85; lng += 0.04) {
    SAMPLE_GRID.push({ lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 })
  }
}

// Fetch flow data for a single point
async function fetchFlowSegment(lat, lng) {
  try {
    const res = await fetch(
      `${TOMTOM_FLOW}?key=${TOMTOM_KEY}&point=${lat},${lng}&unit=kmph`
    )
    if (!res.ok) return null
    const data = await res.json()
    const seg = data.flowSegmentData
    if (!seg) return null
    return {
      currentSpeed: seg.currentSpeed,
      freeFlowSpeed: seg.freeFlowSpeed,
      confidence: seg.confidence,
      roadClosure: seg.roadClosure,
      congestion: seg.freeFlowSpeed > 0
        ? 1 - seg.currentSpeed / seg.freeFlowSpeed
        : 0,
      coords: seg.coordinates?.coordinate?.map(c => [c.longitude, c.latitude]) || [],
    }
  } catch {
    return null
  }
}

// Fetch traffic for all sample points (with rate limiting)
async function fetchAllTraffic() {
  const results = []
  for (const pt of SAMPLE_GRID) {
    const seg = await fetchFlowSegment(pt.lat, pt.lng)
    if (seg && seg.coords.length >= 2) {
      results.push(seg)
    }
    // TomTom free tier: 2,500 req/day, ~5 req/sec
    await new Promise(r => setTimeout(r, 200))
  }
  return results
}

// Build a spatial congestion map from TomTom data
// Returns a function: (lng, lat) => { speed, congestion, density }
function buildCongestionMap(segments) {
  return function lookup(lng, lat) {
    let bestDist = Infinity
    let bestSeg = null
    for (const seg of segments) {
      for (const c of seg.coords) {
        const d = Math.abs(c[0] - lng) + Math.abs(c[1] - lat)
        if (d < bestDist) {
          bestDist = d
          bestSeg = seg
        }
      }
    }
    if (!bestSeg || bestDist > 0.01) {
      return { speed: 30, congestion: 0.2, density: 1.0 }
    }
    // Higher congestion = more vehicles visible (traffic jam = more dots)
    const density = 0.5 + bestSeg.congestion * 2.0
    return {
      speed: bestSeg.currentSpeed,
      congestion: bestSeg.congestion,
      density: Math.min(3.0, density),
    }
  }
}

// Road speed base values (km/h) — used when TomTom data isn't nearby
const ROAD_BASE_SPEEDS = {
  motorway: 100, motorway_link: 60,
  trunk: 80, trunk_link: 50,
  primary: 50, primary_link: 40,
  secondary: 40, secondary_link: 35,
  tertiary: 30, tertiary_link: 25,
}

function buildJunctionIndex(roads) {
  const index = new Map()
  const toKey = (c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`
  for (let i = 0; i < roads.length; i++) {
    const coords = roads[i].c
    if (coords.length < 2) continue
    const sk = toKey(coords[0])
    const ek = toKey(coords[coords.length - 1])
    if (!index.has(sk)) index.set(sk, [])
    index.get(sk).push({ road: i, forward: true })
    if (!index.has(ek)) index.set(ek, [])
    index.get(ek).push({ road: i, forward: false })
  }
  return { index, toKey }
}

function createVehicle(roads, congestionLookup) {
  const roadIdx = Math.floor(Math.random() * roads.length)
  const road = roads[roadIdx]
  const forward = Math.random() > 0.5
  const mid = road.c[Math.floor(road.c.length / 2)]
  const traffic = congestionLookup ? congestionLookup(mid[0], mid[1]) : null
  const realSpeed = traffic ? traffic.speed : (ROAD_BASE_SPEEDS[road.h] || 30)
  // Convert km/h to degrees-per-tick
  const degPerSec = (realSpeed / 3600) / 111320
  const speed = degPerSec * (FRAME_MS / 1000) * 1000 // scale for visibility

  return {
    roadIdx, forward, seg: 0, t: 0,
    speed: speed * (0.8 + Math.random() * 0.4),
    roadType: road.h,
    prevRoadIdx: -1,
    congestion: traffic ? traffic.congestion : 0.2,
    realSpeed: realSpeed,
  }
}

function getCoords(v, roads) {
  const c = roads[v.roadIdx].c
  return v.forward ? c : c.slice().reverse()
}

function getPosition(v, roads) {
  const coords = getCoords(v, roads)
  if (!coords || coords.length < 2) return null
  // Clamp seg to valid range
  const maxSeg = coords.length - 2
  if (v.seg > maxSeg) v.seg = maxSeg
  if (v.seg < 0) v.seg = 0
  if (v.t > 1) v.t = 1
  if (v.t < 0) v.t = 0
  const a = coords[v.seg]
  const b = coords[v.seg + 1]
  if (!a || !b) return null
  return [a[0] + (b[0] - a[0]) * v.t, a[1] + (b[1] - a[1]) * v.t]
}

function segLen(a, b) {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
}

function advanceVehicle(v, roads, junctions) {
  const coords = getCoords(v, roads)
  const maxSeg = coords.length - 2

  if (maxSeg < 0) {
    resetVehicle(v, roads)
    return
  }

  // Clamp before reading
  if (v.seg > maxSeg) v.seg = maxSeg
  if (v.seg < 0) v.seg = 0

  const a = coords[v.seg]
  const b = coords[v.seg + 1]
  if (!a || !b) {
    resetVehicle(v, roads)
    return
  }

  const len = segLen(a, b)
  v.t += len > 0 ? v.speed / len : 1

  while (v.t >= 1 && v.seg < maxSeg) {
    v.t -= 1
    v.seg++
  }

  // Reached end of road
  if (v.t >= 1) {
    v.t = 0.999 // keep valid position at end until we transition

    const endPt = coords[coords.length - 1]
    const k = junctions.toKey(endPt)
    const entries = junctions.index.get(k)

    if (entries && entries.length > 1) {
      const candidates = entries.filter(e => e.road !== v.roadIdx && e.road !== v.prevRoadIdx)
      const pool = candidates.length > 0 ? candidates : entries.filter(e => e.road !== v.roadIdx)
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)]
        v.prevRoadIdx = v.roadIdx
        v.roadIdx = pick.road
        v.forward = pick.forward
        v.seg = 0
        v.t = 0
        v.roadType = roads[pick.road].h
        return
      }
    }

    // Dead end — respawn
    resetVehicle(v, roads)
  }
}

function resetVehicle(v, roads) {
  const prev = v.roadIdx
  const nv = createVehicle(roads, null)
  Object.assign(v, nv)
  v.prevRoadIdx = prev
  // Ensure valid starting position
  const coords = getCoords(v, roads)
  const maxSeg = coords.length - 2
  if (maxSeg > 0) {
    v.seg = Math.floor(Math.random() * maxSeg)
    v.t = Math.random()
  } else {
    v.seg = 0
    v.t = 0
  }
}

export function useTrafficData() {
  const [positions, setPositions] = useState(null)
  const stateRef = useRef(null)
  const timerRef = useRef(null)
  const refreshRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const roadsRes = await fetch('/belfast-roads.json')
      const roads = await roadsRes.json()
      if (cancelled) return

      const junctions = buildJunctionIndex(roads)

      // Fetch initial TomTom traffic data
      console.log(`Fetching TomTom traffic for ${SAMPLE_GRID.length} points...`)
      const segments = await fetchAllTraffic()
      console.log(`TomTom: ${segments.length} flow segments loaded`)

      const congestionLookup = segments.length > 0 ? buildCongestionMap(segments) : null

      // Create vehicles weighted by congestion density
      const vehicles = []
      for (let i = 0; i < VEHICLE_COUNT; i++) {
        const v = createVehicle(roads, congestionLookup)
        // Spread across road
        const coords = getCoords(v, roads)
        const totalSegs = coords.length - 1
        if (totalSegs > 0) {
          v.seg = Math.floor(Math.random() * totalSegs)
          v.t = Math.random()
        }
        // Update speed from TomTom for this vehicle's location
        if (congestionLookup) {
          const pos = getPosition(v, roads)
          if (pos) {
            const traffic = congestionLookup(pos[0], pos[1])
            v.congestion = traffic.congestion
            v.realSpeed = traffic.speed
          }
        }
        vehicles.push(v)
      }

      stateRef.current = { roads, junctions, vehicles, congestionLookup }

      // Animation loop
      function tick() {
        if (cancelled) return
        const { roads, junctions, vehicles, congestionLookup } = stateRef.current
        const pts = []
        for (let i = 0; i < vehicles.length; i++) {
          advanceVehicle(vehicles[i], roads, junctions)
          const pos = getPosition(vehicles[i], roads)
          if (pos) {
            pts.push({
              position: [pos[0], pos[1]],
              speed: vehicles[i].realSpeed,
              congestion: vehicles[i].congestion,
              roadType: vehicles[i].roadType,
            })
          }
        }
        setPositions(pts)
        timerRef.current = setTimeout(tick, FRAME_MS)
      }
      tick()

      // Periodic TomTom refresh
      refreshRef.current = setInterval(async () => {
        if (cancelled) return
        const newSegments = await fetchAllTraffic()
        if (newSegments.length > 0 && stateRef.current) {
          const newLookup = buildCongestionMap(newSegments)
          stateRef.current.congestionLookup = newLookup
          // Update vehicle congestion values
          for (const v of stateRef.current.vehicles) {
            const pos = getPosition(v, stateRef.current.roads)
            if (pos) {
              const traffic = newLookup(pos[0], pos[1])
              v.congestion = traffic.congestion
              v.realSpeed = traffic.speed
            }
          }
          console.log('TomTom traffic refreshed')
        }
      }, REFRESH_INTERVAL)
    }

    init().catch(err => console.warn('Traffic init failed:', err))

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [])

  return positions
}
