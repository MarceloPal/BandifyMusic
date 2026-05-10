import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNavbar from '../components/TopNavbar'
import Footer    from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { API_URL }  from '../utils/helpers'

const HIDE_FOOTER_ON = ['/messages']

// Rutas que se renderizan a ancho completo (sin el contenedor max-w-5xl mx-auto).
// Útil para dashboards/perfiles con secciones full-bleed (banners, grids con
// divisores que llegan a los bordes de la pantalla).
const FULL_BLEED_ROUTES = ['/messages', '/profile']

export default function MainLayout() {
  const { pathname }                = useLocation()
  const { token, updateUser, user } = useAuth()

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/usuarios/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (p?.id) updateUser(p) })
      .catch(() => {})
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const showFooter   = !HIDE_FOOTER_ON.includes(pathname) && !user
  const isMessages   = pathname === '/messages'
  const isFullBleed  = FULL_BLEED_ROUTES.includes(pathname)

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">

      <TopNavbar />

      {/* Contenido — padding-top para compensar el navbar fijo */}
      <div className="flex-1 flex flex-col pt-14">
        <main className={`flex-1 ${isMessages ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {isFullBleed ? (
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
  )
}
