import { useState, useEffect, useRef } from 'react'

const VEHICLE_COUNT = 1200
const FRAME_MS = 50

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

// Spatial index: map endpoint coordinate keys to road indices + which end (start/end)
function buildJunctionIndex(roads) {
  const index = new Map()
  const toKey = (c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`

  for (let i = 0; i < roads.length; i++) {
    const coords = roads[i].c
    if (coords.length < 2) continue

    const sk = toKey(coords[0])
    const ek = toKey(coords[coords.length - 1])

    // At the start of road i, you can enter it going forward
    if (!index.has(sk)) index.set(sk, [])
    index.get(sk).push({ road: i, forward: true })

    // At the end of road i, you can enter it going backward
    if (!index.has(ek)) index.set(ek, [])
    index.get(ek).push({ road: i, forward: false })
  }

  return { index, toKey }
}

function createVehicle(roads) {
  const roadIdx = Math.floor(Math.random() * roads.length)
  const road = roads[roadIdx]
  const forward = Math.random() > 0.5
  const baseSpeed = ROAD_SPEEDS[road.h] || 0.000025

  return {
    roadIdx,
    forward,
    seg: 0,
    t: 0,
    speed: baseSpeed * (0.75 + Math.random() * 0.5),
    roadType: road.h,
    prevRoadIdx: -1, // track where we came from to prevent U-turns
  }
}

// Get the coordinate array in the direction the vehicle is travelling
function getCoords(v, roads) {
  const c = roads[v.roadIdx].c
  return v.forward ? c : c.slice().reverse()
}

function getPosition(v, roads) {
  const coords = getCoords(v, roads)
  const a = coords[v.seg]
  const b = coords[v.seg + 1]
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
  const coords = getCoords(v, roads)
  const maxSeg = coords.length - 2

  if (maxSeg < 0) {
    Object.assign(v, createVehicle(roads))
    return
  }

  const a = coords[v.seg]
  const b = coords[v.seg + 1]
  if (!a || !b) {
    Object.assign(v, createVehicle(roads))
    return
  }

  const len = segLen(a, b)
  v.t += len > 0 ? v.speed / len : 1

  while (v.t >= 1 && v.seg < maxSeg) {
    v.t -= 1
    v.seg++
  }

  // Reached end of this road
  if (v.t >= 1) {
    const endPt = coords[coords.length - 1]
    const k = junctions.toKey(endPt)
    const entries = junctions.index.get(k)

    if (entries && entries.length > 1) {
      // Filter out the road we just came from (prevents U-turn)
      // A U-turn is: same road going the opposite direction
      const candidates = entries.filter(e => {
        // Exclude the exact road+direction we're currently on reversed
        if (e.road === v.roadIdx) return false
        // Also exclude the road we came from before this one
        if (e.road === v.prevRoadIdx) return false
        return true
      })

      const pool = candidates.length > 0 ? candidates : entries.filter(e => e.road !== v.roadIdx)
      
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)]
        const nextRoad = roads[pick.road]
        const baseSpeed = ROAD_SPEEDS[nextRoad.h] || 0.000025

        v.prevRoadIdx = v.roadIdx
        v.roadIdx = pick.road
        v.forward = pick.forward
        v.seg = 0
        v.t = 0
        v.speed = baseSpeed * (0.75 + Math.random() * 0.5)
        v.roadType = nextRoad.h
        return
      }
    }

    // Dead end or no valid candidates — respawn on a new road entirely
    const prev = v.roadIdx
    Object.assign(v, createVehicle(roads))
    v.prevRoadIdx = prev
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

        // Spread vehicles across their roads
        for (const v of vehicles) {
          const coords = getCoords(v, roads)
          const totalSegs = coords.length - 1
          if (totalSegs > 0) {
            v.seg = Math.floor(Math.random() * totalSegs)
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
              position: getPosition(vehicles[i], roads),
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
