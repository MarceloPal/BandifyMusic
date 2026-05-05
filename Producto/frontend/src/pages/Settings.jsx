import { useState } from 'react'
import { Settings2, Bell, Shield, Trash2, ChevronRight, Menu, X, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

/* ── Toggle switch ────────────────────────────────────────────── */
function Toggle({ defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-purple-600' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

/* ── Fila de ajuste ───────────────────────────────────────────── */
function SettingRow({ label, description, action }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/8 last:border-0">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-zinc-500 text-xs mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ── Secciones del menú ───────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    title: 'General',
    items: [
      { id: 'notificaciones', label: 'Notificaciones',  icon: Bell   },
      { id: 'privacidad',     label: 'Privacidad',      icon: Shield },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { id: 'cuenta',  label: 'Información de cuenta', icon: User    },
      { id: 'peligro', label: 'Zona de peligro',        icon: Trash2  },
    ],
  },
]

/* ── Contenido por sección ────────────────────────────────────── */
function PanelNotificaciones() {
  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Notificaciones</h2>
      <p className="text-zinc-400 text-sm mb-6">Elige qué alertas quieres recibir.</p>
      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
        <SettingRow label="Nuevos matches"       description="Recibe alertas cuando hay músicos compatibles"  action={<Toggle defaultChecked={true}  />} />
        <SettingRow label="Mensajes directos"    description="Notificaciones de mensajes nuevos"              action={<Toggle defaultChecked={true}  />} />
        <SettingRow label="Tocatas cercanas"     description="Eventos en tu ciudad"                           action={<Toggle defaultChecked={false} />} />
        <SettingRow label="Novedades de Bandify" description="Actualizaciones y noticias de la plataforma"   action={<Toggle defaultChecked={false} />} />
      </div>
    </>
  )
}

function PanelPrivacidad() {
  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Privacidad</h2>
      <p className="text-zinc-400 text-sm mb-6">Controla quién puede ver tu información.</p>
      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
        <SettingRow label="Perfil visible en Explorar" description="Otros músicos pueden encontrarte"  action={<Toggle defaultChecked={true} />} />
        <SettingRow label="Mostrar ciudad en mi perfil"                                                 action={<Toggle defaultChecked={true} />} />
        <SettingRow label="Política de privacidad"     action={<ChevronRight size={15} className="text-zinc-600" />} />
      </div>
    </>
  )
}

function PanelCuenta({ user }) {
  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Información de cuenta</h2>
      <p className="text-zinc-400 text-sm mb-6">Datos asociados a tu perfil de Bandify.</p>
      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
        <SettingRow label="Nombre"       action={<span className="text-zinc-400 text-sm">{user?.nombre  || '—'}</span>} />
        <SettingRow label="Correo"       action={<span className="text-zinc-400 text-sm">{user?.email   || '—'}</span>} />
        <SettingRow label="Ciudad"       action={<span className="text-zinc-400 text-sm">{user?.ciudad  || '—'}</span>} />
        <SettingRow label="Instrumento"  action={<span className="text-zinc-400 text-sm">{user?.instrumento || '—'}</span>} />
      </div>
    </>
  )
}

function PanelPeligro({ onLogout }) {
  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Zona de peligro</h2>
      <p className="text-zinc-400 text-sm mb-6">Acciones irreversibles sobre tu cuenta.</p>
      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
        <SettingRow label="Cerrar sesión" action={
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-medium">
            <LogOut size={13} />
            Salir
          </button>
        } />
        <SettingRow label="Eliminar cuenta" description="Esta acción es irreversible" action={
          <button className="text-xs text-red-500 hover:text-red-400 transition-colors font-medium">
            Eliminar
          </button>
        } />
      </div>
    </>
  )
}

/* ── Página principal ─────────────────────────────────────────── */
export default function Settings() {
  const { logout, user } = useAuth()
  const navigate         = useNavigate()
  const [activeId, setActiveId]   = useState('notificaciones')
  const [menuOpen, setMenuOpen]   = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  const handleSelect = (id) => {
    setActiveId(id)
    setMenuOpen(false)
  }

  const renderPanel = () => {
    switch (activeId) {
      case 'notificaciones': return <PanelNotificaciones />
      case 'privacidad':     return <PanelPrivacidad />
      case 'cuenta':         return <PanelCuenta user={user} />
      case 'peligro':        return <PanelPeligro onLogout={handleLogout} />
      default:               return null
    }
  }

  const activeLabel = NAV_SECTIONS
    .flatMap((s) => s.items)
    .find((i) => i.id === activeId)?.label ?? 'Configuración'

  return (
    <div className="max-w-4xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Settings2 size={24} />
            Configuración de la cuenta
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Personaliza tu experiencia en Bandify.</p>
        </div>

        {/* Botón toggle menú */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-sm font-medium"
        >
          {menuOpen ? <X size={16} /> : <Menu size={16} />}
          {menuOpen ? 'Cerrar' : 'Menú'}
        </button>
      </div>

      {/* ── Layout: panel + menú derecho ── */}
      <div className="flex gap-6 items-start">

        {/* Panel de contenido */}
        <div className="flex-1 min-w-0">
          {renderPanel()}
        </div>

        {/* Menú lateral derecho */}
        {menuOpen && (
          <aside className="w-64 flex-shrink-0 bg-zinc-900 border border-white/8 rounded-2xl overflow-hidden">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-5 pt-5 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon    = item.icon
                  const isActive = item.id === activeId
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors text-left ${
                        isActive
                          ? 'text-purple-400 bg-purple-500/10 font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-purple-400' : 'text-zinc-500'} />
                      {item.label}
                    </button>
                  )
                })}
                <div className="border-b border-white/8 mx-5 last:hidden" />
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  )
}
