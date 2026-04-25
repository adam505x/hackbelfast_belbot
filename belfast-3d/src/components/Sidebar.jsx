import { useState } from 'react'

export default function Sidebar({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`absolute top-0 left-0 h-full z-10 transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-80'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 right-0 translate-x-full bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-r-lg px-2 py-3 text-slate-300 hover:text-white hover:bg-slate-700/90 transition-colors z-20"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '▶' : '◀'}
      </button>

      {/* Sidebar content */}
      {!collapsed && (
        <div className="h-full bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 overflow-y-auto p-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              🏙️ Belfast 3D
            </h1>
            <p className="text-xs text-slate-400 mt-1">City Intelligence Platform</p>
          </div>
          {children}
        </div>
      )}
    </div>
  )
}
