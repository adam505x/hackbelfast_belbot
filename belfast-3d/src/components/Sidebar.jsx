import { useState } from 'react'

export default function Sidebar({ children, infoContent }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`absolute top-0 left-0 h-full z-10 transition-all duration-300 ${
        collapsed ? 'w-0' : 'w-80'
      }`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute top-4 z-20 bg-slate-900/95 backdrop-blur-sm border border-slate-700/60 rounded-r-lg px-2 py-3 text-slate-400 hover:text-white hover:bg-slate-800/95 transition-all font-mono text-xs ${
          collapsed ? 'left-0' : 'left-80'
        }`}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '>' : '<'}
      </button>

      {!collapsed && (
        <div className="h-full w-80 bg-slate-950/95 backdrop-blur-md border-r border-slate-800/60 overflow-y-auto p-3 space-y-2">
          <div className="mb-4 px-1">
            <h1 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">
              Belfast 3D
            </h1>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-wider">
              City Intelligence Platform
            </p>
          </div>
          {children}
          {infoContent}
        </div>
      )}
    </div>
  )
}
