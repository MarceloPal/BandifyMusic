import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronDown, BarChart2, User, Compass,
  MessageCircle, CalendarDays, HelpCircle,
  Bell, Settings, LogOut, Newspaper, Shield,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth }     from '../context/AuthContext'
import { getInitials, API_URL } from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'

const NAV_ITEMS = [
  { icon: User,          label: 'Mi Perfil',       path: '/profile'       },
  { icon: BarChart2,     label: 'Mi ADN',          path: '/mi-adn'        },
  { icon: Compass,       label: 'Explorar',        path: '/explore'       },
  { icon: MessageCircle, label: 'Mensajes',        path: '/messages'      },
  { icon: CalendarDays,  label: 'Tocatas',         path: '/tocatas'       },
  { icon: Bell,          label: 'Notificaciones',  path: '/notifications' },
  { icon: Newspaper,     label: 'Noticias',        path: '/noticias'      },
  { icon: HelpCircle,    label: 'Ayuda',           path: '/help'          },
  { icon: Settings,      label: 'Ajustes',         path: '/settings'      },
]

/* Quick-nav: enlaces destacados centrados en el header. Visibles solo en md+ */
const QUICK_NAV = [
  { label: 'Eventos', path: '/tocatas' },  // tocatas + mapa
  { label: 'Mi ADN',  path: '/mi-adn'  },  // análisis vectorial
  { label: 'Radar',   path: '/explore' },  // matching de músicos
]

export default function TopNavbar() {
  const { logout, user, token }   = useAuth()
  const navigate                  = useNavigate()
  const { url: photoUrl }         = useImageUrl(user?.foto_url ?? null)
  const [open, setOpen]           = useState(false)
  const dropdownRef               = useRef(null)

  const { data: notifs = [] } = useQuery({
    queryKey:       ['notificaciones'],
    queryFn:        async () => {
      const res = await fetch(`${API_URL}/notificaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.ok ? res.json() : []
    },
    enabled:        !!token,
    refetchInterval: 30_000,
    staleTime:      0,
  })
  const unread = notifs.filter((n) => !n.leida).length

  const handleLogout = () => { logout(); navigate('/') }

  /* Cierra el dropdown al hacer clic fuera */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-6 border-b border-white/8"
      style={{ backgroundColor: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
    >
      {/* ── IZQUIERDA: Logo (flex-1 para empujar el centro) ── */}
      <div className="flex-1 flex items-center">
        <Link to="/" className="font-black text-white tracking-widest text-sm hover:opacity-70 transition-opacity">
          BANDIFY
        </Link>
      </div>

      {/* ── CENTRO: Quick nav perfectamente centrado entre logo y avatar ── */}
      {/* Oculto en mobile (< md) para no romper el layout */}
      <nav className="hidden md:flex items-center gap-x-8">
        {QUICK_NAV.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `text-sm transition-colors ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── DERECHA: Bell + Avatar/Dropdown (flex-1 + justify-end espeja al logo) ── */}
      <div className="flex-1 flex items-center justify-end gap-x-4">
        {token ? (
          <>
            {/* Campana de notificaciones con badge */}
            <Link
              to="/notifications"
              aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
              className="relative text-zinc-400 hover:text-white transition-colors p-1"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-zinc-950"
                  aria-hidden="true"
                />
              )}
            </Link>

            {/* Avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/5"
                aria-label="Menú de usuario"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white hidden sm:inline">
                    Hola, {user?.nombre?.split(' ')[0] || 'Músico'}
                  </span>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={user?.nombre}
                      className="w-8 h-8 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold border border-white/20">
                      {getInitials(user?.nombre)}
                    </div>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
              </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                {/* Info del usuario */}
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="text-white text-sm font-semibold truncate">{user?.nombre}</p>
                  <p className="text-zinc-500 text-xs truncate">{user?.email}</p>
                </div>

                {/* Nav items */}
                <div className="py-1">
                  {NAV_ITEMS.map(({ label, path }) => (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'text-purple-400 bg-purple-500/10 font-medium'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Icon size={14} className="flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {path === '/notifications' && unread > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                    </NavLink>
                  ))}

                  {user?.role === 'admin' && (
                    <NavLink
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-t border-white/5 mt-1 ${
                          isActive
                            ? 'text-indigo-400 bg-indigo-500/10 font-medium'
                            : 'text-indigo-300 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Shield size={14} className="flex-shrink-0" />
                      <span className="flex-1">Panel Admin</span>
                    </NavLink>
                  )}
                </div>

                {/* Cerrar sesión */}
                <div className="border-t border-white/8 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                  >
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/auth?mode=login"
              className="px-4 py-2 rounded-full text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
