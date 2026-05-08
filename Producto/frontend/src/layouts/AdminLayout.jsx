import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield, TrendingUp, Users, Calendar,
  Newspaper, Megaphone, LogOut, Menu, X,
} from 'lucide-react'

const TABS = [
  { id: 'stats',     label: 'Métricas',  icon: TrendingUp },
  { id: 'usuarios',  label: 'Usuarios',  icon: Users      },
  { id: 'tocatas',   label: 'Tocatas',   icon: Calendar   },
  { id: 'noticias',  label: 'Noticias',  icon: Newspaper  },
  { id: 'megaphone', label: 'Anuncios',  icon: Megaphone  },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [activeTab, setActiveTab] = useState('stats')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/auth', { replace: true })
  }

  const handleTab = (id) => {
    setActiveTab(id)
    setSidebarOpen(false)   // cierra en móvil al seleccionar
  }

  const initials = (user?.nombre || 'AD').substring(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-zinc-950 flex">

      {/* ── Overlay móvil ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════
          Sidebar
      ══════════════════════ */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800
        flex flex-col z-30 transition-transform duration-300
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Logo */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Shield size={17} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Bandify Admin</p>
              <p className="text-gray-500 text-[11px]">Panel de control</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => handleTab(id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left
                  ${active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon size={17} className="shrink-0" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Usuario + logout */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.nombre}</p>
              <p className="text-gray-500 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ══════════════════════
          Contenido principal
      ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">

        {/* Top bar móvil */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-indigo-400" />
            <span className="text-white font-bold text-sm">Admin</span>
          </div>
          <div className="ml-auto">
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              {TABS.find(t => t.id === activeTab)?.label ?? 'Panel'}
            </span>
          </div>
        </header>

        {/* Outlet — recibe activeTab y setActiveTab vía contexto */}
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ activeTab, setActiveTab }} />
        </main>
      </div>
    </div>
  )
}
