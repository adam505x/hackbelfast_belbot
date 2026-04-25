import { useState, useEffect, useMemo } from 'react'

// DfI NI ArcGIS — Floods Directive 2nd Cycle (stats only, no geometry)
const DFI_APSFR = 'https://utility.arcgis.com/usrsvcs/servers/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/0'

const NI_BBOX = '-8.2,54.0,-5.4,55.4'

async function fetchAPSFRStats() {
  try {
    const params = new URLSearchParams({
      where: '1=1', geometry: NI_BBOX,
      geometryType: 'esriGeometryEnvelope', inSR: '4326', outSR: '4326',
      outFields: '*', f: 'json', resultRecordCount: '50', returnGeometry: 'false',
    })
    const res = await fetch(`${DFI_APSFR}/query?${params}`)
    const data = await res.json()
    if (data.features) {
      return data.features.map(f => {
        const a = f.attributes || {}
        return { settlement: a.Settlement, rank: a.GlobalRank, rp_high: a.RP_Count_H, aad: a.SUM_SUM_Total_AAD }
      })
    }
  } catch {}
  return null
}

// Create a flood polygon by buffering a river centreline
// coords = [[lng,lat],...], width = buffer in degrees (~0.001 = ~80m)
function bufferLine(coords, width) {
  if (coords.length < 2) return []
  const left = []
  const right = []

  for (let i = 0; i < coords.length; i++) {
    let dx, dy
    if (i === 0) {
      dx = coords[1][0] - coords[0][0]
      dy = coords[1][1] - coords[0][1]
    } else if (i === coords.length - 1) {
      dx = coords[i][0] - coords[i - 1][0]
      dy = coords[i][1] - coords[i - 1][1]
    } else {
      dx = coords[i + 1][0] - coords[i - 1][0]
      dy = coords[i + 1][1] - coords[i - 1][1]
    }
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    // Perpendicular normal
    const nx = -dy / len * width
    const ny = dx / len * width

    left.push([coords[i][0] + nx, coords[i][1] + ny])
    right.push([coords[i][0] - nx, coords[i][1] - ny])
  }

  // Close the polygon: left forward, right backward
  right.reverse()
  const ring = [...left, ...right, left[0]]
  return ring
}

export function useFloodData(seaLevelRise = 0) {
  const [apsfr, setApsfr] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchAPSFRStats().then(s => { if (!cancelled) setApsfr(s) })
    return () => { cancelled = true }
  }, [])

  const data = useMemo(() => {
    const features = []
    const bStats = apsfr?.find(s => s.settlement === 'Belfast')

    // Flood zones defined by real river centrelines from OSM
    // Each zone: centreline coords, buffer width, metadata
    const zones = [
      // River Lagan — Stranmillis to Ormeau (from OSM Lagan waypoints)
      {
        name: 'River Lagan — Stranmillis to Ormeau',
        risk: 'high', source: 'Fluvial', base: 2.0, width: 0.0012,
        line: [
          [-5.9314, 54.5946], [-5.9281, 54.5794], [-5.9253, 54.5700],
          [-5.9190, 54.5874], [-5.9190, 54.5900], [-5.9210, 54.5831],
        ],
      },
      // Use the actual OSM Lagan path through the city
      {
        name: 'River Lagan — Ormeau Bridge to Lagan Weir',
        risk: 'high', source: 'Fluvial/Tidal', base: 1.5, width: 0.0015,
        line: [
          [-5.9190, 54.5874], [-5.9190, 54.5900], [-5.9200, 54.5930],
          [-5.9199, 54.5988], [-5.9203, 54.6012],
        ],
      },
      // Lagan — Weir to Harbour (tidal section)
      {
        name: 'River Lagan — Weir to Belfast Lough',
        risk: 'high', source: 'Tidal', base: 1.0, width: 0.0020,
        line: [
          [-5.9203, 54.6012], [-5.9202, 54.6020], [-5.9197, 54.6028],
          [-5.9191, 54.6036], [-5.9166, 54.6060], [-5.9127, 54.6089],
          [-5.9093, 54.6114], [-5.9081, 54.6123],
        ],
      },
      // Belfast Harbour / Docks area
      {
        name: 'Belfast Harbour — Docks & Sailortown',
        risk: 'high', source: 'Tidal', base: 0.5, width: 0.0025,
        line: [
          [-5.9081, 54.6123], [-5.9050, 54.6150], [-5.9020, 54.6180],
          [-5.8970, 54.6230], [-5.8940, 54.6260],
        ],
      },
      // Titanic Quarter (low-lying reclaimed land)
      {
        name: 'Titanic Quarter — Queens Island',
        risk: 'high', source: 'Tidal', base: 1.0, width: 0.0018,
        line: [
          [-5.9120, 54.6040], [-5.9080, 54.6050], [-5.9040, 54.6065],
          [-5.9000, 54.6080], [-5.8960, 54.6090],
        ],
      },
      // Connswater — from OSM path
      {
        name: 'Connswater — Victoria Park to Lagan',
        risk: 'medium', source: 'Fluvial', base: 2.5, width: 0.0010,
        line: [
          [-5.8860, 54.5953], [-5.8900, 54.5970], [-5.8940, 54.5990],
          [-5.8970, 54.6010], [-5.8960, 54.6040], [-5.8960, 54.6070],
        ],
      },
      // Blackstaff River — from OSM path (flows NE through Falls/Grosvenor to Lagan)
      {
        name: 'Blackstaff River — Falls to City Centre',
        risk: 'medium', source: 'Fluvial', base: 4.0, width: 0.0008,
        line: [
          [-5.9881, 54.5783], [-5.9827, 54.5716], [-5.9781, 54.5724],
          [-5.9719, 54.5730], [-5.9689, 54.5740], [-5.9650, 54.5770],
          [-5.9630, 54.5810], [-5.9621, 54.5832], [-5.9601, 54.5867],
          [-5.9601, 54.5870], [-5.9322, 54.5936],
        ],
      },
      // Bog Meadows (wetland area along Blackstaff)
      {
        name: 'Bog Meadows Nature Reserve',
        risk: 'medium', source: 'Pluvial', base: 3.5, width: 0.0015,
        line: [
          [-5.9690, 54.5740], [-5.9650, 54.5760], [-5.9620, 54.5790],
          [-5.9600, 54.5820],
        ],
      },
      // North Foreshore / Dargan Road
      {
        name: 'North Foreshore — Dargan Road',
        risk: 'medium', source: 'Tidal', base: 1.8, width: 0.0015,
        line: [
          [-5.9185, 54.6300], [-5.9130, 54.6320], [-5.9092, 54.6296],
          [-5.9050, 54.6280],
        ],
      },
      // Sydenham / Airport
      {
        name: 'Sydenham — Belfast City Airport',
        risk: 'low', source: 'Tidal', base: 3.0, width: 0.0012,
        line: [
          [-5.8870, 54.6093], [-5.8820, 54.6120], [-5.8770, 54.6150],
          [-5.8700, 54.6200],
        ],
      },
    ]

    for (const zone of zones) {
      const showAtRise = zone.base <= (3 + seaLevelRise * 1.5)
      if (!showAtRise) continue

      // Widen buffer with sea level rise
      const riseExpansion = Math.max(0, seaLevelRise * 0.0003)
      const ring = bufferLine(zone.line, zone.width + riseExpansion)
      if (ring.length < 4) continue

      const effectiveRisk = seaLevelRise > zone.base ? 'high' :
        seaLevelRise > zone.base * 0.5 ? 'medium' : zone.risk

      features.push({
        type: 'Feature',
        properties: {
          name: zone.name,
          risk_level: effectiveRisk,
          source: `DfI Rivers — ${zone.source} flood risk`,
          base_elevation: zone.base,
          flood_depth: seaLevelRise > 0
            ? `${Math.max(0, seaLevelRise - zone.base + 1.5).toFixed(1)}m`
            : null,
          scenario: seaLevelRise === 0 ? 'Present day' : `+${seaLevelRise}m sea level`,
          belfast_properties_at_risk: bStats?.rp_high,
          belfast_annual_damage: bStats?.aad ? `£${(bStats.aad / 1e6).toFixed(1)}M` : null,
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      })
    }

    return { type: 'FeatureCollection', features }
  }, [seaLevelRise, apsfr])

  return data
}
