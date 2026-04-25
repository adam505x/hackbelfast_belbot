import { useState, useEffect } from 'react'

// Complete verified NI data centre locations
// Sources: datacentermap.com, baxtel.com, datacentercatalog.com, datacenters.com,
//          inflect.com, colo-x.com, OSM, Nominatim geocoding
const NI_DATA_CENTRES = [
  // --- Belfast ---
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
    tier: 'Tier 3',
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
    name: 'DCE Titanic Exchange',
    coordinates: [-5.9109, 54.6050],
    operator: 'Data City Exchange (DCE)',
    address: 'Titanic Quarter, Belfast BT3 9DT',
    status: 'Operational',
    type: 'Cloud & colocation',
    notes: '£80M facility in Titanic Quarter Phase II',
    source: 'datacentercatalog.com / baxtel.com',
  },
  {
    name: 'EXA Belfast Titanic',
    coordinates: [-5.9124, 54.6037],
    operator: 'EXA Infrastructure',
    address: '6 Queens Road, Belfast BT3',
    status: 'Operational',
    type: 'Network PoP / edge',
    source: 'inflect.com / datacenters.com',
  },
  {
    name: 'CenterServ Belfast',
    coordinates: [-5.9237, 54.5958],
    operator: 'CenterServ',
    address: 'Forsyth House, Cromac Street, Belfast',
    status: 'Operational',
    type: 'Managed hosting',
    source: 'datacenters.com',
  },
  {
    name: 'The Belfast Datacentre',
    coordinates: [-5.9018, 54.6037],
    operator: 'The Belfast Datacentre',
    address: 'Belfast BT3',
    status: 'Under Construction',
    type: 'Colocation (planned)',
    notes: 'Currently accepting expressions of interest',
    source: 'datacentermap.com',
  },
  // --- Lisburn ---
  {
    name: 'Xperience Group — Lisburn Backup DC',
    coordinates: [-6.0926, 54.5117],
    operator: 'Xperience Group',
    address: '11 Ferguson Drive, Lisburn BT28 2EX',
    status: 'Operational',
    type: 'Backup / DR facility',
    source: 'datacentermap.com',
  },
  // --- Coleraine ---
  {
    name: 'Prescient Data Centres — Coleraine',
    coordinates: [-6.6855, 55.1534],
    operator: 'Prescient Data Centres',
    address: 'Atlantic Link Enterprise Campus, Coleraine BT52 1FA',
    status: 'Operational',
    tier: 'Tier III+',
    capacity_mw: 4.5,
    type: 'Carrier-neutral colocation',
    notes: 'NI\'s first commercial carrier-neutral DC. Adjacent to GTT transatlantic cable landing (Project Kelvin). Up to 27,000 sq ft.',
    source: 'datacentermap.com / colo-x.com / OpenStreetMap',
  },
]

export function useDataCentreData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
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

  return sites.map(site => ({
    ...site,
    score: site.status === 'Operational' ? 0.75 : 0.5,
  }))
}
