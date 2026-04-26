export default function InfoPanel({ feature, onClose }) {
  const { type, properties: p } = feature
  const pct = v => v != null ? (v * 100).toFixed(0) + '%' : '-'

  if (type === 'udi') {
    return (
      <Card title={p.SOA_NAME} subtitle={p.SOA_CODE} onClose={onClose}>
        <div className="space-y-3">
          <div>
            <Label>UDI Score</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-mono font-bold text-red-400">{pct(p.udi)}</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: pct(p.udi),
                  background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)',
                }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Demographic" value={pct(p.demographic)} />
            <Stat label="Crime" value={pct(p.crime)} />
            <Stat label="Dereliction" value={pct(p.dereliction)} />
            <Stat label="Housing" value={pct(p.housing)} />
          </div>
          {p.mdm_rank && (
            <div className="pt-2 border-t border-slate-800/60 space-y-1">
              <Row label="NIMDM Rank" value={`${p.mdm_rank} / 890`} />
              {p.crime_rank && <Row label="Crime Rank" value={`${p.crime_rank} / 890`} />}
              {p.listed_buildings > 0 && <Row label="Listed Buildings" value={p.listed_buildings} />}
              {p.harni_sites > 0 && <Row label="Heritage at Risk" value={p.harni_sites} />}
            </div>
          )}
          {p.pop_2001 && (
            <div className="pt-2 border-t border-slate-800/60 space-y-1">
              <Label>Population</Label>
              <Row label="2001" value={p.pop_2001?.toLocaleString()} />
              <Row label="2011" value={p.pop_2011?.toLocaleString()} />
              <Row label="2021" value={p.pop_2021?.toLocaleString()} />
            </div>
          )}
          {p.postcodes && (
            <div className="pt-2 border-t border-slate-800/60">
              <Label>Postcodes</Label>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{p.postcodes}</p>
            </div>
          )}
        </div>
      </Card>
    )
  }

  if (type === 'company') {
    return (
      <Card title={p.name} subtitle={p.sector} onClose={onClose}>
        <div className="space-y-1">
          <Row label="Employees" value={p.employees} />
          <Row label="Established" value={p.established} />
          {p.building_name && <Row label="Building" value={p.building_name} />}
        </div>
      </Card>
    )
  }

  const title = p.name || p.building || p.type || 'Feature'
  return (
    <Card title={title} subtitle={type} onClose={onClose}>
      <div className="space-y-1">
        {Object.entries(p).map(([key, value]) => {
          if (key === 'coordinates' || value == null || value === '') return null
          const display = typeof value === 'number' ? value.toLocaleString() : String(value)
          if (display.length > 100) return null
          return <Row key={key} label={key.replace(/_/g, ' ')} value={display} />
        })}
      </div>
    </Card>
  )
}

function Card({ title, subtitle, onClose, children }) {
  return (
    <div className="bg-slate-900/80 rounded-lg border border-slate-800/60 overflow-hidden mt-2">
      <div className="flex items-start justify-between px-3 py-2.5 border-b border-slate-800/40">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-mono font-bold text-slate-200 truncate">{title}</h3>
          {subtitle && (
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">{subtitle}</p>
          )}
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xs font-mono ml-2 flex-shrink-0">x</button>
      </div>
      <div className="px-3 py-2.5 max-h-60 overflow-y-auto">{children}</div>
    </div>
  )
}

function Label({ children }) {
  return <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{children}</span>
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-900/60 rounded px-2 py-1.5">
      <div className="text-[9px] font-mono text-slate-500 uppercase">{label}</div>
      <div className="text-sm font-mono font-bold text-slate-300">{value}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono text-slate-500 capitalize">{label}</span>
      <span className="text-[10px] font-mono font-bold text-slate-300">{value}</span>
    </div>
  )
}
