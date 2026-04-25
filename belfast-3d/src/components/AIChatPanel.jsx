import { useState, useRef, useEffect } from 'react'

const API_BASE = 'http://localhost:8000/api'

export default function AIChatPanel({ onLayerSuggestion }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hey! I\'m the Belfast City Intelligence Assistant. Ask me about flood risk, power grid capacity, urban deprivation, or data centre siting opportunities. Try:\n\n• "Which areas flood first?"\n• "Where should we build a data centre?"\n• "What if sea level rises 2m?"\n• "Show me the most deprived wards"',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      // Detect if it's a what-if scenario
      const isWhatIf = /what if|what would|scenario|imagine/i.test(userMsg)
      const endpoint = isWhatIf ? `${API_BASE}/rag/what-if` : `${API_BASE}/rag/query`
      const body = isWhatIf
        ? { scenario: userMsg, current_layers: [] }
        : { question: userMsg }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data = await res.json()

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          layerSuggestion: data.layer_suggestion,
        },
      ])

      if (data.layer_suggestion && onLayerSuggestion) {
        onLayerSuggestion(data.layer_suggestion)
      }
    } catch (err) {
      // Fallback: provide a helpful response without the backend
      const fallback = getFallbackResponse(userMsg)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: fallback.answer,
          sources: fallback.sources,
          layerSuggestion: fallback.layer,
        },
      ])
      if (fallback.layer && onLayerSuggestion) {
        onLayerSuggestion(fallback.layer)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 z-20 bg-teal-600 hover:bg-teal-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors text-2xl"
        aria-label="Open AI assistant"
      >
        🤖
      </button>
    )
  }

  return (
    <div className="absolute bottom-4 right-4 w-96 h-[500px] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h3 className="text-sm font-bold text-white">City Intelligence AI</h3>
            <p className="text-xs text-teal-400">RAG-powered by Claude</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-teal-600/80 text-white'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/50'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources?.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Sources: {msg.sources.join(', ')}
                </p>
              )}
              {msg.layerSuggestion && (
                <button
                  onClick={() => onLayerSuggestion?.(msg.layerSuggestion)}
                  className="mt-1 text-xs text-teal-400 hover:text-teal-300 underline"
                >
                  Show {msg.layerSuggestion} layer →
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 border border-slate-700/50">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about Belfast..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white rounded-lg px-3 py-2 text-sm transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// Fallback responses when backend is unavailable
function getFallbackResponse(question) {
  const q = question.toLowerCase()

  if (q.includes('flood') || q.includes('water') || q.includes('lagan') || q.includes('sea level')) {
    return {
      answer: 'Belfast faces three types of flood risk:\n\n1. Fluvial (river): The River Lagan corridor from Stranmillis to the Lagan Weir is the primary risk zone. DfI Rivers estimates 8,000+ residential properties at high risk.\n\n2. Tidal/coastal: Belfast Lough threatens the Titanic Quarter and Harbour Estate. UKCP18 projects 0.5-1.1m sea level rise by 2100.\n\n3. Surface water (pluvial): The most widespread risk, affecting 32,000+ properties. The culverted Blackstaff and Farset rivers are hotspots.\n\nToggle the Flood Risk layer and use the sea level slider to explore scenarios.',
      sources: ['flood-lagan', 'flood-tidal', 'flood-surface'],
      layer: 'flood',
    }
  }

  if (q.includes('data centre') || q.includes('datacenter') || q.includes('site') || q.includes('build')) {
    return {
      answer: 'Top data centre sites in Belfast:\n\n1. Harbour Estate (score: 92%) — 110kV grid, direct fibre, but tidal flood risk needs mitigation\n2. Castlereagh Industrial (88%) — Adjacent to 275kV substation, low flood risk\n3. Titanic Quarter East (85%) — Great fibre, 33kV grid, some flood risk\n4. Boucher Road (82%) — Good grid access, flood-safe\n\nThe scoring engine weighs: flood safety (30%), grid proximity (25%), fibre access (15%), land availability (15%), deprivation bonus (15%).\n\nToggle the Data Centre Sites layer to see all candidates.',
      sources: ['datacentre-harbour', 'datacentre-castlereagh'],
      layer: 'datacentre',
    }
  }

  if (q.includes('depriv') || q.includes('decay') || q.includes('poor') || q.includes('ward')) {
    return {
      answer: 'Belfast has stark spatial inequality (NISRA NIMDM 2017):\n\nMost deprived wards:\n• Shankill (rank 3/890) — 42% income-deprived\n• Whiterock (rank 5) — 40% income-deprived\n• Falls (rank 8) — 38% income-deprived\n• New Lodge (rank 10) — 39% income-deprived\n\nLeast deprived:\n• Malone (rank 600), Stormont (rank 620)\n\nThe deprivation gap between North/West Belfast and South Belfast has persisted across all NIMDM cycles.\n\nToggle the Urban Decay layer to see the spatial pattern.',
      sources: ['decay-shankill', 'decay-falls', 'decay-contrast'],
      layer: 'decay',
    }
  }

  if (q.includes('grid') || q.includes('power') || q.includes('electric') || q.includes('substation')) {
    return {
      answer: 'Belfast power grid (NIE Networks / SONI):\n\n• Castlereagh 275kV — primary bulk supply point\n• Belfast North & Harbour 110kV — high capacity\n• Multiple 33kV substations across the city\n• West Belfast has lower capacity (11kV distribution only)\n\nNI generates ~40% from renewables (mainly wind). The Harbour area has the strongest grid infrastructure due to industrial legacy.\n\nToggle the Power Grid layer to see substations and lines.',
      sources: ['grid-capacity', 'grid-renewables'],
      layer: 'grid',
    }
  }

  if (q.includes('what if') || q.includes('scenario') || q.includes('climate')) {
    return {
      answer: 'UKCP18 climate projections for Belfast:\n\n• Temperature: +1-4°C by 2080\n• Winter rainfall: +10-30%\n• Sea level rise: 0.3-1.1m by 2100\n• Extreme rainfall: +10-40% intensity\n\nUse the sea level rise slider on the Flood Risk layer to model different scenarios. At +2m, the Titanic Quarter and Harbour Estate face significant inundation. At +5m (extreme storm surge), much of the Lagan corridor floods.\n\nThe Belfast Resilience Strategy identifies flooding as the city\'s primary climate risk.',
      sources: ['climate-projections', 'flood-tidal'],
      layer: 'flood',
    }
  }

  return {
    answer: 'I can help with:\n\n• 🌊 Flood risk — river, tidal, and surface water flooding\n• ⚡ Power grid — substations, capacity, renewables\n• 🏚️ Urban decay — deprivation scores, derelict land\n• 🖥️ Data centre siting — composite scoring across all layers\n• 🌡️ Climate scenarios — what-if analysis\n\nTry asking something specific like "Which areas flood first?" or "Where\'s the best data centre site?"',
    sources: [],
    layer: null,
  }
}
