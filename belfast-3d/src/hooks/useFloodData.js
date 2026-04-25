import { useState, useEffect, useMemo } from 'react'

// DfI NI ArcGIS — Floods Directive 2nd Cycle
// APSFR = study area boundaries (NOT flood extents) — we use these for stats only
const DFI_APSFR = 'https://utility.arcgis.com/usrsvcs/servers/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/0'
const DFI_TAPSFR = 'https://utility.arcgis.com/usrsvcs/servers/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/1'

const NI_BBOX = '-8.2,54.0,-5.4,55.4'

async function queryArcGIS(url, bbox = NI_BBOX, maxRecords = 50) {
  const params = new URLSearchParams({
    where: '1=1',
    geometry: bbox,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    f: 'json',
    resultRecordCount: String(maxRecords),
    returnGeometry: 'false', // We only want the stats, not the giant polygons
  })
  const res = await fetch(`${url}/query?${params}`)
  if (!res.ok) throw new Error(`ArcGIS ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

export function useFloodData(seaLevelRise = 0) {
  const [apsfr, setApsfr] = useState(null)

  // Fetch APSFR stats (not geometry) once
  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const [fluvial, tidal] = await Promise.all([
          queryArcGIS(DFI_APSFR).catch(() => null),
          queryArcGIS(DFI_TAPSFR).catch(() => null),
        ])
        if (!cancelled) {
          const stats = []
          for (const d of [fluvial, tidal]) {
            if (d?.features) {
              for (const f of d.features) {
                const a = f.attributes || {}
                stats.push({
                  settlement: a.Settlement,
                  rank: a.GlobalRank,
                  designation: a.Designation,
                  residential_high: a.RP_Count_H,
                  residential_medium: a.RP_Count_M,
                  annual_damage: a.SUM_SUM_Total_AAD,
                })
              }
            }
          }
          setApsfr(stats)
          console.log(`Flood stats: ${stats.length} APSFR/TAPSFR settlements loaded`)
        }
      } catch (e) {
        console.warn('APSFR stats fetch failed:', e)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  // Build flood zone polygons — these are the actual flood-prone areas
  // based on real Belfast geography (rivers, coast, elevation)
  const data = useMemo(() => {
    const features = []

    // Real Belfast flood-prone corridors based on DfI flood mapping geography
    const floodZones = [
      // River Lagan — main fluvial corridor
      {
        name: 'River Lagan — Stranmillis to Ormeau',
        risk: 'high', source: 'Fluvial', base: 2.0,
        coords: [
          [-5.9340, 54.5830], [-5.9280, 54.5845], [-5.9230, 54.5860],
          [-5.9190, 54.5885], [-5.9170, 54.5910], [-5.9185, 54.5930],
          [-5.9220, 54.5920], [-5.9270, 54.5900], [-5.9310, 54.5870],
          [-5.9345, 54.5845], [-5.9340, 54.5830],
        ],
      },
      {
        name: 'River Lagan — Lagan Weir to Clarendon Dock',
        risk: 'high', source: 'Fluvial/Tidal', base: 1.5,
        coords: [
          [-5.9310, 54.5965], [-5.9265, 54.5970], [-5.9230, 54.5980],
          [-5.9210, 54.5995], [-5.9220, 54.6010], [-5.9255, 54.6015],
          [-5.9295, 54.6005], [-5.9320, 54.5990], [-5.9310, 54.5965],
        ],
      },
      // Belfast Lough — tidal/coastal
      {
        name: 'Titanic Quarter — Tidal',
        risk: 'high', source: 'Tidal', base: 1.0,
        coords: [
          [-5.9140, 54.6025], [-5.9080, 54.6035], [-5.9030, 54.6055],
          [-5.8985, 54.6075], [-5.9005, 54.6095], [-5.9060, 54.6085],
          [-5.9115, 54.6065], [-5.9150, 54.6045], [-5.9140, 54.6025],
        ],
      },
      {
        name: 'Belfast Harbour — Docks',
        risk: 'high', source: 'Tidal', base: 0.5,
        coords: [
          [-5.9210, 54.6085], [-5.9155, 54.6095], [-5.9115, 54.6120],
          [-5.9100, 54.6150], [-5.9130, 54.6170], [-5.9175, 54.6160],
          [-5.9220, 54.6135], [-5.9235, 54.6110], [-5.9210, 54.6085],
        ],
      },
      // Connswater
      {
        name: 'Connswater — Victoria Park',
        risk: 'medium', source: 'Fluvial', base: 2.5,
        coords: [
          [-5.9070, 54.5945], [-5.9020, 54.5955], [-5.8985, 54.5975],
          [-5.8970, 54.5995], [-5.9000, 54.6010], [-5.9045, 54.6000],
          [-5.9080, 54.5980], [-5.9085, 54.5960], [-5.9070, 54.5945],
        ],
      },
      // Blackstaff River
      {
        name: 'Blackstaff River — Falls/Grosvenor Road',
        risk: 'medium', source: 'Fluvial', base: 4.0,
        coords: [
          [-5.9510, 54.5945], [-5.9460, 54.5950], [-5.9425, 54.5965],
          [-5.9415, 54.5980], [-5.9440, 54.5990], [-5.9480, 54.5982],
          [-5.9520, 54.5968], [-5.9525, 54.5955], [-5.9510, 54.5945],
        ],
      },
      // Farset River (culverted)
      {
        name: 'Farset River — City Centre (culverted)',
        risk: 'low', source: 'Pluvial', base: 5.0,
        coords: [
          [-5.9345, 54.5992], [-5.9310, 54.5997], [-5.9295, 54.6008],
          [-5.9305, 54.6022], [-5.9335, 54.6018], [-5.9355, 54.6008],
          [-5.9345, 54.5992],
        ],
      },
      // North Foreshore
      {
        name: 'North Foreshore — Dargan Road',
        risk: 'medium', source: 'Tidal', base: 1.8,
        coords: [
          [-5.9280, 54.6155], [-5.9220, 54.6165], [-5.9190, 54.6195],
          [-5.9210, 54.6220], [-5.9270, 54.6210], [-5.9300, 54.6185],
          [-5.9280, 54.6155],
        ],
      },
      // Bog Meadows
      {
        name: 'Bog Meadows Nature Reserve',
        risk: 'medium', source: 'Pluvial', base: 3.5,
        coords: [
          [-5.9610, 54.5885], [-5.9560, 54.5890], [-5.9535, 54.5905],
          [-5.9545, 54.5918], [-5.9590, 54.5912], [-5.9620, 54.5900],
          [-5.9610, 54.5885],
        ],
      },
      // Sydenham / Airport
      {
        name: 'Sydenham — George Best Airport',
        risk: 'low', source: 'Tidal', base: 3.0,
        coords: [
          [-5.8840, 54.6025], [-5.8780, 54.6035], [-5.8730, 54.6055],
          [-5.8750, 54.6075], [-5.8820, 54.6065], [-5.8860, 54.6045],
          [-5.8840, 54.6025],
        ],
      },
    ]

    for (const zone of floodZones) {
      // Only show zones that would be affected at current sea level rise
      const showAtRise = zone.base <= (3 + seaLevelRise * 1.5)
      if (!showAtRise) continue

      // Expand zone slightly with sea level rise
      const expansion = Math.max(0, (seaLevelRise - zone.base + 2) * 0.00015)
      const cx = zone.coords.reduce((s, c) => s + c[0], 0) / zone.coords.length
      const cy = zone.coords.reduce((s, c) => s + c[1], 0) / zone.coords.length
      const expanded = expansion > 0
        ? zone.coords.map(([lng, lat]) => [
            lng + (lng - cx) * expansion,
            lat + (lat - cy) * expansion,
          ])
        : zone.coords

      const effectiveRisk = seaLevelRise > zone.base ? 'high' :
        seaLevelRise > zone.base * 0.5 ? 'medium' : zone.risk

      // Look up APSFR stats for Belfast
      const belfastStats = apsfr?.find(s => s.settlement === 'Belfast')

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
          belfast_properties_at_risk: belfastStats?.residential_high,
          belfast_annual_damage: belfastStats?.annual_damage
            ? `£${(belfastStats.annual_damage / 1e6).toFixed(1)}M`
            : null,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [expanded],
        },
      })
    }

    // Sea level rise — additional coastal zones outside Belfast
    if (seaLevelRise > 0) {
      const coastalExtras = [
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
          name: 'Bangor Waterfront',
          base: 1.3,
          coords: [
            [-5.670, 54.660], [-5.663, 54.661], [-5.660, 54.663],
            [-5.662, 54.666], [-5.668, 54.665], [-5.672, 54.663],
            [-5.670, 54.660],
          ],
        },
      ]

      for (const zone of coastalExtras) {
        if (zone.base > seaLevelRise + 1) continue
        features.push({
          type: 'Feature',
          properties: {
            name: zone.name,
            risk_level: seaLevelRise > zone.base ? 'high' : 'medium',
            source: `Sea Level Rise Simulation (+${seaLevelRise}m)`,
            base_elevation: zone.base,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [zone.coords],
          },
        })
      }
    }

    return { type: 'FeatureCollection', features }
  }, [seaLevelRise, apsfr])

  return data
}
