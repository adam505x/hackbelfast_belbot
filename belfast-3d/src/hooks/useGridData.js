import { useState, useEffect } from 'react'

export function useGridData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch('/ni-grid.json')
      .then(r => r.json())
      .then(raw => {
        if (cancelled) return

        const substationFeatures = raw.substations.map(s => ({
          type: 'Feature',
          properties: {
            name: s.n || (s.v ? `${s.v}kV Substation` : 'Substation'),
            voltage: s.v,
            operator: s.op,
            type: 'substation',
          },
          geometry: {
            type: 'Point',
            coordinates: [s.lon, s.lat],
          },
        }))

        const lineFeatures = raw.lines.map(l => ({
          type: 'Feature',
          properties: {
            voltage: l.v,
            name: l.v ? `${l.v}kV Line` : 'Power Line',
            type: 'power_line',
          },
          geometry: {
            type: 'LineString',
            coordinates: l.c,
          },
        }))

        console.log(`Loaded ${substationFeatures.length} substations, ${lineFeatures.length} power lines from static file`)

        setData({
          substations: { type: 'FeatureCollection', features: substationFeatures },
          lines: { type: 'FeatureCollection', features: lineFeatures },
        })
      })
      .catch(err => {
        console.warn('Grid data load failed:', err)
      })

    return () => { cancelled = true }
  }, [])

  return data
}
