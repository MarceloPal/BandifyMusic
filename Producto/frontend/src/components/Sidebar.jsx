import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  BarChart2, User, Compass,
  MessageCircle, CalendarDays, HelpCircle, LogOut, Music,
  Bell, Settings, Newspaper, Shield,
} from 'lucide-react'
import { toast }       from 'sonner'
import { useAuth }     from '../context/AuthContext'
import { getInitials } from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'

const navItems = [
  { icon: BarChart2,     label: 'Mi ADN',        path: '/mi-adn',       end: false },
  { icon: User,          label: 'Mi Perfil',      path: '/profile',      end: false },
  { icon: Compass,       label: 'Explorar',       path: '/explore',      end: false },
  { icon: MessageCircle, label: 'Mensajes',       path: '/messages',     end: false },
  { icon: CalendarDays,  label: 'Tocatas',        path: '/tocatas',      end: false },
  { icon: Bell,          label: 'Notificaciones', path: '/notifications',end: false },
  { icon: Newspaper,     label: 'Noticias',       path: '/noticias',     end: false },
  { icon: HelpCircle,    label: 'Ayuda',          path: '/help',         end: false },
  { icon: Settings,      label: 'Ajustes',        path: '/settings',     end: false },
]

export default function Sidebar({ isOpen, onClose }) {
  const { logout, user } = useAuth()
  const navigate         = useNavigate()
  const { url: photoUrl } = useImageUrl(user?.foto_url ?? null)

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada. ¡Hasta la próxima!')
    navigate('/')
  }

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen w-64 z-40 flex flex-col
        bg-zinc-950 border-r border-white/8
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/8 flex-shrink-0">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="font-black text-white tracking-widest text-sm">BANDIFY</span>
        </Link>
      </div>

      {/* Avatar — enlaza al perfil público propio */}
      {user && (
        <div className="px-4 py-4 border-b border-white/8 flex-shrink-0">
          <Link
            to={user.nombre ? `/u/${user.nombre}` : '/profile'}
            onClick={onClose}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={user.nombre}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {getInitials(user.nombre)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-base font-bold truncate">{user.nombre}</p>
              <p className="text-white/80 text-xs truncate">
                {user.es_premium ? '✦ Premium' : user.email}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ icon: label, path, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-colors ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-white hover:bg-white/10'
              }`
            }
          >
            <NavIcon size={16} />
            {label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-colors mt-2 border border-purple-500/30 ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-400 hover:bg-purple-500/10'
              }`
            }
          >
            <Shield size={16} />
            Panel Admin
          </NavLink>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 pt-3 border-t border-white/8 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] font-semibold text-white hover:bg-white/10 transition-colors w-full text-left"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
