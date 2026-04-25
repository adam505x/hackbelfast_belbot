import { useState, useEffect, useRef } from 'react'

const VEHICLE_COUNT = 1200
const FRAME_MS = 50

// Speed in degrees-per-tick by road type
const ROAD_SPEEDS = {
  motorway: 0.000080,
  motorway_link: 0.000065,
  trunk: 0.000065,
  trunk_link: 0.000050,
  primary: 0.000045,
  primary_link: 0.000038,
  secondary: 0.000035,
  secondary_link: 0.000030,
  tertiary: 0.000025,
  tertiary_link: 0.000020,
}

// Build a spatial index so vehicles can find a connecting road at the end of their current one
function buildJunctionIndex(roads) {
  const index = new Map()
  const key = (c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`

  for (let i = 0; i < roads.length; i++) {
    const coords = roads[i].c
    if (coords.length < 2) continue

    const startKey = key(coords[0])
    const endKey = key(coords[coords.length - 1])

    // At the end of this road, which roads can we join?
    // A road is joinable if its start or end is near our end
    if (!index.has(endKey)) index.set(endKey, [])
    index.get(endKey).push(i)

    if (!index.has(startKey)) index.set(startKey, [])
    index.get(startKey).push(i)
  }

  return { index, key }
}

function createVehicle(roads) {
  const roadIdx = Math.floor(Math.random() * roads.length)
  const road = roads[roadIdx]
  const reverse = Math.random() > 0.5
  const coords = reverse ? [...road.c].reverse() : road.c
  const baseSpeed = ROAD_SPEEDS[road.h] || 0.000025
  const speed = baseSpeed * (0.75 + Math.random() * 0.5)

  return {
    roadIdx,
    coords,
    seg: 0,
    t: 0, // progress along current segment [0,1]
    speed,
    roadType: road.h,
  }
}

function getPosition(v) {
  const a = v.coords[v.seg]
  const b = v.coords[v.seg + 1]
  if (!a || !b) return null
  return [
    a[0] + (b[0] - a[0]) * v.t,
    a[1] + (b[1] - a[1]) * v.t,
  ]
}

function segLen(a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function advanceVehicle(v, roads, junctions) {
  const a = v.coords[v.seg]
  const b = v.coords[v.seg + 1]
  if (!a || !b) {
    // Shouldn't happen, but recover
    Object.assign(v, createVehicle(roads))
    return
  }

  const len = segLen(a, b)
  const step = len > 0 ? v.speed / len : 1
  v.t += step

  // Move to next segment
  while (v.t >= 1 && v.seg < v.coords.length - 2) {
    v.t -= 1
    v.seg++
  }

  // Reached end of road — find a connecting road
  if (v.t >= 1) {
    const endPt = v.coords[v.coords.length - 1]
    const k = junctions.key(endPt)
    const candidates = junctions.index.get(k)

    if (candidates && candidates.length > 0) {
      // Pick a random connecting road (but not the same one going backwards)
      const filtered = candidates.filter(i => i !== v.roadIdx)
      const pool = filtered.length > 0 ? filtered : candidates
      const nextIdx = pool[Math.floor(Math.random() * pool.length)]
      const nextRoad = roads[nextIdx]
      const nextCoords = nextRoad.c

      // Figure out which direction to traverse — start from the junction end
      const startDist = segLen(endPt, nextCoords[0])
      const endDist = segLen(endPt, nextCoords[nextCoords.length - 1])

      const newCoords = startDist <= endDist ? nextCoords : [...nextCoords].reverse()
      const baseSpeed = ROAD_SPEEDS[nextRoad.h] || 0.000025

      v.roadIdx = nextIdx
      v.coords = newCoords
      v.seg = 0
      v.t = 0
      v.speed = baseSpeed * (0.75 + Math.random() * 0.5)
      v.roadType = nextRoad.h
    } else {
      // Dead end — reverse direction on same road
      v.coords = [...v.coords].reverse()
      v.seg = 0
      v.t = 0
    }
  }
}

export function useTrafficData() {
  const [positions, setPositions] = useState(null)
  const stateRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    fetch('/belfast-roads.json')
      .then(r => r.json())
      .then(roads => {
        if (cancelled) return

        const junctions = buildJunctionIndex(roads)
        const vehicles = Array.from({ length: VEHICLE_COUNT }, () => createVehicle(roads))

        // Spread vehicles across their roads so they don't all start at position 0
        for (const v of vehicles) {
          const totalSegs = v.coords.length - 1
          if (totalSegs > 0) {
            const startSeg = Math.floor(Math.random() * totalSegs)
            v.seg = startSeg
            v.t = Math.random()
          }
        }

        stateRef.current = { roads, junctions, vehicles }
        console.log(`Traffic sim: ${VEHICLE_COUNT} vehicles, ${roads.length} roads, ${junctions.index.size} junctions`)

        function tick() {
          if (cancelled) return
          const { roads, junctions, vehicles } = stateRef.current

          const pts = new Array(vehicles.length)
          for (let i = 0; i < vehicles.length; i++) {
            advanceVehicle(vehicles[i], roads, junctions)
            pts[i] = {
              position: getPosition(vehicles[i]),
              speed: vehicles[i].speed,
              roadType: vehicles[i].roadType,
            }
          }

          setPositions(pts)
          timerRef.current = setTimeout(tick, FRAME_MS)
        }

        tick()
      })
      .catch(err => console.warn('Traffic data load failed:', err))

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return positions
}
