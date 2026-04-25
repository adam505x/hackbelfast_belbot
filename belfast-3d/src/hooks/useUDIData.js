import { useState, useEffect, useMemo } from 'react'

const UDI_URL = '/belfast-udi.json'

export function useUDIData(period = '2021') {
  const [raw, setRaw] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(UDI_URL)
      .then(r => r.json())
      .then(data => { if (!cancelled) setRaw(data) })
      .catch(err => console.warn('UDI load failed:', err))
    return () => { cancelled = true }
  }, [])

  const data = useMemo(() => {
    if (!raw) return null
    return {
      type: 'FeatureCollection',
      features: raw.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          udi: f.properties[`udi_${period}`],
          demographic: f.properties[`demographic_${period}`],
          crime: f.properties[`crime_${period}`],
          dereliction: f.properties[`dereliction_${period}`],
          housing: f.properties[`housing_${period}`],
        },
      })),
    }
  }, [raw, period])

  const metadata = raw?.metadata || null

  return { data, metadata }
}
