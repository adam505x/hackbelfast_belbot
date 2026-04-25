const UDI_PERIODS = [
  { value: '2001', label: '2001', desc: 'Census 2001 — pre-boom baseline' },
  { value: '2006', label: '2006', desc: 'Pre-crash — Celtic Tiger peak' },
  { value: '2009', label: '2009', desc: 'Post-crash — recession impact' },
  { value: '2011', label: '2011', desc: 'Census 2011 — trough' },
  { value: '2016', label: '2016', desc: 'Mid-recovery period' },
  { value: '2021', label: '2021', desc: 'Census 2021 — post-COVID' },
  { value: '2025', label: '2025', desc: 'Current — dereliction at 33%' },
  { value: '2027', label: '2027', desc: 'Predicted — ML forecast' },
  { value: '2029', label: '2029', desc: 'Predicted — ML forecast' },
]

export default function LayerPanel({
  layers, onToggle, onOpacityChange,
  seaLevelRise, onSeaLevelChange,
  udiPeriod, onUdiPeriodChange,
}) {
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

      {/* UDI Time Period Slider */}
      {layers.udi?.enabled && (
        <div className="bg-red-900/20 rounded-lg p-3 border border-red-800/40 mt-4">
          <h3 className="text-sm font-semibold text-red-300 mb-3">
            📊 Urban Decay Index — Time Period
          </h3>
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {UDI_PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => onUdiPeriodChange(p.value)}
                className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all ${
                  udiPeriod === p.value
                    ? 'bg-red-500/30 text-red-200 border border-red-500/50'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:bg-slate-700/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min="0"
            max="8"
            step="1"
            value={UDI_PERIODS.findIndex(p => p.value === udiPeriod)}
            onChange={e => onUdiPeriodChange(UDI_PERIODS[parseInt(e.target.value)].value)}
            className="w-full h-1.5 accent-red-400"
          />
          <p className="text-xs text-red-400/70 mt-1.5">
            {UDI_PERIODS.find(p => p.value === udiPeriod)?.desc}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#16a34a' }} />
              <span className="text-slate-400">Low decay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#eab308' }} />
              <span className="text-slate-400">Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#dc2626' }} />
              <span className="text-slate-400">High decay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#7f1d1d' }} />
              <span className="text-slate-400">Severe</span>
            </div>
          </div>
        </div>
      )}

      {/* Sea Level Rise Slider */}
      {layers.flood?.enabled && (
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
