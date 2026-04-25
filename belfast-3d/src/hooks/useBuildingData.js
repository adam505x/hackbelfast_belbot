import { useState, useEffect } from 'react'

export function useBuildingData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch('/belfast-buildings.json')
      .then(r => r.json())
      .then(compact => {
        if (cancelled) return

        // Convert compact format [props, coords] back to GeoJSON
        const features = compact.map(([props, coords]) => ({
          type: 'Feature',
          properties: {
            height: props.h,
            name: props.n || 'Building',
            building_levels: Math.ceil(props.h / 3.5),
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
        }))

        console.log(`Loaded ${features.length} buildings from static file`)
        setData({ type: 'FeatureCollection', features })
      })
      .catch(err => {
        console.warn('Building data load failed:', err)
      })

    return () => { cancelled = true }
  }, [])

  return data
}
