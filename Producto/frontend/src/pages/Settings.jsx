import { useState, useRef } from 'react'
import {
  Bell, Shield, User, Mail, Lock, AlertTriangle, ChevronRight,
  Camera, ImagePlus, Check, Loader2,
} from 'lucide-react'
import { useAuth }     from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { API_URL }     from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'
import { TAG_OPTIONS } from '../utils/audioHelpers'

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
function PanelPerfil({ user, token, updateUser }) {
  const { url: avatarUrl } = useImageUrl(user?.foto_url   ?? null)
  const { url: bannerUrl } = useImageUrl(user?.banner_url ?? null)

  const [nombre,      setNombre]      = useState(user?.nombre      || '')
  const [ciudad,      setCiudad]      = useState(user?.ciudad      || '')
  const [instrumento, setInstrumento] = useState(user?.instrumento || '')
  const [tags,        setTags]        = useState(() =>
    Array.isArray(user?.user_tags) ? user.user_tags : []
  )
  const [instagram,   setInstagram]   = useState(user?.instagram_url || '')
  const [spotify,     setSpotify]     = useState(user?.spotify_url   || '')
  const [discord,     setDiscord]     = useState(user?.discord_url   || '')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [uploading, setUploading] = useState(null) // 'avatar' | 'banner' | null

  const avatarRef = useRef(null)
  const bannerRef = useRef(null)

  const toggleTag = (tag) =>
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  /* Sube imagen a S3 y devuelve la key */
  const uploadImage = async (file, type) => {
    setUploading(type)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const urlRes = await fetch(`${API_URL}/images/upload-url?type=${type}&ext=${ext}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { uploadUrl, key } = await urlRes.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      return key
    } finally {
      setUploading(null)
    }
  }

  const handleImageChange = async (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return
    const key = await uploadImage(file, type)
    const field = type === 'avatar' ? 'foto_url' : 'banner_url'
    await fetch(`${API_URL}/usuarios/perfil`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ [field]: key }),
    })
    updateUser({ [field]: key })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/usuarios/perfil`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ nombre, ciudad, instrumento, user_tags: tags, instagram_url: instagram, spotify_url: spotify, discord_url: discord }),
      })
      if (res.ok) {
        updateUser({ nombre, ciudad, instrumento, user_tags: tags, instagram_url: instagram, spotify_url: spotify, discord_url: discord })
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Perfil</h2>
      <p className="text-zinc-500 text-sm mb-6">Información pública de tu cuenta.</p>

      {/* ── Multimedia ── */}
      <div className="mb-5">
        {/* Banner */}
        <div
          className="relative h-28 rounded-2xl bg-zinc-800 border border-white/8 overflow-hidden mb-3 cursor-pointer group"
          onClick={() => bannerRef.current?.click()}
        >
          {bannerUrl
            ? <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sin banner</div>
          }
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
            {uploading === 'banner' ? <Loader2 size={16} className="animate-spin" /> : <><ImagePlus size={15} /> Cambiar banner</>}
          </div>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'banner')} />

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div
            className="relative w-16 h-16 rounded-full bg-purple-600 flex-shrink-0 overflow-hidden cursor-pointer group border-2 border-zinc-800"
            onClick={() => avatarRef.current?.click()}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-lg flex items-center justify-center w-full h-full">
                  {(user?.nombre || '?')[0].toUpperCase()}
                </span>
            }
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading === 'avatar' ? <Loader2 size={14} className="animate-spin text-white" /> : <Camera size={14} className="text-white" />}
            </div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'avatar')} />
          <div>
            <p className="text-zinc-100 text-sm font-medium">{user?.nombre || '—'}</p>
            <p className="text-zinc-500 text-xs">Haz clic en la foto o el banner para cambiarlos</p>
          </div>
        </div>
      </div>

      {/* ── Formulario ── */}
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Nombre',       value: nombre,      set: setNombre,      placeholder: 'Tu nombre artístico' },
            { label: 'Ciudad',       value: ciudad,      set: setCiudad,      placeholder: 'Ej: Santiago'        },
            { label: 'Instrumento',  value: instrumento, set: setInstrumento, placeholder: 'Ej: Guitarra'        },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1.5">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          ))}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">Estilos musicales</label>
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  tags.includes(tag)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Redes sociales */}
        <div>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Redes sociales</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#e1306c' }}>Instagram</label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/tu_usuario"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#1db954' }}>Spotify</label>
              <input
                type="url"
                value={spotify}
                onChange={(e) => setSpotify(e.target.value)}
                placeholder="https://open.spotify.com/artist/..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7289da' }}>Discord</label>
              <input
                type="text"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="usuario#0000 o enlace de servidor"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="self-start flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving  ? <Loader2 size={14} className="animate-spin" /> :
           saved   ? <Check   size={14} /> : null}
          {saved ? 'Guardado' : 'Guardar cambios'}
        </button>
      </form>
    </>
  )
}

function PanelNotificaciones() {
  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Notificaciones</h2>
      <p className="text-zinc-500 text-sm mb-6">Elige qué alertas quieres recibir.</p>
      <div>
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
      <div>
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

      <div className="mb-6">
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
  const { user, token, updateUser } = useAuth()
  const navigate                    = useNavigate()
  const [activeId, setActiveId]     = useState('perfil')

  const renderPanel = () => {
    switch (activeId) {
      case 'perfil':         return <PanelPerfil user={user} token={token} updateUser={updateUser} />
      case 'notificaciones': return <PanelNotificaciones />
      case 'email':          return <PanelEmail  user={user} />
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

      {/* ── Master-Detail: sidebar izquierda, contenido derecha ── */}
      <div className="flex flex-col md:flex-row gap-0 items-start">

        {/* ── Sidebar izquierda ── */}
        <aside className="w-full md:w-48 flex-shrink-0 pr-8 border-b md:border-b-0 md:border-r border-zinc-800 mb-6 md:mb-0">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.group} className={si > 0 ? 'mt-6' : ''}>
              <p className="pb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                {section.group}
              </p>
              {section.items.map((item) => {
                const Icon     = item.icon
                const isActive = item.id === activeId
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={`w-full flex items-center gap-2.5 py-2 text-sm transition-colors text-left ${
                      isActive
                        ? 'text-purple-400 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-100'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-purple-400' : 'text-zinc-600'} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* ── Panel de contenido derecha ── */}
        <div className="flex-1 min-w-0 md:pl-10">
          {renderPanel()}
        </div>

      </div>
    </div>
  )
}
