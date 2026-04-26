const PERIODS = [
  { value: '2001', label: '2001', predicted: false },
  { value: '2006', label: '2006', predicted: false },
  { value: '2009', label: '2009', predicted: false },
  { value: '2011', label: '2011', predicted: false },
  { value: '2016', label: '2016', predicted: false },
  { value: '2021', label: '2021', predicted: false },
  { value: '2025', label: '2025', predicted: false },
  { value: '2027', label: '2027', predicted: true },
  { value: '2029', label: '2029', predicted: true },
]

const LEGEND = [
  { color: '#28c840', label: 'Nominal' },
  { color: '#78c850', label: 'Low' },
  { color: '#f0c828', label: 'Moderate' },
  { color: '#f08c1e', label: 'Elevated' },
  { color: '#dc3c1e', label: 'High' },
  { color: '#b41414', label: 'Severe' },
]

export default function UDITimeline({ period, onChange }) {
  const idx = PERIODS.findIndex(p => p.value === period)

  return (
    <div className="absolute bottom-4 left-[340px] right-6 z-20">
      <div className="bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-800/60 px-6 py-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
              Urban Decay Index
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-mono font-bold text-red-400">
                {period}
              </span>
              {PERIODS[idx]?.predicted && (
                <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  ML
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <input
              type="range"
              min="0"
              max={PERIODS.length - 1}
              step="1"
              value={idx}
              onChange={e => onChange(PERIODS[parseInt(e.target.value)].value)}
              className="w-full h-3 accent-red-500 cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => onChange(p.value)}
                  className={`text-xs font-mono transition-all px-2 py-1 rounded ${
                    period === p.value
                      ? 'text-red-400 font-bold'
                      : p.predicted
                        ? 'text-amber-600 hover:text-amber-400'
                        : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 grid grid-cols-3 gap-x-3 gap-y-0.5">
            {LEGEND.map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-[9px] font-mono text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
