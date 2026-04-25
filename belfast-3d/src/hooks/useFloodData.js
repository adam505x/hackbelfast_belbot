import { useState, useEffect, useMemo } from 'react'

const DFI_APSFR = 'https://utility.arcgis.com/usrsvcs/servers/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/0'

async function fetchAPSFRStats() {
  try {
    const params = new URLSearchParams({
      where: '1=1', geometry: '-8.2,54.0,-5.4,55.4',
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

// Buffer a polyline into a polygon
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
    const nx = -dy / len * width
    const ny = dx / len * width
    left.push([coords[i][0] + nx, coords[i][1] + ny])
    right.push([coords[i][0] - nx, coords[i][1] - ny])
  }

  right.reverse()
  return [...left, ...right, left[0]]
}

// Slice a coordinate array by index range (no overlaps)
function sliceByIndex(coords, startIdx, endIdx) {
  return coords.slice(startIdx, endIdx + 1)
}

// Flood zone definitions referencing real river paths by index ranges
// Lagan indices: 0=upstream, 127=Stranmillis, 158=Ormeau, 180=Weir, 184=Titanic, 187=Harbour, 189=end
const ZONE_DEFS = [
  {
    name: 'River Lagan — Stranmillis to Ormeau',
    river: 'Lagan', startIdx: 127, endIdx: 158,
    risk: 'high', source: 'Fluvial', base: 2.0, width: 0.0010,
  },
  {
    name: 'River Lagan — Ormeau to Lagan Weir',
    river: 'Lagan', startIdx: 158, endIdx: 180,
    risk: 'high', source: 'Fluvial/Tidal', base: 1.5, width: 0.0013,
  },
  {
    name: 'River Lagan — Weir to Titanic Quarter',
    river: 'Lagan', startIdx: 180, endIdx: 187,
    risk: 'high', source: 'Tidal', base: 1.0, width: 0.0018,
  },
  {
    name: 'Belfast Harbour — Docks to Lough',
    river: 'Lagan', startIdx: 187, endIdx: 189,
    risk: 'high', source: 'Tidal/Coastal', base: 0.5, width: 0.0025,
  },
  {
    name: 'Connswater — East Belfast',
    river: 'Connswater', startIdx: 0, endIdx: -1,
    risk: 'medium', source: 'Fluvial', base: 2.5, width: 0.0008,
  },
  {
    name: 'Blackstaff River — Source to Bog Meadows',
    river: 'Blackstaff', startIdx: 0, endIdx: 60,
    risk: 'medium', source: 'Fluvial', base: 4.0, width: 0.0007,
  },
  {
    name: 'Blackstaff River — Bog Meadows to City Centre',
    river: 'Blackstaff', startIdx: 60, endIdx: -1,
    risk: 'medium', source: 'Fluvial/Pluvial', base: 3.5, width: 0.0009,
  },
  {
    name: 'Farset River — Culverted City Centre',
    river: 'Farset', startIdx: 0, endIdx: -1,
    risk: 'low', source: 'Pluvial', base: 5.0, width: 0.0005,
  },
]

export function useFloodData(seaLevelRise = 0) {
  const [apsfr, setApsfr] = useState(null)
  const [rivers, setRivers] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchAPSFRStats().then(s => { if (!cancelled) setApsfr(s) })
    fetch('/belfast-rivers.json').then(r => r.json()).then(d => { if (!cancelled) setRivers(d) })
    return () => { cancelled = true }
  }, [])

  const data = useMemo(() => {
    if (!rivers) return { type: 'FeatureCollection', features: [] }

    const features = []
    const bStats = apsfr?.find(s => s.settlement === 'Belfast')

    for (const zone of ZONE_DEFS) {
      const showAtRise = zone.base <= (3 + seaLevelRise * 1.5)
      if (!showAtRise) continue

      const riverCoords = rivers[zone.river]
      if (!riverCoords || riverCoords.length < 2) continue

      // Slice the river by index range (no overlaps)
      const end = zone.endIdx === -1 ? riverCoords.length - 1 : zone.endIdx
      const sliced = sliceByIndex(riverCoords, zone.startIdx, end)
      if (sliced.length < 2) continue

      const riseExpansion = Math.max(0, seaLevelRise * 0.0003)
      const ring = bufferLine(sliced, zone.width + riseExpansion)
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
            ? `${Math.max(0, seaLevelRise - zone.base + 1.5).toFixed(1)}m` : null,
          scenario: seaLevelRise === 0 ? 'Present day' : `+${seaLevelRise}m sea level`,
          belfast_properties_at_risk: bStats?.rp_high,
          belfast_annual_damage: bStats?.aad ? `£${(bStats.aad / 1e6).toFixed(1)}M` : null,
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      })
    }

    // Area-based coastal/tidal flood zones
    // Polygons traced from OSM coastline data — land side only
    // Coastline reference points verified against OSM natural=coastline
    const AREA_ZONES = [
      {
        // Queens Island / Titanic Quarter — reclaimed land between Lagan and Musgrave Channel
        // West boundary: Lagan river. East boundary: Musgrave Channel. Land only.
        name: 'Titanic Quarter — Queens Island',
        risk: 'high', source: 'Tidal/Coastal', base: 1.0,
        coords: [
          // South tip (near Lagan Weir)
          [-5.9115, 54.6057], [-5.9100, 54.6060],
          // West coast (Lagan side) going north
          [-5.9085, 54.6066], [-5.9050, 54.6080], [-5.9020, 54.6095],
          [-5.9000, 54.6105], [-5.8983, 54.6103],
          // North end (near Victoria Channel)
          [-5.8960, 54.6100], [-5.8940, 54.6105],
          // East coast (Musgrave Channel side) going south
          [-5.8928, 54.6095], [-5.8920, 54.6085], [-5.8930, 54.6070],
          [-5.8960, 54.6065], [-5.9000, 54.6060],
          // Back to start
          [-5.9050, 54.6058], [-5.9115, 54.6057],
        ],
      },
      {
        // Harbour estate — west side of harbour, Pollock/York/Barnett docks
        // Bounded by coastline on east, Duncrue Street on west
        name: 'Belfast Harbour — West Docks',
        risk: 'high', source: 'Tidal/Coastal', base: 0.5,
        coords: [
          // South (near Clarendon Dock)
          [-5.9186, 54.6128], [-5.9156, 54.6158],
          // West coast going north (from OSM coastline)
          [-5.9150, 54.6170], [-5.9140, 54.6190],
          [-5.9120, 54.6210], [-5.9100, 54.6230],
          [-5.9090, 54.6260],
          // North end
          [-5.9070, 54.6280], [-5.9068, 54.6326],
          // Inland boundary (Duncrue St / Dargan Rd)
          [-5.9130, 54.6320], [-5.9170, 54.6280],
          [-5.9200, 54.6240], [-5.9210, 54.6200],
          [-5.9200, 54.6160], [-5.9186, 54.6128],
        ],
      },
      {
        // East harbour — oil terminals, container port
        // Bounded by Musgrave Channel on west, Belfast Lough on east
        name: 'Belfast Harbour — East Terminal',
        risk: 'high', source: 'Tidal/Coastal', base: 0.5,
        coords: [
          // South (near Victoria Park)
          [-5.8880, 54.6104], [-5.8870, 54.6130],
          // East coast going north (from OSM coastline)
          [-5.8870, 54.6155], [-5.8870, 54.6190],
          [-5.8890, 54.6225], [-5.8928, 54.6223],
          // North
          [-5.8965, 54.6232], [-5.8950, 54.6260],
          // Inland boundary
          [-5.8920, 54.6240], [-5.8900, 54.6200],
          [-5.8890, 54.6160], [-5.8885, 54.6120],
          [-5.8880, 54.6104],
        ],
      },
      {
        // North Foreshore — former landfill, very low-lying
        name: 'North Foreshore — Dargan Road',
        risk: 'medium', source: 'Tidal', base: 1.8,
        coords: [
          // From OSM coastline around North Foreshore
          [-5.9068, 54.6326], [-5.9050, 54.6350],
          [-5.9020, 54.6380], [-5.8990, 54.6400],
          [-5.8950, 54.6390], [-5.8900, 54.6370],
          [-5.8870, 54.6350], [-5.8870, 54.6320],
          [-5.8900, 54.6300], [-5.8950, 54.6290],
          [-5.8986, 54.6301], [-5.9068, 54.6326],
        ],
      },
      {
        // Sydenham — low-lying area east of harbour, includes airport
        name: 'Sydenham — Belfast City Airport',
        risk: 'low', source: 'Tidal', base: 3.0,
        coords: [
          // From OSM coastline along east bank
          [-5.8809, 54.6090], [-5.8789, 54.6094],
          [-5.8750, 54.6120], [-5.8720, 54.6160],
          [-5.8700, 54.6200], [-5.8663, 54.6353],
          // Inland boundary (Sydenham Bypass / A2)
          [-5.8700, 54.6340], [-5.8750, 54.6280],
          [-5.8780, 54.6220], [-5.8800, 54.6160],
          [-5.8810, 54.6110], [-5.8809, 54.6090],
        ],
      },
    ]

    for (const zone of AREA_ZONES) {
      if (zone.base > 3 + seaLevelRise * 1.5) continue
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
            ? `${Math.max(0, seaLevelRise - zone.base + 1.5).toFixed(1)}m` : null,
          scenario: seaLevelRise === 0 ? 'Present day' : `+${seaLevelRise}m sea level`,
        },
        geometry: { type: 'Polygon', coordinates: [zone.coords] },
      })
    }

    return { type: 'FeatureCollection', features }
  }, [seaLevelRise, apsfr, rivers])

  return data
}
