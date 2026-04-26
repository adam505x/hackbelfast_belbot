import { useMemo, useCallback } from 'react'
import { Map, useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { GeoJsonLayer, ColumnLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useFloodData } from '../hooks/useFloodData'
import { useBuildingData } from '../hooks/useBuildingData'
import { useGridData } from '../hooks/useGridData'
import { useDataCentreData } from '../hooks/useDataCentreData'
import { useTrafficData } from '../hooks/useTrafficData'
import { useUDIData } from '../hooks/useUDIData'
import { useCompanyData } from '../hooks/useCompanyData'
import { useTransitData } from '../hooks/useTransitData'

const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const SAT_STYLE = 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'

function DeckGLOverlay({ layers }) {
  const overlay = useControl(() => new MapboxOverlay({ layers }))
  overlay.setProps({ layers })
  return null
}

export default function MapView({ viewState, onViewStateChange, layers, seaLevelRise, udiPeriod, nightMode, onFeatureClick }) {
  const floodData = useFloodData(seaLevelRise)
  const buildingData = useBuildingData(udiPeriod)
  const gridData = useGridData()
  const dataCentreData = useDataCentreData()
  const trafficData = useTrafficData()
  const { data: udiData } = useUDIData(udiPeriod)
  const companyData = useCompanyData(udiPeriod)
  const transitData = useTransitData()

  // Switch to satellite at high zoom, otherwise day/night
  const mapStyle = viewState.zoom >= 18 ? SAT_STYLE : (nightMode ? DARK_STYLE : LIGHT_STYLE)

  const deckLayers = useMemo(() => {
    const result = []
    const udiActive = layers.udi?.enabled

    // 3D Buildings — not pickable when UDI is active (so SOA clicks work)
    if (layers.buildings?.enabled && buildingData) {
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
          pickable: !udiActive,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'building',
            properties: object.properties,
            coordinates: object.geometry.coordinates,
          }),
        })
      )
    }

    // UDI Overlay — rendered AFTER buildings so it's on top for picking
    if (udiActive && udiData) {
      result.push(
        new GeoJsonLayer({
          id: 'udi-layer',
          data: udiData,
          filled: true,
          stroked: true,
          extruded: false,
          opacity: layers.udi.opacity,
          getFillColor: f => {
            const score = f.properties.udi ?? 0.5
            if (score < 0.20) return [40, 180, 80, 60]
            if (score < 0.30) return [120, 200, 60, 90]
            if (score < 0.42) return [240, 200, 40, 120]
            if (score < 0.55) return [240, 140, 30, 150]
            if (score < 0.66) return [220, 60, 30, 180]
            return [180, 20, 20, 220]
          },
          getLineColor: [255, 255, 255, 40],
          getLineWidth: 1,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 40],
          updateTriggers: { getFillColor: [udiPeriod] },
          onClick: ({ object }) => object && onFeatureClick({
            type: 'udi',
            properties: object.properties,
          }),
        })
      )
    }

    // Flood Risk — sea blue with ripple layers
    if (layers.flood?.enabled && floodData) {
      // Base water layer
      result.push(
        new GeoJsonLayer({
          id: 'flood-layer',
          data: floodData,
          filled: true,
          stroked: true,
          opacity: layers.flood.opacity * 0.7,
          getFillColor: [20, 100, 180, 140],
          getLineColor: [30, 140, 220, 180],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({ type: 'flood', properties: object.properties }),
        })
      )
      // Ripple layer 1 — lighter, slightly transparent
      result.push(
        new GeoJsonLayer({
          id: 'flood-ripple-1',
          data: floodData,
          filled: false,
          stroked: true,
          opacity: layers.flood.opacity * 0.4,
          getLineColor: [80, 180, 255, 120],
          getLineWidth: 6,
          lineWidthMinPixels: 1,
          getOffset: 1,
          pickable: false,
        })
      )
      // Ripple layer 2 — outer glow
      result.push(
        new GeoJsonLayer({
          id: 'flood-ripple-2',
          data: floodData,
          filled: false,
          stroked: true,
          opacity: layers.flood.opacity * 0.2,
          getLineColor: [100, 200, 255, 80],
          getLineWidth: 12,
          lineWidthMinPixels: 2,
          pickable: false,
        })
      )
    }

    // Power Grid — no fade, always visible when enabled
    if (layers.grid?.enabled && gridData) {
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
          opacity: layers.grid.opacity,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({ type: 'power_line', properties: object.properties }),
        }),
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
          onClick: ({ object }) => object && onFeatureClick({ type: 'substation', properties: object.properties }),
        })
      )
    }

    // Data Centre Sites
    if (layers.datacentre?.enabled && dataCentreData) {
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
          onClick: ({ object }) => object && onFeatureClick({ type: 'datacentre', properties: object }),
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
          opacity: layers.traffic.opacity ?? 0.9,
          updateTriggers: { getPosition: trafficData, getFillColor: trafficData },
        })
      )
    }

    // Companies — violet highlight on actual building footprints
    if (layers.companies?.enabled && companyData) {
      result.push(
        new GeoJsonLayer({
          id: 'companies-highlight',
          data: companyData,
          filled: true,
          stroked: true,
          extruded: true,
          opacity: layers.companies.opacity * 0.5,
          getElevation: f => (f.properties.height || 12) + 2,
          getFillColor: [139, 92, 246, 100],
          getLineColor: [139, 92, 246, 200],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
          pickable: true,
          autoHighlight: true,
          highlightColor: [167, 139, 250, 80],
          onClick: ({ object }) => object && onFeatureClick({
            type: 'company',
            properties: object.properties,
          }),
        })
      )
      // Only show labels when zoomed in close (zoom >= 15)
      if (viewState.zoom >= 15) {
        result.push(
          new TextLayer({
            id: 'companies-labels',
            data: companyData.features,
            getPosition: f => {
              const coords = f.geometry.coordinates[0]
              const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
              const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
              return [lng, lat]
            },
            getText: f => f.properties.name,
            getSize: 12,
            getColor: [167, 139, 250, 230],
            getAngle: 0,
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'bottom',
            getPixelOffset: [0, -20],
            fontFamily: 'monospace',
            fontWeight: 'bold',
            billboard: true,
            pickable: false,
          })
        )
      }
    }

    // Bus stops (Translink) — amber dots
    if (layers.transit?.enabled && transitData) {
      result.push(
        new ScatterplotLayer({
          id: 'transit-stops',
          data: transitData,
          getPosition: d => [d.lng, d.lat],
          getRadius: 8,
          radiusUnits: 'meters',
          radiusMinPixels: 2,
          radiusMaxPixels: 6,
          getFillColor: [245, 158, 11, 200],
          getLineColor: [245, 158, 11, 255],
          stroked: true,
          lineWidthMinPixels: 1,
          opacity: layers.transit.opacity,
          pickable: true,
          onClick: ({ object }) => object && onFeatureClick({
            type: 'transit',
            properties: { name: object.name, id: object.id, type: object.type },
          }),
        })
      )
    }

    return result
  }, [viewState.zoom, layers, floodData, buildingData, gridData, dataCentreData, trafficData, udiData, udiPeriod, companyData, transitData, seaLevelRise, onFeatureClick])

  const onMove = useCallback(evt => {
    onViewStateChange(evt.viewState)
  }, [onViewStateChange])

  return (
    <Map
      {...viewState}
      onMove={onMove}
      mapStyle={mapStyle}
      renderWorldCopies={false}
      maxTileCacheSize={200}
      style={{ width: '100%', height: '100%' }}
      antialias
    >
      <DeckGLOverlay layers={deckLayers} />
    </Map>
  )
}
