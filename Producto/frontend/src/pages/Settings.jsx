import { useState } from 'react'
import {
  Bell, Shield, User, Mail, Lock, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { useAuth }     from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

/* ─── Toggle ─────────────────────────────────────────────────── */
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

/* ─── Fila de ajuste ─────────────────────────────────────────── */
function SettingRow({ label, description, action }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/6 last:border-0">
      <div className="min-w-0">
        <p className="text-zinc-100 text-sm font-medium">{label}</p>
        {description && <p className="text-zinc-500 text-xs mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  )
}

/* ─── Paneles ────────────────────────────────────────────────── */
function PanelPerfil({ user }) {
  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Perfil</h2>
      <p className="text-zinc-500 text-sm mb-6">Información pública de tu cuenta.</p>
      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
        <SettingRow label="Nombre"      action={<span className="text-zinc-400 text-sm">{user?.nombre      || '—'}</span>} />
        <SettingRow label="Ciudad"      action={<span className="text-zinc-400 text-sm">{user?.ciudad      || '—'}</span>} />
        <SettingRow label="Instrumento" action={<span className="text-zinc-400 text-sm">{user?.instrumento || '—'}</span>} />
        <SettingRow label="Editar perfil completo" action={<ChevronRight size={15} className="text-zinc-600" />} />
      </div>
    </>
  )
}

function PanelNotificaciones() {
  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Notificaciones</h2>
      <p className="text-zinc-500 text-sm mb-6">Elige qué alertas quieres recibir.</p>
      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
        <SettingRow label="Nuevos matches"       description="Músicos compatibles con tu ADN"          action={<Toggle defaultChecked={true}  />} />
        <SettingRow label="Mensajes directos"    description="Notificaciones de mensajes nuevos"        action={<Toggle defaultChecked={true}  />} />
        <SettingRow label="Tocatas cercanas"     description="Eventos en tu ciudad"                     action={<Toggle defaultChecked={false} />} />
        <SettingRow label="Novedades de Bandify" description="Actualizaciones y noticias"               action={<Toggle defaultChecked={false} />} />
      </div>
    </>
  )
}

function PanelEmail({ user }) {
  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Correo electrónico</h2>
      <p className="text-zinc-500 text-sm mb-6">Cambia el correo asociado a tu cuenta.</p>
      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
        <SettingRow label="Correo actual" action={<span className="text-zinc-400 text-sm">{user?.email || '—'}</span>} />
      </div>
      <form className="mt-5 flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Nuevo correo</label>
          <input
            type="email"
            placeholder="nuevo@correo.com"
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <button
          type="submit"
          className="self-start px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Actualizar correo
        </button>
      </form>
    </>
  )
}

function PanelContrasena() {
  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Contraseña</h2>
      <p className="text-zinc-500 text-sm mb-6">Actualiza tu contraseña de acceso.</p>
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        {[
          { label: 'Contraseña actual',       placeholder: '••••••••', id: 'actual'    },
          { label: 'Nueva contraseña',         placeholder: '••••••••', id: 'nueva'     },
          { label: 'Confirmar nueva contraseña', placeholder: '••••••••', id: 'confirmar' },
        ].map(({ label, placeholder, id }) => (
          <div key={id}>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1.5">{label}</label>
            <input
              type="password"
              placeholder={placeholder}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
        ))}
        <button
          type="submit"
          className="self-start px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors mt-1"
        >
          Cambiar contraseña
        </button>
      </form>
    </>
  )
}

function PanelSeguridad() {
  const [confirmar, setConfirmar] = useState(false)

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Seguridad</h2>
      <p className="text-zinc-500 text-sm mb-6">Opciones de seguridad de tu cuenta.</p>

      <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8 mb-6">
        <SettingRow label="Sesiones activas"  description="Administra los dispositivos conectados" action={<ChevronRight size={15} className="text-zinc-600" />} />
        <SettingRow label="Autenticación en dos pasos" description="Próximamente" action={
          <span className="text-xs text-zinc-600 font-medium">No disponible</span>
        } />
      </div>

      {/* Zona de peligro */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={15} className="text-red-400" />
          <p className="text-red-400 text-sm font-bold uppercase tracking-wide">Zona de peligro</p>
        </div>
        <p className="text-zinc-500 text-xs mb-5">Las acciones de esta sección son permanentes e irreversibles.</p>

        {!confirmar ? (
          <button
            onClick={() => setConfirmar(true)}
            className="px-4 py-2 text-sm font-semibold text-red-400 border border-red-500/40 rounded-xl hover:bg-red-500/10 transition-colors"
          >
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-zinc-300 text-sm">¿Estás seguro? Esta acción eliminará todos tus datos permanentemente.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmar(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors">
                Sí, eliminar cuenta
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ─── Estructura del menú ────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    group: 'GENERAL',
    items: [
      { id: 'perfil',          label: 'Perfil',          icon: User  },
      { id: 'notificaciones',  label: 'Notificaciones',  icon: Bell  },
    ],
  },
  {
    group: 'CUENTA',
    items: [
      { id: 'email',      label: 'Email',       icon: Mail },
      { id: 'contrasena', label: 'Contraseña',  icon: Lock },
    ],
  },
  {
    group: 'SEGURIDAD',
    items: [
      { id: 'seguridad', label: 'Seguridad', icon: Shield },
    ],
  },
]

/* ─── Página principal ───────────────────────────────────────── */
export default function Settings() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [activeId, setActiveId] = useState('perfil')

  const renderPanel = () => {
    switch (activeId) {
      case 'perfil':         return <PanelPerfil         user={user} />
      case 'notificaciones': return <PanelNotificaciones />
      case 'email':          return <PanelEmail          user={user} />
      case 'contrasena':     return <PanelContrasena />
      case 'seguridad':      return <PanelSeguridad />
      default:               return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configuración de la cuenta</h1>
        <p className="text-zinc-500 text-sm mt-1">Gestiona tu perfil, privacidad y seguridad.</p>
      </div>

      {/* ── Master-Detail: flex-row-reverse → sidebar derecha, contenido izquierda ── */}
      <div className="flex flex-col-reverse md:flex-row-reverse gap-6 items-start">

        {/* ── Sidebar derecha (siempre visible en desktop) ── */}
        <aside className="w-full md:w-52 flex-shrink-0 bg-zinc-950 border border-white/8 rounded-2xl overflow-hidden">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.group}>
              {si > 0 && <div className="border-t border-white/8" />}
              <p className="px-4 pt-4 pb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                {section.group}
              </p>
              {section.items.map((item) => {
                const Icon     = item.icon
                const isActive = item.id === activeId
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                      isActive
                        ? 'text-purple-400 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-purple-400' : 'text-zinc-600'} />
                    {item.label}
                  </button>
                )
              })}
              {si === NAV_SECTIONS.length - 1 && <div className="pb-3" />}
            </div>
          ))}
        </aside>

        {/* ── Panel de contenido izquierda ── */}
        <div className="flex-1 min-w-0">
          {renderPanel()}
        </div>

      </div>
    </div>
  )
}
