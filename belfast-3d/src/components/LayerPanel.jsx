import { useState } from 'react'

function Card({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-slate-900/80 rounded-lg border border-slate-800/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors"
      >
        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-xs font-mono text-slate-500">{count}</span>
          )}
          <span className="text-xs text-slate-600">{open ? '^' : 'v'}</span>
        </div>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

export default function LayerPanel({
  layers, onToggle, onOpacityChange,
  seaLevelRise, onSeaLevelChange,
  nightMode, onNightModeChange,
}) {
  const activeCount = Object.values(layers).filter(l => l.enabled).length

  return (
    <div className="space-y-2">
      <Card title="Layers" count={activeCount} defaultOpen={true}>
        {Object.entries(layers).map(([key, layer]) => (
          <div key={key} className="py-2 border-b border-slate-800/40 last:border-0">
            <button
              onClick={() => onToggle(key)}
              className="w-full flex items-center gap-3 group"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: layer.enabled ? layer.color : '#334155' }}
              />
              <span className={`text-sm font-mono flex-1 text-left transition-colors ${
                layer.enabled ? 'text-slate-200' : 'text-slate-500'
              } group-hover:text-slate-300`}>
                {layer.label}
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                layer.enabled
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-slate-600 bg-slate-800/40'
              }`}>
                {layer.enabled ? 'ON' : 'OFF'}
              </span>
            </button>
            {layer.enabled && (
              <div className="mt-2 ml-6 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={layer.opacity}
                  onChange={e => onOpacityChange(key, parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-slate-500"
                />
                <span className="text-xs font-mono text-slate-600 w-8 text-right">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Day/Night Toggle */}
      <div className="bg-slate-900/80 rounded-lg border border-slate-800/60 overflow-hidden">
        <button
          onClick={() => onNightModeChange(!nightMode)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors"
        >
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            {nightMode ? 'Night Mode' : 'Day Mode'}
          </span>
          <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
            nightMode
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-amber-400 bg-amber-500/10'
          }`}>
            {nightMode ? 'DARK' : 'LIGHT'}
          </span>
        </button>
      </div>

      {layers.flood?.enabled && (
        <Card title="Sea Level" count={`+${seaLevelRise.toFixed(1)}m`} defaultOpen={false}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={seaLevelRise}
                onChange={e => onSeaLevelChange(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-blue-500"
              />
              <span className="text-sm font-mono font-bold text-blue-400 w-14 text-right">
                +{seaLevelRise.toFixed(1)}m
              </span>
            </div>
            <p className="text-xs font-mono text-slate-600">
              {seaLevelRise === 0 && 'Current sea level'}
              {seaLevelRise > 0 && seaLevelRise <= 2 && '~2050 projection (RCP 8.5)'}
              {seaLevelRise > 2 && seaLevelRise <= 5 && '~2080 high scenario'}
              {seaLevelRise > 5 && 'Extreme / storm surge'}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
