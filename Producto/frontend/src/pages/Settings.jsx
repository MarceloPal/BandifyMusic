import { useState } from 'react'
import { Settings2, Bell, Shield, Trash2, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function Toggle({ defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
        on ? 'bg-purple-600' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon size={14} className="text-zinc-500" />
      <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">{label}</p>
    </div>
  )
}

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

export default function Settings() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Settings2 size={24} />
          Configuración
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">Personaliza tu experiencia en Bandify.</p>
      </div>

      {/* Notificaciones */}
      <div className="mb-5">
        <SectionTitle icon={Bell} label="Notificaciones" />
        <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
          <SettingRow label="Nuevos matches"      description="Recibe alertas cuando hay músicos compatibles" action={<Toggle defaultChecked={true}  />} />
          <SettingRow label="Mensajes directos"   description="Notificaciones de mensajes nuevos"             action={<Toggle defaultChecked={true}  />} />
          <SettingRow label="Tocatas cercanas"     description="Eventos en tu ciudad"                         action={<Toggle defaultChecked={false} />} />
          <SettingRow label="Novedades de Bandify" description="Actualizaciones y noticias de la plataforma"  action={<Toggle defaultChecked={false} />} />
        </div>
      </div>

      {/* Privacidad */}
      <div className="mb-5">
        <SectionTitle icon={Shield} label="Privacidad" />
        <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
          <SettingRow label="Perfil visible en Explorar" description="Otros músicos pueden encontrarte" action={<Toggle defaultChecked={true} />} />
          <SettingRow label="Mostrar ciudad en mi perfil"                                                action={<Toggle defaultChecked={true} />} />
          <SettingRow label="Política de privacidad" action={<ChevronRight size={15} className="text-zinc-600" />} />
        </div>
      </div>

      {/* Cuenta */}
      <div>
        <SectionTitle icon={Trash2} label="Cuenta" />
        <div className="bg-zinc-900 rounded-2xl px-5 py-1 border border-white/8">
          <SettingRow label="Cerrar sesión" action={
            <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors font-medium">
              Salir
            </button>
          } />
          <SettingRow label="Eliminar cuenta" description="Esta acción es irreversible" action={
            <button className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium">
              Eliminar
            </button>
          } />
        </div>
      </div>
    </div>
  )
}
