import { useMemo, useCallback } from 'react'
import { Map, useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { GeoJsonLayer, ColumnLayer, ScatterplotLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useFloodData } from '../hooks/useFloodData'
import { useBuildingData } from '../hooks/useBuildingData'
import { useGridData } from '../hooks/useGridData'
import { useDecayData } from '../hooks/useDecayData'
import { useDataCentreData } from '../hooks/useDataCentreData'
import { useTrafficData } from '../hooks/useTrafficData'
import { useUDIData } from '../hooks/useUDIData'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Globe stays at all zooms — fade Deck.gl layers in once the overlay
// aligns with the globe surface (zoom 10-11, where town names appear)
const FADE_IN_START = 10
const FADE_IN_END = 11

function DeckGLOverlay({ layers, getTooltip }) {
  const overlay = useControl(() => new MapboxOverlay({ layers, getTooltip }))
  overlay.setProps({ layers, getTooltip })
  return null
}

export default function MapView({ viewState, onViewStateChange, layers, seaLevelRise, udiPeriod, onFeatureClick }) {
  const floodData = useFloodData(seaLevelRise)
  const buildingData = useBuildingData()
  const gridData = useGridData()
  const decayData = useDecayData()
  const dataCentreData = useDataCentreData()
  const trafficData = useTrafficData()
  const { data: udiData } = useUDIData(udiPeriod)

  const deckLayers = useMemo(() => {
    // Hide all Deck.gl layers when in globe view
    if (viewState.zoom < FADE_IN_START) return []

    // Compute fade factor for smooth transition
    const fade = viewState.zoom >= FADE_IN_END
      ? 1
      : (viewState.zoom - FADE_IN_START) / (FADE_IN_END - FADE_IN_START)

    const result = []

    // UDI Overlay — red gradient by decay score
    if (layers.udi?.enabled && udiData) {
      result.push(
        new GeoJsonLayer({
          id: 'udi-layer',
          data: udiData,
          filled: true,
          stroked: true,
          extruded: false,
          opacity: layers.udi.opacity * fade,
          getFillColor: f => {
            const score = f.properties.udi ?? 0.5
            // Red gradient: low decay = transparent green-ish, high decay = solid red
            if (score < 0.2) return [40, 180, 80, 60]
            if (score < 0.35) return [120, 200, 60, 90]
            if (score < 0.45) return [240, 200, 40, 120]
            if (score < 0.55) return [240, 140, 30, 150]
            if (score < 0.65) return [220, 60, 30, 180]
            return [180, 20, 20, 220]
          },
          getLineColor: [255, 255, 255, 40],
          getLineWidth: 1,
          pickable: true,
          updateTriggers: {
            getFillColor: [udiPeriod],
          },
          onClick: ({ object }) => object && onFeatureClick({
            type: 'udi',
            properties: object.properties,
          }),
        })
      )
    }

    // 3D Buildings
    if (layers.buildings.enabled && buildingData) {
      result.push(
        new GeoJsonLayer({
          id: 'buildings-layer',
          data: buildingData,
          extruded: true,
          wireframe: false,
          opacity: layers.buildings.opacity * fade,
          getElevation: f => f.properties.height || f.properties.building_levels * 3.5 || 12,
          getFillColor: f => {
            const h = f.properties.height || 12
            const intensity = Math.min(255, 80 + h * 3)
            return [intensity * 0.3, intensity * 0.4, intensity * 0.7, 200]
          },
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'building',
            properties: object.properties,
            coordinates: object.geometry.coordinates,
          }),
        })
      )
    }

    // Flood Risk Layer
    if (layers.flood.enabled && floodData) {
      result.push(
        new GeoJsonLayer({
          id: 'flood-layer',
          data: floodData,
          filled: true,
          stroked: true,
          opacity: layers.flood.opacity * fade,
          getFillColor: f => {
            const risk = f.properties.risk_level || 'medium'
            if (risk === 'high') return [220, 38, 38, 160]
            if (risk === 'medium') return [59, 130, 246, 140]
            return [96, 165, 250, 100]
          },
          getLineColor: [59, 130, 246, 200],
          getLineWidth: 1,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'flood',
            properties: object.properties,
          }),
        })
      )
    }

    // Power Grid Layer
    if (layers.grid.enabled && gridData) {
      result.push(
        new GeoJsonLayer({
          id: 'grid-lines',
          data: gridData.lines,
          stroked: true,
          getLineColor: f => {
            const v = f.properties.voltage || 0
            if (v >= 275) return [255, 220, 50, 230]
            if (v >= 110) return [255, 165, 0, 200]
            if (v >= 33) return [234, 179, 8, 160]
            return [200, 160, 50, 120]
          },
          getLineWidth: f => {
            const v = f.properties.voltage || 0
            if (v >= 275) return 120
            if (v >= 110) return 60
            if (v >= 33) return 25
            return 10
          },
          widthMinPixels: 1,
          widthScale: 1,
          opacity: layers.grid.opacity * fade,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'power_line',
            properties: object.properties,
          }),
        })
      )
      result.push(
        new GeoJsonLayer({
          id: 'grid-substations',
          data: gridData.substations,
          filled: true,
          stroked: true,
          pointType: 'circle',
          getPointRadius: f => {
            const v = f.properties.voltage
            if (v >= 275) return 300
            if (v >= 110) return 180
            if (v >= 33) return 90
            return 50
          },
          pointRadiusMinPixels: 2,
          getFillColor: f => {
            const v = f.properties.voltage
            if (v >= 275) return [255, 240, 80, 240]
            if (v >= 110) return [255, 200, 40, 220]
            if (v >= 33) return [234, 170, 20, 200]
            return [200, 140, 50, 160]
          },
          getLineColor: [30, 30, 30, 200],
          getLineWidth: 1,
          opacity: layers.grid.opacity * fade,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'substation',
            properties: object.properties,
          }),
        })
      )
    }

    // Urban Decay Layer
    if (layers.decay.enabled && decayData) {
      result.push(
        new GeoJsonLayer({
          id: 'decay-layer',
          data: decayData,
          filled: true,
          stroked: true,
          opacity: layers.decay.opacity * fade,
          getFillColor: f => {
            const score = f.properties.deprivation_score || 0.5
            const r = Math.floor(180 + score * 75)
            const g = Math.floor(80 - score * 60)
            const b = Math.floor(60 - score * 40)
            return [r, g, b, Math.floor(100 + score * 100)]
          },
          getLineColor: [239, 68, 68, 150],
          getLineWidth: 1,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'decay',
            properties: object.properties,
          }),
        })
      )
    }

    // Data Centre Sites
    if (layers.datacentre.enabled && dataCentreData) {
      result.push(
        new ColumnLayer({
          id: 'datacentre-columns',
          data: dataCentreData,
          diskResolution: 12,
          radius: 50,
          extruded: true,
          elevationScale: 1,
          getPosition: d => d.coordinates,
          getFillColor: d => {
            const score = d.score || 0.5
            return [139, 92, 246, Math.floor(150 + score * 105)]
          },
          getElevation: d => (d.score || 0.5) * 200,
          opacity: layers.datacentre.opacity * fade,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'datacentre',
            properties: object,
          }),
        })
      )
    }

    // Traffic
    if (layers.traffic?.enabled && trafficData) {
      result.push(
        new ScatterplotLayer({
          id: 'traffic-layer',
          data: trafficData,
          getPosition: d => d.position,
          getRadius: 5,
          radiusUnits: 'meters',
          radiusMinPixels: 1.5,
          radiusMaxPixels: 6,
          billboard: false,
          antialiasing: false,
          getFillColor: d => {
            const c = d.congestion ?? 0.2
            if (c < 0.15) return [80, 220, 120, 220]
            if (c < 0.3) return [160, 230, 80, 210]
            if (c < 0.5) return [255, 220, 50, 210]
            if (c < 0.7) return [255, 150, 30, 220]
            return [255, 60, 60, 230]
          },
          opacity: (layers.traffic.opacity ?? 0.9) * fade,
          updateTriggers: {
            getPosition: trafficData,
            getFillColor: trafficData,
          },
        })
      )
    }

    return result
  }, [viewState.zoom, layers, floodData, buildingData, gridData, decayData, dataCentreData, trafficData, udiData, udiPeriod, seaLevelRise, onFeatureClick])

  const onMove = useCallback(evt => {
    onViewStateChange(evt.viewState)
  }, [onViewStateChange])

  const getTooltip = useCallback(({ object }) => {
    if (!object) return null
    const p = object.properties || object

    // UDI tooltip
    if (p.udi != null && p.SOA_NAME) {
      const pct = (v) => (v * 100).toFixed(0)
      const lines = [
        `<strong>${p.SOA_NAME}</strong>`,
        `<span style="font-size:11px;color:#94a3b8">${p.SOA_CODE}</span>`,
        `<br/><strong style="color:#f87171">UDI Score: ${pct(p.udi)}%</strong>`,
        `<div style="margin:4px 0;height:6px;background:#1e293b;border-radius:3px;overflow:hidden">` +
          `<div style="width:${pct(p.udi)}%;height:100%;background:linear-gradient(90deg,#22c55e,#eab308,#ef4444);border-radius:3px"></div></div>`,
        `Demographic: ${pct(p.demographic)}%`,
        `Crime: ${pct(p.crime)}%`,
        `Dereliction: ${pct(p.dereliction)}%`,
        `Housing: ${pct(p.housing)}%`,
      ]
      if (p.pop_2001) lines.push(`<br/>Pop: ${p.pop_2001?.toLocaleString()} (01) → ${p.pop_2011?.toLocaleString()} (11) → ${p.pop_2021?.toLocaleString()} (21)`)
      if (p.mdm_rank) lines.push(`NIMDM Rank: ${p.mdm_rank}/890`)
      if (p.listed_buildings) lines.push(`Listed Buildings: ${p.listed_buildings}`)
      if (p.harni_sites) lines.push(`Heritage at Risk: ${p.harni_sites}`)
      // Rent estimate for current period
      const rentKey = `rent_${udiPeriod}`
      if (p[rentKey]) lines.push(`<br/>Est. Rent: £${p[rentKey]}/mo (${udiPeriod})`)
      // Postcodes
      if (p.postcodes) lines.push(`<span style="font-size:10px;color:#64748b">Postcodes: ${p.postcodes}</span>`)
      return {
        html: `<div style="padding:10px;max-width:280px;line-height:1.5">${lines.join('<br/>')}</div>`,
        style: {
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          borderRadius: '10px',
          fontSize: '13px',
          border: '1px solid #334155',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }
      }
    }

    const lines = [`<strong>${p.name || p.type || p.building || 'Feature'}</strong>`]
    if (p.source) lines.push(`Source: ${p.source}`)
    if (p.voltage) lines.push(`Voltage: ${p.voltage}kV`)
    if (p.operator) lines.push(`Operator: ${p.operator}`)
    if (p.risk_level) lines.push(`Risk: ${p.risk_level}`)
    if (p.annual_average_damage) lines.push(`Annual damage: ${p.annual_average_damage}`)
    if (p.residential_at_risk_high) lines.push(`Properties at high risk: ${p.residential_at_risk_high.toLocaleString()}`)
    if (p.score) lines.push(`Score: ${(p.score * 100).toFixed(0)}%`)
    if (p.capacity_mw) lines.push(`Capacity: ${p.capacity_mw} MW`)
    if (p.status) lines.push(`Status: ${p.status}`)
    if (p.congestion != null && p.speed) lines.push(`Speed: ${Math.round(p.speed)} km/h (${Math.round(p.congestion * 100)}% congested)`)
    if (p.height) lines.push(`Height: ${p.height}m`)
    return {
      html: `<div style="padding:8px;max-width:300px">${lines.join('<br/>')}</div>`,
      style: {
        backgroundColor: '#1e293b',
        color: '#e2e8f0',
        borderRadius: '8px',
        fontSize: '13px',
        border: '1px solid #334155',
      }
    }
  }, [udiPeriod])

  return (
    <Map
      {...viewState}
      onMove={onMove}
      mapStyle={MAP_STYLE}
      projection="globe"
      renderWorldCopies={false}
      maxTileCacheSize={200}
      fog={{
        color: '#0f172a',
        'high-color': '#1e293b',
        'horizon-blend': 0.02,
        'space-color': '#0a0e1a',
        'star-intensity': 0.6,
      }}
      style={{ width: '100%', height: '100%' }}
      antialias
    >
      <DeckGLOverlay
        layers={deckLayers}
        getTooltip={getTooltip}
      />
    </Map>
  )
}
