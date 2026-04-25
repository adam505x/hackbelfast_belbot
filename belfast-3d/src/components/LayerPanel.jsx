export default function LayerPanel({ layers, onToggle, onOpacityChange, seaLevelRise, onSeaLevelChange }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Intelligence Layers
      </h2>

      {Object.entries(layers).map(([key, layer]) => (
        <div key={key} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={layer.enabled}
              onChange={() => onToggle(key)}
              className="w-4 h-4 rounded accent-teal-500"
            />
            <span className="text-sm font-medium text-slate-200 flex-1">
              {layer.label}
            </span>
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: layer.color }}
            />
          </label>

          {layer.enabled && (
            <div className="mt-2 pl-7">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <span>Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={layer.opacity}
                  onChange={e => onOpacityChange(key, parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-teal-500"
                />
                <span className="w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
              </label>
            </div>
          )}
        </div>
      ))}

      {/* Sea Level Rise Slider */}
      {layers.flood.enabled && (
        <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50 mt-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">
            🌊 Sea Level Rise Simulator
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={seaLevelRise}
              onChange={e => onSeaLevelChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 accent-blue-400"
            />
            <span className="text-sm font-mono text-blue-200 w-14 text-right">
              +{seaLevelRise.toFixed(1)}m
            </span>
          </div>
          <p className="text-xs text-blue-400/70 mt-1">
            {seaLevelRise === 0 && 'Current sea level'}
            {seaLevelRise > 0 && seaLevelRise <= 2 && '~2050 projection (RCP 8.5)'}
            {seaLevelRise > 2 && seaLevelRise <= 5 && '~2080 projection (high scenario)'}
            {seaLevelRise > 5 && 'Extreme scenario / storm surge'}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30 mt-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Active Layers
        </h3>
        <p className="text-2xl font-bold text-teal-400">
          {Object.values(layers).filter(l => l.enabled).length}
          <span className="text-sm text-slate-500 font-normal"> / {Object.keys(layers).length}</span>
        </p>
      </div>
    </div>
  )
}
