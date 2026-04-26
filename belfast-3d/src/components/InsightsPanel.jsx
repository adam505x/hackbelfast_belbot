const INSIGHTS = {
  '2001': { title: 'Pre-Boom Baseline', notes: [
    'Crime rate at 143 per 1,000 — highest in the series',
    'Queens Island still derelict shipyard land',
    'Population 328k — decades of decline',
    'North and west Belfast predominantly red and dark red',
    'South Belfast mixed — some areas already yellow-green',
  ]},
  '2006': { title: 'Celtic Tiger Peak', notes: [
    'House prices surging — Belfast avg £135k (+60%)',
    'Crime dropped to 112 per 1,000',
    '60 SOAs improved — widespread shift across all areas',
    'North Belfast: 22 areas improved, mostly moving to orange',
    'South Belfast: 20 areas improved but 24 worsened to yellow/yellow-green',
    'East Belfast: 7 areas improved, 8 worsened',
  ]},
  '2009': { title: 'Post-Crash Recession', notes: [
    'Property crash: avg fell from £189k to £126k',
    'Negative equity widespread in deprived areas',
    'Construction halted across regeneration sites',
    'Unemployment rising — particularly in manufacturing and construction',
    '15 SOAs still improved despite recession — north and east Belfast',
    'No significant worsening — decay stabilised at 2006 levels',
  ]},
  '2011': { title: 'Census 2011 — Trough', notes: [
    'House prices bottomed at £100k (-47% from peak)',
    'Crime at lowest: 96 per 1,000',
    'Population stabilised at 281k',
    'Minimal change — only 3 SOAs improved, 3 worsened',
    'North Belfast: 2 areas moved to yellow-green',
    'Market at standstill — neither improving nor declining',
  ]},
  '2016': { title: 'Mid-Recovery', notes: [
    'Prices recovering: £110k, still 42% below peak',
    'Crime ticked up to 105 per 1,000',
    '69 SOAs improved — strongest recovery period',
    'South Belfast: 37 areas improved, many moving to yellow-green and green',
    'North Belfast: 20 areas improved to yellow and yellow-green',
    '12 SOAs reached green (nominal) for the first time',
    'Only 5 SOAs worsened — 3 in north Belfast moving to orange/red',
  ]},
  '2021': { title: 'Post-COVID', notes: [
    'COVID drove crime to historic low (82 per 1,000)',
    'Post-COVID rebound: crime back to 95',
    'Derelict vacancy rate hit 30%',
    '33 SOAs improved — south and north Belfast leading',
    '31 SOAs worsened — split evenly north and south',
    'North Belfast: 14 areas worsened, 3 reaching dark red',
    'West Belfast: 4 areas worsened to orange and red',
    'Mixed picture — improvement and decline happening simultaneously',
  ]},
  '2025': { title: 'Current State', notes: [
    'Vacancy rate at 33% — flagged critical',
    'Avg rent £875/mo — up 150% from 2001',
    'Crime 92 per 1,000, composition worsened',
    '22 SOAs worsened — south Belfast most affected (12 areas)',
    'North Belfast: 7 areas worsened, 10 improved to yellow',
    '4 areas moved to red — concentrated in north and south',
    'Net decline: more areas worsening than improving for first time since 2006',
  ]},
}

const GROWTH_DETAIL = {
  '2027': {
    title: 'Titanic Quarter / Queens Island',
    subtitle: 'Growth Region — 2027 Forecast',
    soas: 'Island 1, Island 2, Sydenham 1',
    type: 'growth',
    factors: [
      'Citigroup expanded to 3,000+ employees in Titanic Quarter since 2005 — continued hiring pipeline',
      'Belfast Harbour investing £250M+ in port infrastructure and mixed-use development',
      'Titanic Belfast draws 800k+ visitors/year — sustained tourism economy',
      'City Quays 1 & 2 fully occupied — City Quays 3 in planning',
      'Proximity to Belfast City Airport (1.2km) — connectivity advantage',
      'Surrounding SOAs (Ballymacarrett, Sydenham) benefiting from spillover employment',
    ],
    data: [
      { label: 'UDI 2025', value: '0.48 (Orange)' },
      { label: 'UDI 2027 (pred)', value: '0.44 (Orange)' },
      { label: 'Trend', value: 'Improving' },
      { label: 'Pop growth', value: '+3.2% (2021-25)' },
      { label: 'Rent vs avg', value: '+12% above city' },
      { label: 'Companies nearby', value: '8 (Top 50)' },
    ],
    recommendations: [
      'Continue mixed-use zoning in Titanic Quarter to maintain residential/commercial balance',
      'Extend Glider route to Queens Island to reduce car dependency',
      'Ensure affordable housing allocation in new developments (min 20%)',
    ],
  },
  '2029': {
    title: 'Titanic Quarter / Laganside',
    subtitle: 'Growth Region — 2029 Forecast',
    soas: 'Island 1, Sydenham 1, Ballymacarrett 1',
    type: 'growth',
    factors: [
      'Kainos new HQ at Bankmore Square opening 2027 — 2,800+ employees anchoring south corridor',
      'Belfast Harbour expansion creating tech/logistics corridor from centre to airport',
      'Sustained investment pipeline: £500M+ committed across Titanic Quarter',
      'Queens University and Ulster University graduate pipeline feeding local tech sector',
      'Laganside regeneration maturing — Waterfront, Lanyon Place now established',
    ],
    data: [
      { label: 'UDI 2025', value: '0.48 (Orange)' },
      { label: 'UDI 2029 (pred)', value: '0.42 (Yellow)' },
      { label: 'Trend', value: 'Improving' },
      { label: 'Companies nearby', value: '10 (Top 50)' },
      { label: 'Heritage assets', value: '12 listed buildings' },
    ],
    recommendations: [
      'Prioritise pedestrian/cycle infrastructure connecting Titanic Quarter to Cathedral Quarter',
      'Invest in public realm along Lagan corridor',
      'Support creative industries in underused harbour buildings',
    ],
  },
}

const ATTENTION_DETAIL = {
  '2027': {
    title: 'Duncairn 1, Shaftesbury 1',
    subtitle: 'Areas Needing Attention — 2027 Forecast',
    soas: 'Duncairn 1, Shaftesbury 1',
    type: 'attention',
    factors: [
      'Duncairn UDI at 0.77 — highest in Belfast, persistent across all periods',
      'NIMDM rank 49/890 — bottom 6% for multiple deprivation',
      'Crime rank 135/890 — elevated ASB and criminal damage',
      '47 heritage-at-risk sites in Duncairn/New Lodge corridor',
      'Population declining while surrounding areas grow — isolation effect',
      'Rent 44% below city average — signals area abandonment',
      'No major employer within 1km — poor access to Titanic Quarter jobs',
      'Shaftesbury shows similar pattern: high dereliction, stagnant investment',
    ],
    data: [
      { label: 'Duncairn UDI 2025', value: '0.77 (Red)' },
      { label: 'Duncairn UDI 2027', value: '0.79 (Red)' },
      { label: 'Crime rank', value: '135 / 890' },
      { label: 'HARNI sites', value: '47' },
      { label: 'Rent vs avg', value: '-44% below city' },
      { label: 'Pop trend', value: 'Declining' },
    ],
    recommendations: [
      'Designate Duncairn as Urban Regeneration Area with enhanced capital allowances',
      'Targeted dereliction grants for 47 HARNI sites — facade restoration and meanwhile-use',
      'Partner with Belfast Met and Concentrix/FinTrU for apprenticeship pathways',
      'Fund neighbourhood policing and CCTV expansion (crime rank 135/890)',
      'Incentivise social housing renovation to prevent further abandonment',
      'Improve Glider/Metro links to Titanic Quarter (2.1km, poor pedestrian access)',
    ],
  },
  '2029': {
    title: 'Duncairn 1, Collin Glen 1',
    subtitle: 'Areas Needing Attention — 2029 Forecast',
    soas: 'Duncairn 1, Collin Glen 1',
    type: 'attention',
    factors: [
      'Duncairn projected UDI 0.81+ — approaching severe threshold',
      'Without intervention, decay accelerates: dereliction breeds more dereliction',
      'Collin Glen (west Belfast periphery) isolated from employment centres',
      'Collin Glen public transport: 45min to city centre vs 15min by car',
      'Both areas show rising vacancy rates outpacing city average',
      'Average age increasing as younger residents leave for better-connected areas',
    ],
    data: [
      { label: 'Duncairn UDI 2029', value: '0.81 (Severe)' },
      { label: 'Collin Glen UDI 2029', value: '0.73 (Red)' },
      { label: 'Vacancy trend', value: 'Rising (+5%/yr)' },
      { label: 'Transport access', value: 'Poor' },
      { label: 'Nearest employer hub', value: '3.2km (Duncairn)' },
    ],
    recommendations: [
      'Attract public sector anchor to north Belfast (e.g. HMRC relocation) — 500+ local jobs',
      'Extend Glider route to Collin Glen / Poleglass',
      'Create heritage trail linking Duncairn listed buildings to Cathedral Quarter tourism',
      'Allocate £2M/year preventive maintenance fund for SOAs with UDI >0.55',
      'Deploy quarterly UDI monitoring — flag SOAs crossing thresholds for immediate action',
      'Community wealth building: local procurement requirements for public contracts in these SOAs',
    ],
  },
}

export default function InsightsPanel({ period, onShowDetail }) {
  const insight = INSIGHTS[period]
  const isPredicted = period === '2027' || period === '2029'
  const growthDetail = GROWTH_DETAIL[period]
  const attentionDetail = ATTENTION_DETAIL[period]

  if (!insight && !isPredicted) return null

  return (
    <div className="absolute top-4 right-4 w-80 z-10 max-h-[calc(100vh-120px)] flex flex-col">
      <div className="bg-slate-950/95 backdrop-blur-md rounded-lg border border-slate-800/60 overflow-hidden flex flex-col max-h-full">
        <div className="px-4 py-3 border-b border-slate-800/40 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Insights</span>
            <span className="text-xs font-mono text-slate-500">{period}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono font-bold text-slate-200">
              {isPredicted ? `ML Forecast ${period}` : insight?.title}
            </span>
            {isPredicted && (
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                PREDICTED
              </span>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {insight && (
            <div className="space-y-1.5">
              {insight.notes.map((note, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 flex-shrink-0">-</span>
                  <p className="text-xs font-mono text-slate-400 leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          )}

          {growthDetail && (
            <div className="bg-green-950/30 rounded-lg p-3 border border-green-800/30">
              <div className="text-[10px] font-mono font-bold text-green-400 uppercase tracking-widest mb-1">Growth Region</div>
              <div className="text-sm font-mono font-bold text-green-300">{growthDetail.title}</div>
              <div className="text-[10px] font-mono text-green-500 mt-0.5">{growthDetail.soas}</div>
              <button
                onClick={() => onShowDetail(growthDetail)}
                className="mt-2 text-[10px] font-mono font-bold text-green-400 hover:text-green-300 uppercase tracking-wider border border-green-800/40 rounded px-2 py-1 hover:bg-green-900/20 transition-colors"
              >
                More Info →
              </button>
            </div>
          )}

          {attentionDetail && (
            <div className="bg-red-950/30 rounded-lg p-3 border border-red-800/30">
              <div className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest mb-1">Areas Needing Attention</div>
              <div className="text-sm font-mono font-bold text-red-300">{attentionDetail.title}</div>
              <div className="text-[10px] font-mono text-red-500 mt-0.5">{attentionDetail.soas}</div>
              <button
                onClick={() => onShowDetail(attentionDetail)}
                className="mt-2 text-[10px] font-mono font-bold text-red-400 hover:text-red-300 uppercase tracking-wider border border-red-800/40 rounded px-2 py-1 hover:bg-red-900/20 transition-colors"
              >
                More Info →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
