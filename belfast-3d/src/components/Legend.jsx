export default function Legend({ layers }) {
  const activeLayers = Object.entries(layers).filter(([, l]) => l.enabled)
  if (activeLayers.length === 0) return null

  return (
    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 z-10">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Legend
      </div>
      <div className="space-y-1.5">
        {activeLayers.map(([key, layer]) => (
          <div key={key} className="flex items-center gap-2 text-xs text-slate-300">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: layer.color, opacity: layer.opacity }}
            />
            <span>{layer.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
