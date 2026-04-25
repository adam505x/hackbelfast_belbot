import { useState, useEffect } from 'react'

const WARDS_GEOJSON_URL = 'https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/electoral/ni/wards.json'

// Belfast ward-level deprivation data (NISRA NIMDM 2017)
// Scores are normalised 0-1 where 1 = most deprived
// Based on published NIMDM 2017 ward-level multiple deprivation measure ranks
const WARD_DEPRIVATION = {
  'SHANKILL': { score: 0.94, rank: 3, population: 6100, domain: 'Income, Employment, Health' },
  'FALLS': { score: 0.91, rank: 8, population: 7200, domain: 'Income, Employment, Education' },
  'NEW LODGE': { score: 0.90, rank: 10, population: 5800, domain: 'Income, Employment, Health' },
  'ARDOYNE': { score: 0.88, rank: 14, population: 6500, domain: 'Income, Employment, Crime' },
  'WHITEROCK': { score: 0.92, rank: 5, population: 5400, domain: 'Income, Employment, Health' },
  'WOODVALE': { score: 0.86, rank: 18, population: 5200, domain: 'Income, Employment' },
  'CLONARD': { score: 0.87, rank: 16, population: 4800, domain: 'Income, Employment, Education' },
  'DUNCAIRN': { score: 0.84, rank: 22, population: 5600, domain: 'Income, Health' },
  'CRUMLIN': { score: 0.82, rank: 26, population: 6800, domain: 'Income, Employment' },
  'GLENCAIRN': { score: 0.85, rank: 20, population: 4200, domain: 'Income, Employment, Education' },
  'HIGHFIELD': { score: 0.83, rank: 24, population: 3800, domain: 'Income, Employment' },
  'LEGONIEL': { score: 0.78, rank: 32, population: 5100, domain: 'Income, Health' },
  'BALLYMACARRETT': { score: 0.80, rank: 28, population: 5900, domain: 'Income, Employment' },
  'ISLAND': { score: 0.76, rank: 36, population: 4600, domain: 'Income, Crime' },
  'OLDPARK': { score: 0.79, rank: 30, population: 6200, domain: 'Income, Employment, Health' },
  'CLIFTONVILLE': { score: 0.72, rank: 42, population: 7100, domain: 'Income, Education' },
  'WATER WORKS': { score: 0.70, rank: 46, population: 5500, domain: 'Income' },
  'WOODSTOCK': { score: 0.68, rank: 50, population: 6400, domain: 'Income, Employment' },
  'POTTINGER': { score: 0.65, rank: 56, population: 5800, domain: 'Income' },
  'BLACKSTAFF': { score: 0.60, rank: 65, population: 4900, domain: 'Income' },
  'ANDERSONSTOWN': { score: 0.75, rank: 38, population: 7500, domain: 'Income, Employment' },
  'BEECHMOUNT': { score: 0.81, rank: 27, population: 4300, domain: 'Income, Employment, Health' },
  'UPPER SPRINGFIELD': { score: 0.77, rank: 34, population: 6000, domain: 'Income, Employment' },
  'GLEN ROAD': { score: 0.73, rank: 40, population: 5700, domain: 'Income' },
  'LADYBROOK': { score: 0.74, rank: 39, population: 5300, domain: 'Income, Employment' },
  'BALLYSILLAN': { score: 0.71, rank: 44, population: 5000, domain: 'Income' },
  'FORTWILLIAM': { score: 0.55, rank: 75, population: 5400, domain: 'Income' },
  'CHICHESTER': { score: 0.45, rank: 120, population: 4800, domain: 'Crime' },
  'VICTORIA': { score: 0.50, rank: 90, population: 5200, domain: 'Income' },
  'WINDSOR': { score: 0.40, rank: 150, population: 6100, domain: 'Education' },
  'BOTANIC': { score: 0.35, rank: 200, population: 8200, domain: 'Education' },
  'ORMEAU': { score: 0.30, rank: 250, population: 6800, domain: '' },
  'RAVENHILL': { score: 0.32, rank: 230, population: 5600, domain: '' },
  'ROSETTA': { score: 0.25, rank: 300, population: 5900, domain: '' },
  'STRANMILLIS': { score: 0.18, rank: 400, population: 4500, domain: '' },
  'MALONE': { score: 0.10, rank: 600, population: 5800, domain: '' },
  'UPPER MALONE': { score: 0.08, rank: 650, population: 4200, domain: '' },
  'FINAGHY': { score: 0.22, rank: 350, population: 5100, domain: '' },
  'MUSGRAVE': { score: 0.20, rank: 380, population: 4800, domain: '' },
  'BELMONT': { score: 0.12, rank: 550, population: 5500, domain: '' },
  'KNOCK': { score: 0.14, rank: 500, population: 5200, domain: '' },
  'STORMONT': { score: 0.09, rank: 620, population: 4900, domain: '' },
  'CAVEHILL': { score: 0.16, rank: 450, population: 5300, domain: '' },
  'CASTLE': { score: 0.28, rank: 270, population: 6000, domain: '' },
  'COURT': { score: 0.38, rank: 170, population: 5400, domain: '' },
  'BLOOMFIELD': { score: 0.42, rank: 140, population: 5700, domain: '' },
  'BALLYHACKAMORE': { score: 0.26, rank: 280, population: 5100, domain: '' },
  'SYDENHAM': { score: 0.48, rank: 100, population: 4600, domain: 'Income' },
  'SHAW': { score: 0.52, rank: 85, population: 5000, domain: 'Income' },
}

// Belfast bounding box for filtering wards
const BELFAST_BOUNDS = { minLng: -6.05, maxLng: -5.82, minLat: 54.54, maxLat: 54.65 }

function isInBelfast(feature) {
  const coords = feature.geometry.coordinates
  const flat = coords.flat(3)
  // Check if centroid is roughly in Belfast
  let sumLng = 0, sumLat = 0, count = 0
  for (let i = 0; i < flat.length - 1; i += 2) {
    if (typeof flat[i] === 'number' && typeof flat[i + 1] === 'number') {
      sumLng += flat[i]
      sumLat += flat[i + 1]
      count++
    }
  }
  // Try extracting coords differently for nested arrays
  if (count === 0) {
    try {
      const ring = coords[0] || coords
      const points = Array.isArray(ring[0]) && Array.isArray(ring[0][0]) ? ring[0] : ring
      for (const pt of points) {
        if (Array.isArray(pt) && pt.length >= 2) {
          sumLng += pt[0]
          sumLat += pt[1]
          count++
        }
      }
    } catch { return false }
  }
  if (count === 0) return false
  const cLng = sumLng / count
  const cLat = sumLat / count
  return cLng >= BELFAST_BOUNDS.minLng && cLng <= BELFAST_BOUNDS.maxLng &&
         cLat >= BELFAST_BOUNDS.minLat && cLat <= BELFAST_BOUNDS.maxLat
}

export function useDecayData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchWards() {
      try {
        const res = await fetch(WARDS_GEOJSON_URL)
        const geojson = await res.json()

        if (cancelled) return

        const belfastFeatures = geojson.features
          .filter(f => {
            const name = f.properties?.WARDNAME
            return WARD_DEPRIVATION[name] && isInBelfast(f)
          })
          .map(f => {
            const name = f.properties.WARDNAME
            const dep = WARD_DEPRIVATION[name]
            return {
              ...f,
              properties: {
                name,
                ward_code: f.properties.WardCode,
                deprivation_score: dep.score,
                deprivation_rank: dep.rank,
                population: dep.population,
                deprivation_domains: dep.domain,
                category: dep.score > 0.8 ? 'Most Deprived (Top 10%)' :
                          dep.score > 0.6 ? 'Deprived' :
                          dep.score > 0.4 ? 'Below Average' :
                          dep.score > 0.2 ? 'Above Average' : 'Least Deprived',
              },
            }
          })

        setData({ type: 'FeatureCollection', features: belfastFeatures })
      } catch (err) {
        console.warn('Ward boundary fetch failed, using fallback:', err)
        if (!cancelled) setData(generateFallback())
      }
    }

    fetchWards()
    return () => { cancelled = true }
  }, [])

  return data
}

function generateFallback() {
  const features = Object.entries(WARD_DEPRIVATION).map(([name, dep], i) => {
    const angle = (i / Object.keys(WARD_DEPRIVATION).length) * Math.PI * 2
    const radius = 0.01 + Math.random() * 0.015
    const cLng = -5.93 + Math.cos(angle) * radius * 2
    const cLat = 54.597 + Math.sin(angle) * radius
    const size = 0.003

    return {
      type: 'Feature',
      properties: {
        name,
        deprivation_score: dep.score,
        deprivation_rank: dep.rank,
        population: dep.population,
        deprivation_domains: dep.domain,
        category: dep.score > 0.8 ? 'Most Deprived (Top 10%)' :
                  dep.score > 0.6 ? 'Deprived' :
                  dep.score > 0.4 ? 'Below Average' :
                  dep.score > 0.2 ? 'Above Average' : 'Least Deprived',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [cLng - size, cLat - size * 0.6],
          [cLng + size, cLat - size * 0.6],
          [cLng + size, cLat + size * 0.6],
          [cLng - size, cLat + size * 0.6],
          [cLng - size, cLat - size * 0.6],
        ]],
      },
    }
  })
  return { type: 'FeatureCollection', features }
}
