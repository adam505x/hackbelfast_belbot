export default function DetailModal({ content, onClose }) {
  if (!content) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-950 border border-slate-800/60 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-800/40 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${content.type === 'growth' ? 'bg-green-500' : 'bg-red-500'}`} />
              <h2 className="text-base font-mono font-bold text-slate-200">{content.title}</h2>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">{content.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors text-lg font-mono leading-none px-2"
          >
            x
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Key factors */}
          {content.factors && (
            <div>
              <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2">
                {content.type === 'growth' ? 'Why This Area Is Growing' : 'Why This Area Needs Attention'}
              </h3>
              <div className="space-y-2">
                {content.factors.map((f, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`text-xs font-mono font-bold flex-shrink-0 mt-0.5 ${
                      content.type === 'growth' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {i + 1}.
                    </span>
                    <p className="text-sm font-mono text-slate-300 leading-relaxed">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data breakdown */}
          {content.data && (
            <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800/40">
              <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2">
                Data Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {content.data.map((d, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-xs font-mono text-slate-500">{d.label}</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {content.recommendations && (
            <div>
              <h3 className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest mb-2">
                Recommendations
              </h3>
              <div className="space-y-2">
                {content.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-xs font-mono font-bold text-amber-500 flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-sm font-mono text-slate-400 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
