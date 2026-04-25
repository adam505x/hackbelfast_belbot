import { useState, useCallback } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import LayerPanel from './components/LayerPanel'
import InfoPanel from './components/InfoPanel'
import Legend from './components/Legend'
import AIChatPanel from './components/AIChatPanel'

const INITIAL_LAYERS = {
  flood: { enabled: true, label: '🌊 Flood Risk', color: '#3b82f6', opacity: 0.6 },
  grid: { enabled: false, label: '⚡ Power Grid', color: '#eab308', opacity: 0.7 },
  datacentre: { enabled: false, label: '🖥️ Data Centre Sites', color: '#8b5cf6', opacity: 0.7 },
  decay: { enabled: false, label: '🏚️ Urban Decay', color: '#ef4444', opacity: 0.6 },
  traffic: { enabled: true, label: '🚗 Live Traffic (TomTom)', color: '#06b6d4', opacity: 0.9 },
  buildings: { enabled: true, label: '🏢 3D Buildings', color: '#64748b', opacity: 0.8 },
}

export default function App() {
  const [layers, setLayers] = useState(INITIAL_LAYERS)
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [seaLevelRise, setSeaLevelRise] = useState(0)
  const [viewState, setViewState] = useState({
    longitude: -5.9301,
    latitude: 54.5973,
    zoom: 13,
    pitch: 45,
    bearing: -17,
  })

  const toggleLayer = useCallback((key) => {
    setLayers(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }))
  }, [])

  const setLayerOpacity = useCallback((key, opacity) => {
    setLayers(prev => ({
      ...prev,
      [key]: { ...prev[key], opacity }
    }))
  }, [])

  return (
    <div className="relative w-full h-full">
      <MapView
        viewState={viewState}
        onViewStateChange={setViewState}
        layers={layers}
        seaLevelRise={seaLevelRise}
        onFeatureClick={setSelectedFeature}
      />
      <Sidebar>
        <LayerPanel
          layers={layers}
          onToggle={toggleLayer}
          onOpacityChange={setLayerOpacity}
          seaLevelRise={seaLevelRise}
          onSeaLevelChange={setSeaLevelRise}
        />
      </Sidebar>
      {selectedFeature && (
        <InfoPanel feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
      )}
      <Legend layers={layers} />
      <AIChatPanel
        onLayerSuggestion={(layerKey) => {
          if (layers[layerKey] && !layers[layerKey].enabled) {
            toggleLayer(layerKey)
          }
        }}
      />
    </div>
  )
}
