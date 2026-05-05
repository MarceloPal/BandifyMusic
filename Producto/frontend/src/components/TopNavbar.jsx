import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronDown, BarChart2, User, Compass,
  MessageCircle, CalendarDays, HelpCircle,
  Bell, Settings, LogOut,
} from 'lucide-react'
import { useAuth }     from '../context/AuthContext'
import { getInitials } from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'

const NAV_ITEMS = [
  { icon: User,          label: 'Mi Perfil',       path: '/profile'       },
  { icon: BarChart2,     label: 'Mi ADN',          path: '/mi-adn'        },
  { icon: Compass,       label: 'Explorar',        path: '/explore'       },
  { icon: MessageCircle, label: 'Mensajes',        path: '/messages'      },
  { icon: CalendarDays,  label: 'Tocatas',         path: '/tocatas'       },
  { icon: Bell,          label: 'Notificaciones',  path: '/notifications' },
  { icon: HelpCircle,    label: 'Ayuda',           path: '/help'          },
  { icon: Settings,      label: 'Ajustes',         path: '/settings'      },
]

export default function TopNavbar() {
  const { logout, user }          = useAuth()
  const navigate                  = useNavigate()
  const { url: photoUrl }         = useImageUrl(user?.foto_url ?? null)
  const [open, setOpen]           = useState(false)
  const dropdownRef               = useRef(null)

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
      {/* Logo */}
      <Link to="/" className="font-black text-white tracking-widest text-sm hover:opacity-70 transition-opacity">
        BANDIFY
      </Link>

      {/* Avatar + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Menú de usuario"
        >
          {/* Avatar */}
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
              {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
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
                  {label}
                </NavLink>
              ))}
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
    </header>
  )
}
