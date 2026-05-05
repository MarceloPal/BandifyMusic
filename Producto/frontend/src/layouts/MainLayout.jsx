import { useState, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Menu, Music } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Footer  from '../components/Footer'
import { useAuth }  from '../context/AuthContext'
import { API_URL }  from '../utils/helpers'

const HIDE_FOOTER_ON = ['/messages']

export default function MainLayout() {
  const { pathname }                   = useLocation()
  const [sidebarOpen, setSidebarOpen]  = useState(false)
  const { token, updateUser }          = useAuth()

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/usuarios/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (p?.id) updateUser(p) })
      .catch(() => {})
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Cierra el drawer al navegar en mobile */
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const showFooter  = !HIDE_FOOTER_ON.includes(pathname)
  const isMessages  = pathname === '/messages'

  return (
    <div className="flex h-screen bg-zinc-900">

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fijo en desktop, drawer en mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Área principal — deja espacio para el sidebar en desktop */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">

        {/* Topbar — solo visible en mobile */}
        <header className="lg:hidden h-14 flex-shrink-0 z-20 bg-zinc-950 border-b border-white/8 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <Menu size={20} />
          </button>
          <Link
            to="/"
            className="font-black text-white tracking-widest text-sm"
          >
            BANDIFY
          </Link>
        </header>

        {/* Contenido */}
        <div className="flex-1 min-h-0 flex flex-col">
          <main className={`flex-1 min-h-0 ${
            isMessages ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
          }`}>
            {isMessages ? (
              <Outlet />
            ) : (
              <div className="max-w-5xl mx-auto px-6 py-8 w-full">
                <Outlet />
              </div>
            )}
          </main>

          {showFooter && <Footer />}
        </div>
      </div>
    </div>
  )
}
