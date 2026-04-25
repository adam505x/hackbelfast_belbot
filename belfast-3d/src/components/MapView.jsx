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

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Deck.gl overlay that renders inside MapLibre's GL context
function DeckGLOverlay(props) {
  const overlay = useControl(() => new MapboxOverlay(props))
  overlay.setProps(props)
  return null
}

export default function MapView({ viewState, onViewStateChange, layers, seaLevelRise, onFeatureClick }) {
  const floodData = useFloodData(seaLevelRise)
  const buildingData = useBuildingData()
  const gridData = useGridData()
  const decayData = useDecayData()
  const dataCentreData = useDataCentreData()
  const trafficData = useTrafficData()

  const deckLayers = useMemo(() => {
    const result = []

    // 3D Buildings
    if (layers.buildings.enabled && buildingData) {
      result.push(
        new GeoJsonLayer({
          id: 'buildings-layer',
          data: buildingData,
          extruded: true,
          wireframe: false,
          opacity: layers.buildings.opacity,
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
          opacity: layers.flood.opacity,
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
          opacity: layers.grid.opacity,
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
          opacity: layers.grid.opacity,
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
          opacity: layers.decay.opacity,
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
          opacity: layers.datacentre.opacity,
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
          getRadius: 3,
          radiusUnits: 'pixels',
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
          opacity: layers.traffic.opacity ?? 0.9,
          parameters: { depthTest: false },
          updateTriggers: {
            getPosition: trafficData,
            getFillColor: trafficData,
          },
        })
      )
    }

    return result
  }, [layers, floodData, buildingData, gridData, decayData, dataCentreData, trafficData, seaLevelRise, onFeatureClick])

  const onMove = useCallback(evt => {
    onViewStateChange(evt.viewState)
  }, [onViewStateChange])

  const getTooltip = useCallback(({ object }) => {
    if (!object) return null
    const p = object.properties || object
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
  }, [])

  return (
    <Map
      {...viewState}
      onMove={onMove}
      mapStyle={MAP_STYLE}
      projection="globe"
      fog={{
        color: '#0f172a',
        'high-color': '#1e293b',
        'horizon-blend': 0.05,
        'space-color': '#0a0e1a',
        'star-intensity': 0.6,
      }}
      style={{ width: '100%', height: '100%' }}
      antialias
    >
      <DeckGLOverlay
        layers={deckLayers}
        getTooltip={getTooltip}
        interleaved
      />
    </Map>
  )
}
