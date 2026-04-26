import { useState, useEffect, useMemo } from 'react'
import BUILDING_YEARS from '../data/buildingYears'

export function useBuildingData(period) {
  const [allBuildings, setAllBuildings] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch('/belfast-buildings.json')
      .then(r => r.json())
      .then(compact => {
        if (cancelled) return

        // Convert compact format [props, coords] back to GeoJSON
        // Include the index so we can look up construction year
        const features = compact.map(([props, coords], idx) => ({
          type: 'Feature',
          properties: {
            height: props.h,
            name: props.n || 'Building',
            building_levels: Math.ceil(props.h / 3.5),
            _idx: idx,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
        }))

        console.log(`Loaded ${features.length} buildings from static file`)
        setAllBuildings(features)
      })
      .catch(err => {
        console.warn('Building data load failed:', err)
      })

    return () => { cancelled = true }
  }, [])

  // Filter buildings by period — only show buildings that existed by that year
  const data = useMemo(() => {
    if (!allBuildings) return null
    const year = parseInt(period) || 2025

    const filtered = allBuildings.filter(f => {
      const idx = f.properties._idx
      const builtYear = BUILDING_YEARS[idx]
      // If no year data, assume pre-2001 (always visible)
      if (!builtYear) return true
      return builtYear <= year
    })

    return { type: 'FeatureCollection', features: filtered }
  }, [allBuildings, period])

  return data
}
