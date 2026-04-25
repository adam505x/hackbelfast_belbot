import { useState, useEffect } from 'react'

// Verified NI data centre locations
// Sources: datacentermap.com, baxtel.com, OSM, Nominatim geocoding
const NI_DATA_CENTRES = [
  {
    name: 'BT Ireland — Telephone House (Site 2)',
    coordinates: [-5.9225, 54.5963],
    operator: 'BT Services (British Telecom)',
    address: '45-75 May Street, Belfast BT1 4NB',
    status: 'Operational',
    tier: 'Tier 3',
    type: 'Carrier-neutral colocation',
    source: 'datacentermap.com',
  },
  {
    name: 'BT Ireland (Site 3)',
    coordinates: [-5.8651, 54.5950],
    operator: 'BT Services (British Telecom)',
    address: '287-301 Upper Newtownards Road, Belfast BT4 3JH',
    status: 'Operational',
    type: 'Colocation',
    source: 'datacentermap.com',
  },
  {
    name: 'Atlas Communications — Heron Road DC',
    coordinates: [-5.8692, 54.6264],
    operator: 'Atlas Communications (NI) Ltd',
    address: '2 Heron Road, Belfast BT3 9LE',
    status: 'Operational',
    type: 'Managed hosting & colocation',
    source: 'datacentermap.com',
  },
  {
    name: 'Microsoft Ireland — City Quays 3',
    coordinates: [-5.9202, 54.6047],
    operator: 'Microsoft',
    address: '92 Donegall Quay, Belfast BT1 3FE',
    status: 'Operational',
    type: 'Corporate data centre',
    source: 'OpenStreetMap',
  },
  {
    name: 'Prescient Data Centres — Coleraine',
    coordinates: [-6.6855, 55.1534],
    operator: 'Prescient Data Centres',
    address: 'Atlantic Link Enterprise Campus, Coleraine BT52 1FA',
    status: 'Operational',
    tier: 'Tier III+',
    capacity_mw: 4.5,
    type: 'Carrier-neutral colocation',
    notes: 'Adjacent to GTT transatlantic cable landing station (Project Kelvin)',
    source: 'datacentermap.com / OpenStreetMap',
  },
  {
    name: 'Xperience Group — Lisburn Backup DC',
    coordinates: [-6.0926, 54.5117],
    operator: 'Xperience Group',
    address: '11 Ferguson Drive, Lisburn BT28 2EX',
    status: 'Operational',
    type: 'Backup / DR facility',
    source: 'datacentermap.com',
  },
]

export function useDataCentreData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Score each site via backend if available
      const scored = await scoreSites(NI_DATA_CENTRES)
      if (!cancelled) setData(scored)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return data
}

async function scoreSites(sites) {
  try {
    const res = await fetch('http://localhost:8000/api/scoring/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sites: sites.map(s => ({
          lng: s.coordinates[0],
          lat: s.coordinates[1],
          land_type: 'industrial',
          deprivation_score: 0.3,
        })),
      }),
    })
    if (res.ok) {
      const scores = await res.json()
      return sites.map((site, i) => ({
        ...site,
        score: scores[i]?.composite_score ?? 0.7,
        flood_safety: scores[i]?.flood_safety,
        grid_proximity: scores[i]?.grid_proximity,
        fibre_access: scores[i]?.fibre_access,
        nearest_substation: scores[i]?.nearest_substation,
        recommendation: scores[i]?.recommendation,
      }))
    }
  } catch {}

  // Fallback: all operational sites get a decent score
  return sites.map(site => ({ ...site, score: 0.7 }))
}
