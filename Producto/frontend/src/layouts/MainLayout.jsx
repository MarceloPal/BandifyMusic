import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNavbar from '../components/TopNavbar'
import Footer    from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { API_URL }  from '../utils/helpers'

const HIDE_FOOTER_ON = ['/messages']

// Palabras clave base. Si la URL contiene cualquiera de estas, será Full Bleed (ancho completo)
const FULL_BLEED_KEYWORDS = ['/messages', '/profile', '/u/', 'planes', '/tocatas', '/gestion']

export default function MainLayout() {
  const { pathname }          = useLocation()
  const { token, updateUser } = useAuth()

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/usuarios/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (p?.id) updateUser(p) })
      .catch(() => {})
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const showFooter   = !HIDE_FOOTER_ON.includes(pathname)
  const isMessages   = pathname === '/messages'
  
  // SOLUCIÓN INMUNE: Comprueba si la URL actual contiene alguna de las palabras clave de ancho completo
  const isFullBleed  = FULL_BLEED_KEYWORDS.some(keyword => pathname.toLowerCase().includes(keyword))

  return (
    // MEJORA: Si es ancho completo, la raíz se vuelve bg-black, eliminando cualquier marco gris de fondo
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isFullBleed ? 'bg-black' : 'bg-zinc-900'}`}>

      <TopNavbar />

      {/* Contenido — padding-top para compensar el navbar fijo */}
      <div className="flex-1 flex flex-col pt-14">
        <main className={`flex-1 ${isMessages ? 'overflow-hidden flex flex-col' : ''}`}>
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