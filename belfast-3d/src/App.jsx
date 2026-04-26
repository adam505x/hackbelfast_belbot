import { useState, useCallback } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import LayerPanel from './components/LayerPanel'
import InfoPanel from './components/InfoPanel'
import UDITimeline from './components/UDITimeline'
import InsightsPanel from './components/InsightsPanel'
import DetailModal from './components/DetailModal'

const INITIAL_LAYERS = {
  udi: { enabled: true, label: 'Urban Decay Index', color: '#ef4444', opacity: 0.55 },
  companies: { enabled: false, label: 'Top 50 Companies', color: '#a78bfa', opacity: 0.85 },
  flood: { enabled: false, label: 'Flood Risk', color: '#3b82f6', opacity: 0.6 },
  grid: { enabled: false, label: 'Power Grid', color: '#eab308', opacity: 0.7 },
  datacentre: { enabled: false, label: 'Data Centre Sites', color: '#8b5cf6', opacity: 0.7 },
  traffic: { enabled: false, label: 'Live Traffic', color: '#4ade80', opacity: 0.9 },
  transit: { enabled: false, label: 'Bus Stops (Translink)', color: '#f59e0b', opacity: 0.8 },
  buildings: { enabled: true, label: '3D Buildings', color: '#64748b', opacity: 0.8 },
}

export default function App() {
  const [layers, setLayers] = useState(INITIAL_LAYERS)
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [seaLevelRise, setSeaLevelRise] = useState(0)
  const [udiPeriod, setUdiPeriod] = useState('2025')
  const [nightMode, setNightMode] = useState(true)
  const [centreRequested, setCentreRequested] = useState(0)
  const [modalContent, setModalContent] = useState(null)
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

  const infoContent = selectedFeature ? (
    <InfoPanel feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
  ) : null

  return (
    <div className="relative w-full h-full">
      <MapView
        viewState={viewState}
        onViewStateChange={setViewState}
        layers={layers}
        seaLevelRise={seaLevelRise}
        udiPeriod={udiPeriod}
        nightMode={nightMode}
        centreRequested={centreRequested}
        onFeatureClick={setSelectedFeature}
      />
      <Sidebar infoContent={infoContent} onCentre={() => setCentreRequested(c => c + 1)}>
        <LayerPanel
          layers={layers}
          onToggle={toggleLayer}
          onOpacityChange={setLayerOpacity}
          seaLevelRise={seaLevelRise}
          onSeaLevelChange={setSeaLevelRise}
          nightMode={nightMode}
          onNightModeChange={setNightMode}
        />
      </Sidebar>

      {layers.udi?.enabled && (
        <>
          <UDITimeline period={udiPeriod} onChange={setUdiPeriod} />
          <InsightsPanel period={udiPeriod} onShowDetail={setModalContent} />
        </>
      )}

      {modalContent && (
        <DetailModal content={modalContent} onClose={() => setModalContent(null)} />
      )}
    </div>
  )
}
