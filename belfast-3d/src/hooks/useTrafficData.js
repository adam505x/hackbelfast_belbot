import { useState, useEffect, useRef, useCallback } from 'react'

// Simulation config
const VEHICLE_COUNT = 1200
const SPEED_FACTOR = 0.00003 // degrees per frame at base speed
const FRAME_MS = 50

// Speed multipliers by road type
const ROAD_SPEEDS = {
  motorway: 2.5,
  motorway_link: 2.0,
  trunk: 2.0,
  trunk_link: 1.6,
  primary: 1.4,
  primary_link: 1.2,
  secondary: 1.1,
  secondary_link: 1.0,
  tertiary: 0.9,
  tertiary_link: 0.8,
}

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function segmentLength(a, b) {
  const dx = (b[0] - a[0]) * 111320 * Math.cos(a[1] * Math.PI / 180)
  const dy = (b[1] - a[1]) * 110540
  return Math.sqrt(dx * dx + dy * dy)
}

function createVehicle(roads) {
  const road = roads[Math.floor(Math.random() * roads.length)]
  const coords = road.c
  const speed = ROAD_SPEEDS[road.h] || 1.0
  // Random direction
  const reverse = Math.random() > 0.5
  const orderedCoords = reverse ? [...coords].reverse() : coords

  return {
    coords: orderedCoords,
    segIndex: 0,
    segProgress: Math.random(),
    speed: speed * (0.7 + Math.random() * 0.6), // some variance
    roadType: road.h,
  }
}

function stepVehicle(v, roads) {
  const coords = v.coords
  if (coords.length < 2) return resetVehicle(v, roads)

  const a = coords[v.segIndex]
  const b = coords[v.segIndex + 1]
  if (!a || !b) return resetVehicle(v, roads)

  const len = segmentLength(a, b)
  const advance = (SPEED_FACTOR * v.speed) / Math.max(len / 111320, 0.00001)
  v.segProgress += advance

  if (v.segProgress >= 1) {
    v.segProgress = 0
    v.segIndex++
    if (v.segIndex >= coords.length - 1) {
      return resetVehicle(v, roads)
    }
  }

  return v
}

function resetVehicle(v, roads) {
  const nv = createVehicle(roads)
  // Copy reference so we mutate in place
  v.coords = nv.coords
  v.segIndex = nv.segIndex
  v.segProgress = nv.segProgress
  v.speed = nv.speed
  v.roadType = nv.roadType
  return v
}

function getVehiclePosition(v) {
  const a = v.coords[v.segIndex]
  const b = v.coords[v.segIndex + 1]
  if (!a || !b) return null
  return lerp(a, b, v.segProgress)
}

export function useTrafficData() {
  const [positions, setPositions] = useState(null)
  const roadsRef = useRef(null)
  const vehiclesRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    fetch('/belfast-roads.json')
      .then(r => r.json())
      .then(roads => {
        if (cancelled) return
        roadsRef.current = roads

        // Initialize vehicles
        const vehicles = []
        for (let i = 0; i < VEHICLE_COUNT; i++) {
          vehicles.push(createVehicle(roads))
        }
        vehiclesRef.current = vehicles

        console.log(`Traffic sim: ${vehicles.length} vehicles on ${roads.length} roads`)

        // Start animation loop
        function tick() {
          if (cancelled) return
          const vecs = vehiclesRef.current
          const rds = roadsRef.current

          const pts = []
          for (let i = 0; i < vecs.length; i++) {
            stepVehicle(vecs[i], rds)
            const pos = getVehiclePosition(vecs[i])
            if (pos) {
              pts.push({
                position: pos,
                speed: vecs[i].speed,
                roadType: vecs[i].roadType,
              })
            }
          }

          setPositions(pts)
          frameRef.current = setTimeout(tick, FRAME_MS)
        }

        tick()
      })
      .catch(err => console.warn('Traffic data load failed:', err))

    return () => {
      cancelled = true
      if (frameRef.current) clearTimeout(frameRef.current)
    }
  }, [])

  return positions
}
