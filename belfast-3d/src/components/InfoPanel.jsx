export default function InfoPanel({ feature, onClose }) {
  const { type, properties } = feature

  const typeConfig = {
    building: { icon: '🏢', title: 'Building', color: 'slate' },
    flood: { icon: '🌊', title: 'Flood Zone', color: 'blue' },
    substation: { icon: '⚡', title: 'Substation', color: 'yellow' },
    decay: { icon: '🏚️', title: 'Deprivation Area', color: 'red' },
    datacentre: { icon: '🖥️', title: 'Data Centre Site', color: 'purple' },
  }

  const config = typeConfig[type] || typeConfig.building

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>{config.icon}</span>
          {properties.name || config.title}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close info panel"
        >
          ✕
        </button>
      </div>

      {/* Properties */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {Object.entries(properties).map(([key, value]) => {
          if (key === 'coordinates' || value === null || value === undefined) return null
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-slate-400 capitalize">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="text-slate-200 font-medium text-right max-w-[60%] truncate">
                {typeof value === 'number' ? value.toFixed(2) : String(value)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Score bar for data centre sites */}
      {type === 'datacentre' && properties.score && (
        <div className="px-4 pb-4">
          <div className="text-xs text-slate-400 mb-1">Suitability Score</div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${properties.score * 100}%` }}
            />
          </div>
          <div className="text-right text-xs text-purple-300 mt-1">
            {(properties.score * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  )
}
