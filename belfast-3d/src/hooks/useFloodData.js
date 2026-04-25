import { useState, useEffect, useMemo } from 'react'

// DfI NI ArcGIS endpoints (org: i8LHQZrSk9zIffRU)
const DFI_ENDPOINTS = {
  // Floods Directive 2nd Cycle — Areas of Potential Significant Flood Risk
  apsfr: 'https://utility.arcgis.com/usrsvcs/servers/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/0',
  // Tidal APSFR
  tapsfr: 'https://utility.arcgis.com/usrsvcs/servers/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/1',
  // August 2017 flood event — 1504 actual flooded area polygons
  flooded2017: 'https://services1.arcgis.com/i8LHQZrSk9zIffRU/arcgis/rest/services/Flooded_Area_201708/FeatureServer/0',
}

// All of Northern Ireland bounding box
const NI_BBOX = '-8.2,54.0,-5.4,55.4'
// Belfast focused bbox
const BELFAST_BBOX = '-5.98,54.56,-5.84,54.64'

async function queryArcGIS(url, bbox = NI_BBOX, maxRecords = 500) {
  const params = new URLSearchParams({
    where: '1=1',
    geometry: bbox,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    f: 'geojson',
    resultRecordCount: String(maxRecords),
  })
  const res = await fetch(`${url}/query?${params}`)
  if (!res.ok) throw new Error(`ArcGIS ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

export function useFloodData(seaLevelRise = 0) {
  const [realData, setRealData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch real DfI data once on mount
  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      const results = {
        apsfr: null,
        tapsfr: null,
        flooded2017: null,
      }

      const fetches = [
        // 12 APSFR zones across NI (Belfast, Derry, Newry, Lurgan, etc.)
        queryArcGIS(DFI_ENDPOINTS.apsfr, NI_BBOX, 50)
          .then(d => { results.apsfr = d })
          .catch(e => console.warn('APSFR fetch failed:', e)),
        // 9 Tidal APSFR zones
        queryArcGIS(DFI_ENDPOINTS.tapsfr, NI_BBOX, 50)
          .then(d => { results.tapsfr = d })
          .catch(e => console.warn('TAPSFR fetch failed:', e)),
        // 2017 flood event polygons — Belfast area only for performance
        queryArcGIS(DFI_ENDPOINTS.flooded2017, BELFAST_BBOX, 500)
          .then(d => { results.flooded2017 = d })
          .catch(e => console.warn('Flooded 2017 fetch failed:', e)),
      ]

      await Promise.allSettled(fetches)
      if (!cancelled) {
        setRealData(results)
        setLoading(false)
        const counts = Object.entries(results)
          .map(([k, v]) => `${k}: ${v?.features?.length ?? 0}`)
          .join(', ')
        console.log(`Flood data loaded — ${counts}`)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [])

  // Combine real data + sea level simulation
  const data = useMemo(() => {
    const features = []

    // APSFR — Areas of Potential Significant Flood Risk (fluvial)
    if (realData?.apsfr?.features) {
      for (const f of realData.apsfr.features) {
        const p = f.properties || {}
        features.push({
          ...f,
          properties: {
            name: p.Settlement || 'APSFR Zone',
            risk_level: 'high',
            source: 'DfI Rivers — Floods Directive 2nd Cycle (Fluvial)',
            global_rank: p.GlobalRank,
            residential_at_risk_high: p.RP_Count_H,
            residential_at_risk_medium: p.RP_Count_M,
            residential_at_risk_low: p.RP_Count_L,
            annual_average_damage: p.SUM_SUM_Total_AAD
              ? `£${(p.SUM_SUM_Total_AAD / 1e6).toFixed(1)}M`
              : null,
            key_infrastructure_high: p.Total_KeyInfrastructure_H,
          },
        })
      }
    }

    // TAPSFR — Tidal APSFR zones
    if (realData?.tapsfr?.features) {
      for (const f of realData.tapsfr.features) {
        const p = f.properties || {}
        features.push({
          ...f,
          properties: {
            name: p.Settlement || 'TAPSFR Zone',
            risk_level: seaLevelRise > 1 ? 'high' : 'medium',
            source: 'DfI Rivers — Floods Directive 2nd Cycle (Tidal)',
            global_rank: p.GlobalRank,
            residential_at_risk_high: p.RP_Count_H,
            annual_average_damage: p.SUM_SUM_Total_AAD
              ? `£${(p.SUM_SUM_Total_AAD / 1e6).toFixed(1)}M`
              : null,
          },
        })
      }
    }

    // August 2017 flood event — actual flooded areas
    if (realData?.flooded2017?.features) {
      for (const f of realData.flooded2017.features) {
        const p = f.properties || {}
        features.push({
          ...f,
          properties: {
            name: p.Name || p.LOCATION || 'Flooded Area (Aug 2017)',
            risk_level: 'high',
            source: 'DfI Rivers — August 2017 Flood Event',
            event_date: 'August 2017',
            area: p.Shape__Area ? `${p.Shape__Area.toFixed(0)} m²` : null,
          },
        })
      }
    }

    // Sea level rise simulation overlay
    if (seaLevelRise > 0) {
      const simZones = generateSeaLevelZones(seaLevelRise)
      features.push(...simZones)
    }

    return { type: 'FeatureCollection', features }
  }, [realData, seaLevelRise])

  return data
}

// Generate sea level rise simulation zones for NI coastal areas
function generateSeaLevelZones(rise) {
  const coastalAreas = [
    {
      name: 'Belfast Lough — Titanic Quarter',
      base: 1.0,
      coords: [
        [-5.915, 54.602], [-5.908, 54.603], [-5.902, 54.605],
        [-5.896, 54.608], [-5.898, 54.611], [-5.905, 54.610],
        [-5.912, 54.607], [-5.916, 54.604], [-5.915, 54.602],
      ],
    },
    {
      name: 'Belfast Harbour & Docks',
      base: 0.5,
      coords: [
        [-5.922, 54.608], [-5.915, 54.609], [-5.910, 54.612],
        [-5.908, 54.616], [-5.912, 54.618], [-5.918, 54.617],
        [-5.923, 54.614], [-5.925, 54.611], [-5.922, 54.608],
      ],
    },
    {
      name: 'Lagan Corridor — City Centre',
      base: 1.5,
      coords: [
        [-5.930, 54.596], [-5.925, 54.597], [-5.921, 54.598],
        [-5.919, 54.600], [-5.920, 54.602], [-5.924, 54.603],
        [-5.929, 54.601], [-5.932, 54.599], [-5.930, 54.596],
      ],
    },
    {
      name: 'Carrickfergus Waterfront',
      base: 1.2,
      coords: [
        [-5.810, 54.714], [-5.803, 54.715], [-5.798, 54.717],
        [-5.800, 54.720], [-5.806, 54.719], [-5.812, 54.717],
        [-5.810, 54.714],
      ],
    },
    {
      name: 'Larne Harbour',
      base: 1.0,
      coords: [
        [-5.800, 54.850], [-5.793, 54.851], [-5.790, 54.854],
        [-5.793, 54.857], [-5.799, 54.856], [-5.803, 54.853],
        [-5.800, 54.850],
      ],
    },
    {
      name: 'Derry — Foyle Estuary',
      base: 1.5,
      coords: [
        [-7.330, 55.000], [-7.320, 55.002], [-7.315, 55.005],
        [-7.318, 55.008], [-7.326, 55.007], [-7.332, 55.004],
        [-7.330, 55.000],
      ],
    },
    {
      name: 'Newry — Carlingford Lough',
      base: 2.0,
      coords: [
        [-6.340, 54.170], [-6.332, 54.172], [-6.328, 54.175],
        [-6.330, 54.178], [-6.337, 54.177], [-6.342, 54.174],
        [-6.340, 54.170],
      ],
    },
    {
      name: 'Bangor Waterfront',
      base: 1.3,
      coords: [
        [-5.670, 54.660], [-5.663, 54.661], [-5.660, 54.663],
        [-5.662, 54.666], [-5.668, 54.665], [-5.672, 54.663],
        [-5.670, 54.660],
      ],
    },
    {
      name: 'Warrenpoint — Carlingford',
      base: 1.0,
      coords: [
        [-6.255, 54.100], [-6.248, 54.101], [-6.245, 54.103],
        [-6.247, 54.106], [-6.253, 54.105], [-6.257, 54.103],
        [-6.255, 54.100],
      ],
    },
    {
      name: 'Strangford Lough — Portaferry',
      base: 1.5,
      coords: [
        [-5.555, 54.385], [-5.548, 54.386], [-5.545, 54.389],
        [-5.548, 54.392], [-5.554, 54.391], [-5.558, 54.388],
        [-5.555, 54.385],
      ],
    },
  ]

  return coastalAreas
    .filter(z => z.base <= rise + 1)
    .map(zone => {
      const expansion = Math.max(0, (rise - zone.base) * 0.0004)
      const cx = zone.coords.reduce((s, c) => s + c[0], 0) / zone.coords.length
      const cy = zone.coords.reduce((s, c) => s + c[1], 0) / zone.coords.length
      const expanded = zone.coords.map(([lng, lat]) => [
        lng + (lng - cx) * expansion,
        lat + (lat - cy) * expansion,
      ])

      return {
        type: 'Feature',
        properties: {
          name: zone.name,
          risk_level: rise > zone.base ? 'high' : 'medium',
          source: `Sea Level Rise Simulation (+${rise}m)`,
          base_elevation: zone.base,
          flood_depth: `${Math.max(0, rise - zone.base + 1).toFixed(1)}m`,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [expanded],
        },
      }
    })
}
