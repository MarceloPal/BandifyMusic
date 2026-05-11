import { useState, useRef } from 'react'
import {
  Bell, Shield, User, Mail, Lock, AlertTriangle, ChevronRight,
  Camera, ImagePlus, Check, Loader2, CreditCard,
} from 'lucide-react'
import { useAuth }     from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { API_URL }     from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'
import { TAG_OPTIONS, OFICIOS, MAX_TAGS, CIUDADES_CHILE } from '../utils/audioHelpers'

/* ─── Toggle ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-purple-600' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block w-5 h-5 mt-0.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
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

  const [nombre,  setNombre]  = useState(user?.nombre  || '')
  const [ciudad,  setCiudad]  = useState(user?.ciudad  || '')
  const [fechaNac, setFechaNac] = useState(user?.fecha_nacimiento?.slice(0, 10) || '')
  const [oficio,  setOficio]  = useState(() =>
    Array.isArray(user?.oficio) ? user.oficio : []
  )
  const [tags,    setTags]    = useState(() =>
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
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= MAX_TAGS) return prev   // límite alcanzado, no añadir
      return [...prev, tag]
    })

  const toggleOficio = (o) =>
    setOficio((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])

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
        body:    JSON.stringify({ nombre, ciudad, fecha_nacimiento: fechaNac || null, oficio, user_tags: tags, instagram_url: instagram, spotify_url: spotify, discord_url: discord }),
      })
      if (res.ok) {
        updateUser({ nombre, ciudad, fecha_nacimiento: fechaNac || null, oficio, user_tags: tags, instagram_url: instagram, spotify_url: spotify, discord_url: discord })
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
              ? <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover aspect-square" />
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
          {/* Nombre */}
          <div>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre artístico"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          {/* Ciudad — dropdown cerrado con lista de ciudades chilenas */}
          <div>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Ciudad</label>
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 [color-scheme:dark] appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='rgba(161,161,170,1)'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem',
                paddingRight: '2.5rem',
              }}
            >
              <option value="">Selecciona tu ciudad...</option>
              {CIUDADES_CHILE.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Fecha de nacimiento</label>
            <input
              type="date"
              value={fechaNac}
              onChange={(e) => setFechaNac(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Oficio */}
        <div>
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">Oficio</label>
          <div className="flex flex-wrap gap-1.5">
            {OFICIOS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => toggleOficio(o)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  oficio.includes(o)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Tags — máximo MAX_TAGS para mantener calidad del matching */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wide">
              Estilos musicales
            </label>
            <span className={`text-xs font-semibold ${
              tags.length >= MAX_TAGS ? 'text-purple-400' : 'text-zinc-500'
            }`}>
              {tags.length} / {MAX_TAGS}
              {tags.length >= MAX_TAGS && ' · Límite alcanzado'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((tag) => {
              const isSelected = tags.includes(tag)
              const isDisabled = !isSelected && tags.length >= MAX_TAGS
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={isDisabled}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : isDisabled
                      ? 'bg-zinc-900/50 text-zinc-700 border-zinc-800 cursor-not-allowed'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
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

const NOTIF_ITEMS = [
  {
    id:          'mensajes',
    label:       'Mensajes directos',
    description: 'Recibe una notificación cada vez que un músico te envíe un mensaje nuevo.',
  },
  {
    id:          'novedades',
    label:       'Novedades de Bandify',
    description: 'Actualizaciones importantes, cambios en tu ADN Musical y noticias de la plataforma.',
  },
  {
    id:          'eventos',
    label:       'Ofertas de eventos y tocatas',
    description: 'No te pierdas ninguna de las ofertas exclusivas y preventas de tickets en Bandify.',
  },
  {
    id:          'boletin',
    label:       'Boletines de noticias',
    description: 'Mantente al día con las últimas noticias de la comunidad y resúmenes semanales suscribiéndote a nuestro boletín.',
  },
  {
    id:          'promociones',
    label:       'Actualizaciones promocionales',
    description: 'Recibe información sobre promociones generales, servicios para músicos y ofertas de nuestros socios.',
  },
]

function PanelNotificaciones() {
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(NOTIF_ITEMS.map((item) => [item.id, false]))
  )

  const allOn  = NOTIF_ITEMS.every((item) => prefs[item.id])
  const allOff = NOTIF_ITEMS.every((item) => !prefs[item.id])

  const toggleMaster = (val) =>
    setPrefs(Object.fromEntries(NOTIF_ITEMS.map((item) => [item.id, val])))

  const toggleOne = (id, val) =>
    setPrefs((prev) => ({ ...prev, [id]: val }))

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Notificaciones</h2>
      <p className="text-zinc-500 text-sm mb-6">Elige qué alertas quieres recibir.</p>

      {/* ── Toggle maestro ── */}
      <div className="flex items-start justify-between gap-4 pb-5 mb-2 border-b border-white/10">
        <div className="min-w-0 flex-1">
          <p className="text-zinc-100 text-sm font-semibold">Todas las notificaciones</p>
          <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
            Activa o desactiva todas las preferencias de notificaciones a la vez.
          </p>
        </div>
        <Toggle checked={allOn} onChange={toggleMaster} />
      </div>

      {/* ── Opciones individuales ── */}
      <div>
        {NOTIF_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4 py-4 border-b border-white/6 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-zinc-100 text-sm font-medium">{item.label}</p>
              <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{item.description}</p>
            </div>
            <Toggle
              checked={prefs[item.id]}
              onChange={(val) => toggleOne(item.id, val)}
            />
          </div>
        ))}
      </div>
    </>
  )
}

function PanelEmail({ user }) {
  const [linkSent, setLinkSent] = useState(false)

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Cambiar correo</h2>
      <p className="text-zinc-500 text-sm mb-8">
        Cambia la dirección de correo que utilizas para acceder y recibir información de Bandify.
      </p>

      {/* Correo actual */}
      <div className="mb-6">
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">Correo actual</p>
        <p className="text-zinc-100 text-sm font-medium">{user?.email || '—'}</p>
      </div>

      {/* Texto instructivo */}
      <p className="text-zinc-400 text-sm leading-relaxed mb-6">
        Cuando pulses sobre el botón a continuación se te enviará un enlace seguro a la bandeja
        de entrada de tu correo con instrucciones sobre cómo cambiar tu correo.
      </p>

      {/* Aviso de éxito */}
      {linkSent && (
        <div className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/8">
          <Check size={15} className="text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-green-300 text-sm leading-relaxed">
            ¡Estupendo! Revisa la bandeja de entrada de tu correo para encontrar las instrucciones
            con las que completar el proceso.
          </p>
        </div>
      )}

      {/* Botón */}
      <button
        type="button"
        disabled={linkSent}
        onClick={() => setLinkSent(true)}
        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors mb-8"
      >
        Enviar enlace de cambio de correo
      </button>

      {/* Ayuda */}
      <p className="text-zinc-600 text-xs">
        ¿Tienes problemas?{' '}
        <a
          href="mailto:soporte@bandify.cl"
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          Contáctanos en Soporte al cliente
        </a>
        .
      </p>
    </>
  )
}

function PanelContrasena() {
  const navigate = useNavigate()

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Cambiar contraseña</h2>
      <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
        Cambiar tu contraseña cerrará tu sesión en otros dispositivos. Tendrás que ingresar
        en ellos tu nueva contraseña para acceder de nuevo a tu cuenta.
      </p>

      <button
        type="button"
        onClick={() => navigate('/cambiar-contrasena')}
        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors mb-8"
      >
        Restablecer contraseña
      </button>

      <p className="text-zinc-600 text-xs">
        ¿Tienes problemas?{' '}
        <a
          href="mailto:soporte@bandify.cl"
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          Contáctanos en Soporte al cliente
        </a>
        .
      </p>
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

function PanelSuscripcion() {
  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Información de suscripción</h2>
      <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
        Gestiona tu plan, administra métodos de pago y revisa tu historial de compras.
      </p>

      {/* ── Plan actual ── */}
      <div className="mb-8">
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">Plan actual</p>
        <p className="text-white text-lg font-bold mb-1">Plan Gratuito</p>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
          Únete a Premium para subir demos ilimitados, obtener análisis de IA avanzados
          y destacar en el radar.
        </p>
      </div>

      {/* ── Tarjeta Premium ── */}
      <div
        className="rounded-2xl border border-zinc-800 p-8 mb-10"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(124,58,237,0.15) 0%, #18181b 60%)' }}
      >
        <p className="text-white text-xl font-bold mb-3">Mejora a Premium</p>
        <p className="text-zinc-300 text-sm leading-relaxed mb-6 max-w-md">
          Sube demos ilimitados, obtén análisis detallados, destaca tu perfil y organiza
          tocatas sin límites. ¡Desde <span className="text-white font-semibold">CLP 2.990/mes</span>!
        </p>
        <button
          type="button"
          className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold tracking-wide rounded-xl transition-colors"
        >
          VER OPCIONES DE PLAN
        </button>
      </div>

      {/* ── Historial de pedidos ── */}
      <div className="border-t border-zinc-800 pt-8">
        <p className="text-white text-base font-semibold mb-3">Historial de pedidos</p>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
          Para información sobre los impuestos aplicados o tus tickets de tocatas, revisa los{' '}
          <a href="#" className="text-purple-400 hover:underline transition-colors">
            Detalles del Pedido
          </a>
          . Si tienes alguna pregunta, por favor contacta con{' '}
          <a
            href="mailto:soporte@bandify.cl"
            className="text-purple-400 hover:underline transition-colors"
          >
            Soporte al Cliente
          </a>
          .
        </p>
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
  {
    group: 'FACTURACIÓN',
    items: [
      { id: 'suscripcion', label: 'Suscripción', icon: CreditCard },
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
      case 'suscripcion':    return <PanelSuscripcion />
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

        {/* ── Sidebar izquierda — sticky en desktop ── */}
        {/* md:sticky md:top-24 → se queda fija debajo del navbar al hacer scroll.
            md:self-start → no estira para llenar la altura del flex container,
            requisito de sticky.
            Solo aplica en md+ para que en mobile el menú quede arriba del contenido. */}
        <aside className="w-full md:w-48 flex-shrink-0 pr-8 border-b md:border-b-0 md:border-r border-zinc-800 mb-6 md:mb-0 md:sticky md:top-24 md:self-start">
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

        {/* ── Panel de contenido derecha — bg-transparent para que herede
              el gris de MainLayout (bg-zinc-900) sin contraste extra. ── */}
        <div className="flex-1 min-w-0 md:pl-10 bg-transparent">
          {renderPanel()}
        </div>

      </div>
    </div>
  )
}
