import { useState, useEffect } from 'react'

export function useTransitData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/belfast-bus-stops.json')
      .then(r => r.json())
      .then(stops => {
        if (cancelled) return
        setData(stops)
        console.log(`Loaded ${stops.length} bus stops`)
      })
      .catch(err => console.warn('Bus stops load failed:', err))
    return () => { cancelled = true }
  }, [])

  return data
}
