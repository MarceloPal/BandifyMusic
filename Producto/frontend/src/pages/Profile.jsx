import { useMemo, useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Music2, Upload, ChevronDown, Zap, Wind, Activity, Sparkles, Tag, Camera, Loader2,
  MapPin, Briefcase, Calendar, Edit3, BarChart2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL, getInitials } from '../utils/helpers'
import { parseVector, parseMetadata, deriveStats, CHROMA_LABELS, OFICIOS, TAG_OPTIONS, deriveMood, detectKey, suggestGenres } from '../utils/audioHelpers'
import { useImageUrl } from '../hooks/useImageUrl'
import AudioPlayer from '../components/AudioPlayer'

const TEXTURE_ICONS = { Zap, Wind, Activity, Sparkles }

/* ─── sub-components ─── */

function Badge({ text, color = 'gray' }) {
  const colors = {
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    blue:   'bg-blue-500/20   text-blue-300   border-blue-500/30',
    green:  'bg-green-500/20  text-green-300  border-green-500/30',
    gray:   'bg-white/10      text-zinc-300   border-white/10',
  }
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {text}
    </span>
  )
}

function StatPill({ label, value, unit = '' }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl bg-white/5 border border-white/10">
      <span className="text-purple-400 font-bold text-lg leading-none">
        {value}<span className="text-xs font-semibold text-zinc-500 ml-0.5">{unit}</span>
      </span>
      <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">{label}</span>
    </div>
  )
}

function DescBar({ label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-400 text-xs font-semibold">{label}</span>
        <span className="text-zinc-500 text-xs tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function HpsBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-400 text-xs w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-zinc-300 font-bold text-xs tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

function ChromaChart({ chroma }) {
  const max = Math.max(...chroma, 0.01)
  return (
    <div className="flex items-end gap-1 h-16">
      {chroma.map((val, i) => {
        const pct = (val / max) * 100
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.max(3, Math.round(pct * 0.52))}px`,
                background: pct > 70 ? '#a855f7' : pct > 40 ? '#7c3aed' : '#4c1d95',
              }}
            />
            <span className="text-zinc-600 font-medium" style={{ fontSize: '8px', lineHeight: 1 }}>
              {CHROMA_LABELS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── main component ─── */

export default function Profile() {
  const { user, token, updateUser } = useAuth()
  const [editing, setEditing]         = useState(false)
  const [expanded, setExpanded]       = useState(false)
  const [error, setError]             = useState('')
  const [photoUploading, setPhotoUploading]   = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const photoInputRef  = useRef(null)
  const bannerInputRef = useRef(null)

  const { url: photoUrl }  = useImageUrl(user?.foto_url  ?? null)
  const { url: bannerUrl } = useImageUrl(user?.banner_url ?? null)

  const [bio,         setBio]         = useState(user?.bio         ?? '')
  const [experiencia, setExperiencia] = useState(user?.experiencia ?? '')
  const [selectedOficio, setSelectedOficio] = useState(
    Array.isArray(user?.oficio) ? user.oficio : []
  )
  const [selectedTags, setSelectedTags] = useState(
    Array.isArray(user?.user_tags) ? user.user_tags : []
  )
  const [instagram, setInstagram] = useState(user?.instagram_url ?? '')
  const [spotify,   setSpotify]   = useState(user?.spotify_url   ?? '')
  const [discord,   setDiscord]   = useState(user?.discord_url   ?? '')

  // Audio listen URL para reproducir el demo
  const [audioUrl, setAudioUrl] = useState(null)
  useEffect(() => {
    if (!user?.s3_key || !token) { setAudioUrl(null); return }
    let cancelled = false
    fetch(`${API_URL}/audio/listen-url?key=${encodeURIComponent(user.s3_key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data?.url) setAudioUrl(data.url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.s3_key, token])

  const updateMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch(`${API_URL}/usuarios/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => { updateUser(data); setEditing(false) },
    onError:   (err)  => setError(err.message),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.target)
    const body = {}
    for (const [key, value] of fd.entries()) { if (value) body[key] = value }
    if (bio.trim())             body.bio           = bio.trim()
    if (experiencia)            body.experiencia   = parseInt(experiencia)
    if (selectedOficio.length)  body.oficio        = selectedOficio
    if (selectedTags.length)    body.user_tags     = selectedTags
    if (instagram.trim())       body.instagram_url = instagram.trim()
    if (spotify.trim())         body.spotify_url   = spotify.trim()
    if (discord.trim())         body.discord_url   = discord.trim()
    if (Object.keys(body).length === 0) return
    updateMutation.mutate(body)
  }

  const handlePhotoUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setError('Formato de imagen no válido. Usa JPG, PNG o WEBP.')
      return
    }
    setPhotoUploading(true)
    setError('')
    try {
      const urlRes = await fetch(`${API_URL}/images/upload-url?type=avatar&ext=${ext === 'jpeg' ? 'jpg' : ext}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { uploadUrl, key } = await urlRes.json()
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file })
      const perfRes = await fetch(`${API_URL}/usuarios/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ foto_url: key }),
      })
      if (perfRes.ok) updateUser({ foto_url: key })
    } catch {
      setError('No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleBannerUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return
    setBannerUploading(true)
    try {
      const urlRes = await fetch(`${API_URL}/images/upload-url?type=banner&ext=${ext === 'jpeg' ? 'jpg' : ext}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { uploadUrl, key } = await urlRes.json()
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file })
      const perfRes = await fetch(`${API_URL}/usuarios/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ banner_url: key }),
      })
      if (perfRes.ok) updateUser({ banner_url: key })
    } catch {
      setError('No se pudo subir el banner. Intenta de nuevo.')
    } finally {
      setBannerUploading(false)
    }
  }

  const toggleOficio = (o) => setSelectedOficio((prev) =>
    prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
  )
  const toggleTag = (t) => setSelectedTags((prev) =>
    prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
  )

  const v     = useMemo(() => parseVector(user?.audio_vector),    [user?.audio_vector])
  const meta  = useMemo(() => parseMetadata(user?.audio_metadata), [user?.audio_metadata])
  const stats = useMemo(() => v ? deriveStats(v, meta) : null,    [v, meta])
  const TextureIcon = stats ? (TEXTURE_ICONS[stats.texture.icon] ?? Activity) : null

  if (!user) return null
  const tieneAnalisis = Boolean(user?.s3_key)
  const oficioUser    = Array.isArray(user?.oficio)    ? user.oficio    : []
  const tagsUser      = Array.isArray(user?.user_tags) ? user.user_tags : []

  return (
    /* Rompe el padding del layout y pone fondo oscuro en toda la página */
    <div className="-mx-6 -mt-8 min-h-screen pb-12">

      {/* Hidden inputs */}
      <input ref={photoInputRef}  type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files[0])} />
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleBannerUpload(e.target.files[0])} />

      {/* ── Banner hero ── */}
      <div className="relative h-72 w-full group">
        {/* Imagen o gradiente de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-zinc-900">
          {bannerUrl && (
            <img src={bannerUrl} alt="banner" className="w-full h-full object-cover opacity-60" />
          )}
        </div>

        {/* Gradiente de fade hacia abajo */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

        {/* Botón cambiar banner */}
        <button
          onClick={() => bannerInputRef.current?.click()}
          disabled={bannerUploading}
          className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
        >
          {bannerUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          {bannerUploading ? 'Subiendo...' : 'Cambiar banner'}
        </button>

        {/* Avatar + nombre superpuesto en la parte baja del banner */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 flex items-end justify-between gap-4">
          <div className="flex items-end gap-4 min-w-0 flex-1">
            {/* Avatar */}
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="group/avatar relative w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-900 shadow-xl focus:outline-none flex-shrink-0"
            >
              {photoUrl ? (
                <img src={photoUrl} alt={user.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-white font-bold text-3xl">
                  {getInitials(user.nombre)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                {photoUploading
                  ? <Loader2 size={18} className="text-white animate-spin" />
                  : <Camera size={18} className="text-white" />}
              </div>
            </button>

            {/* Nombre + oficio chips + stats line */}
            <div className="pb-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-white text-3xl font-black tracking-tight leading-none drop-shadow">{user.nombre}</h1>
                {user.es_premium && (
                  <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ✦ Premium
                  </span>
                )}
              </div>

              {/* Oficio chips */}
              {oficioUser.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {oficioUser.map((o) => (
                    <span key={o} className="bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-0.5 rounded-full border border-white/20">
                      {o}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats line — instrumento · ciudad · experiencia */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-zinc-300 text-xs">
                {user.instrumento && (
                  <span className="flex items-center gap-1"><Music2 size={11} /> {user.instrumento}</span>
                )}
                {user.ciudad && (
                  <span className="flex items-center gap-1"><MapPin size={11} /> {user.ciudad}</span>
                )}
                {user.experiencia && (
                  <span className="flex items-center gap-1">
                    <Briefcase size={11} /> {user.experiencia} {user.experiencia === 1 ? 'año' : 'años'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botón editar */}
          {!editing && (
            <button
              onClick={() => {
                setBio(user?.bio ?? '')
                setExperiencia(user?.experiencia ?? '')
                setSelectedOficio(Array.isArray(user?.oficio) ? user.oficio : [])
                setSelectedTags(Array.isArray(user?.user_tags) ? user.user_tags : [])
                setInstagram(user?.instagram_url ?? '')
                setSpotify(user?.spotify_url ?? '')
                setDiscord(user?.discord_url ?? '')
                setEditing(true)
              }}
              className="flex-shrink-0 mb-1 bg-white text-zinc-900 font-bold px-5 py-2 rounded-full text-sm hover:bg-zinc-200 transition-colors shadow-lg flex items-center gap-1.5"
            >
              <Edit3 size={13} />
              Editar
            </button>
          )}
        </div>
      </div>

      {/* ── Quick ADN summary band (mood + tonalidad + géneros) ── */}
      {stats && (() => {
        const mood = deriveMood(stats)
        const key  = detectKey(stats.chroma)
        const gens = suggestGenres(stats)
        return (
          <div className="max-w-5xl mx-auto px-6 mt-5">
            <div className="bg-zinc-800 rounded-2xl p-4 border border-white/8 flex flex-wrap items-center gap-2.5">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ background: mood.color }}
              >
                {mood.label}
              </div>
              {key && (
                <span className="px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-zinc-200 text-xs font-semibold">
                  ♪ {key}
                </span>
              )}
              <span className="px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                {stats.bpm} BPM
              </span>
              <div className="flex flex-wrap gap-1.5 ml-auto">
                {gens.map((g) => (
                  <span key={g} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-zinc-300 text-xs font-medium">
                    #{g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Contenido ── */}
      <div className="max-w-5xl mx-auto px-6 mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Identidad artística — siempre visible (con empty state) */}
        <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8">
          <div className="flex items-center gap-1.5 mb-3">
            <Tag size={13} className="text-purple-400" />
            <p className="text-zinc-300 text-xs font-bold uppercase tracking-wide">Identidad Artística</p>
          </div>
          {user?.bio ? (
            <p className="text-zinc-200 text-sm leading-relaxed mb-3">{user.bio}</p>
          ) : (
            <p className="text-zinc-500 text-sm italic mb-3">Cuéntanos sobre tu música y lo que buscas...</p>
          )}
          {tagsUser.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tagsUser.map((t) => (
                <span key={t} className="bg-purple-500/15 text-purple-200 text-xs px-2.5 py-1 rounded-full border border-purple-500/30 font-semibold">
                  #{t}
                </span>
              ))}
            </div>
          ) : !user?.bio && (
            <button
              onClick={() => {
                setBio(user?.bio ?? '')
                setExperiencia(user?.experiencia ?? '')
                setSelectedOficio(Array.isArray(user?.oficio) ? user.oficio : [])
                setSelectedTags(Array.isArray(user?.user_tags) ? user.user_tags : [])
                setInstagram(user?.instagram_url ?? '')
                setSpotify(user?.spotify_url ?? '')
                setDiscord(user?.discord_url ?? '')
                setEditing(true)
              }}
              className="text-purple-400 text-xs font-semibold hover:text-purple-300 transition-colors"
            >
              + Completa tu perfil
            </button>
          )}
        </div>

        {/* Redes sociales */}
        {(user?.instagram_url || user?.spotify_url || user?.discord_url) && (
          <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-3">Redes sociales</p>
            <div className="flex flex-wrap gap-2">
              {user.instagram_url && (
                <a href={user.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                  <IgIcon /> Instagram
                </a>
              )}
              {user.spotify_url && (
                <a href={user.spotify_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-[#1db954] hover:opacity-80 transition-opacity">
                  <SpotifyIcon /> Spotify
                </a>
              )}
              {user.discord_url && (
                <a href={user.discord_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-[#5865f2] hover:opacity-80 transition-opacity">
                  <DiscordIcon /> Discord
                </a>
              )}
            </div>
          </div>
        )}

        {/* Mi ADN Musical */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-800/50 rounded-2xl border border-white/8 overflow-hidden lg:col-span-2 shadow-lg shadow-purple-900/5">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shadow-md shadow-purple-900/30">
                  <Music2 size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">Mi ADN Musical</p>
                  <p className="text-zinc-500 text-xs">Tu sonido analizado por IA</p>
                </div>
              </div>
              {tieneAnalisis && stats && (
                <Link
                  to="/mi-adn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/12 text-xs font-semibold transition-colors"
                >
                  <BarChart2 size={12} />
                  Ver completo
                </Link>
              )}
            </div>

            {tieneAnalisis ? (
              <>
                {/* Reproductor del demo — custom dark */}
                {audioUrl && (
                  <div className="bg-zinc-900/80 rounded-xl p-3 border border-white/8 mb-4">
                    <p className="text-zinc-200 text-[11px] font-bold uppercase tracking-wider mb-2">
                      Tu demo activo
                    </p>
                    <AudioPlayer key={audioUrl} src={audioUrl} />
                  </div>
                )}

                {/* Parámetros pills inline */}
                {stats && (
                  <div className="grid grid-cols-3 gap-2">
                    <StatPill label="BPM"     value={stats.bpm}     />
                    <StatPill label="Brillo"  value={stats.brillo}  unit="%" />
                    <StatPill label="Energía" value={stats.energia} unit="%" />
                  </div>
                )}

                {/* Texture badge prominente */}
                {stats && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    {TextureIcon && <TextureIcon size={13} className="text-purple-400" />}
                    <span className="text-zinc-300 text-xs font-semibold">
                      Textura: <span className="text-white">{stats.texture.label}</span>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-zinc-900/60 rounded-xl p-6 border border-dashed border-white/10 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/15 flex items-center justify-center">
                  <Upload size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-zinc-200 text-sm font-semibold">Aún no analizas tu sonido</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Sube un demo para ver tu ADN musical único.</p>
                </div>
                <Link
                  to="/mi-adn"
                  className="mt-1 px-5 py-2 bg-purple-600 text-white rounded-full text-xs font-bold hover:bg-purple-500 transition-colors"
                >
                  Subir mi primer demo
                </Link>
              </div>
            )}

            {tieneAnalisis && stats && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-4 flex items-center gap-1.5 text-purple-400 text-xs font-semibold hover:text-purple-300 transition-colors"
              >
                {expanded ? 'Ocultar' : 'Ver'} descriptores avanzados
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown size={13} />
                </motion.span>
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {expanded && stats && (
              <motion.div
                key="detalle"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-5 pb-5 border-t border-white/8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Col izquierda */}
                  <div>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">Descriptores Sonoros</p>
                    <div className="flex flex-col gap-3">
                      <DescBar label="Densidad Rítmica"  value={stats.densidadRitmica}  color="#f97316" />
                      <DescBar label="Brillo Espectral"  value={stats.brilloEspectral}  color="#06b6d4" />
                      <DescBar label="Riqueza Armónica"  value={stats.riquezaArmonica}  color="#7c3aed" />
                    </div>
                  </div>

                  {/* Col derecha */}
                  <div className="flex flex-col gap-5">
                    <div>
                      <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">Ritmo vs. Melodía</p>
                      <div className="flex flex-col gap-2.5">
                        <HpsBar label="Melódico"  pct={stats.harmonyPct}    color="#7c3aed" />
                        <HpsBar label="Percusivo" pct={stats.percussivePct} color="#f97316" />
                      </div>
                    </div>

                    <div>
                      <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">Distribución de notas</p>
                      <ChromaChart chroma={stats.chroma} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Datos del perfil */}
        {!editing ? (
          <div className="bg-zinc-800 rounded-2xl p-5 flex flex-col gap-4 border border-white/8 lg:col-span-2">
            <InfoRow label="Correo electrónico"  value={user.email} />
            <InfoRow
              label="Fecha de nacimiento"
              value={user.fecha_nacimiento
                ? new Date(user.fecha_nacimiento).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'No especificada'}
            />
            <InfoRow label="Instrumento" value={user.instrumento || 'No especificado'} />
            <InfoRow label="Ciudad"      value={user.ciudad      || 'No especificada'} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-2xl p-5 flex flex-col gap-5 border border-white/8 lg:col-span-2">
            <div className="flex flex-col gap-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide">Datos básicos</p>
              <EditField label="Nombre"              name="nombre"           defaultValue={user.nombre} />
              <EditField label="Fecha de nacimiento" name="fecha_nacimiento" defaultValue={user.fecha_nacimiento?.slice(0, 10) ?? ''} type="date" />
              <EditField label="Instrumento"         name="instrumento"      defaultValue={user.instrumento} />
              <EditField label="Ciudad"              name="ciudad"           defaultValue={user.ciudad} />
            </div>

            <div className="flex flex-col gap-4 border-t border-white/8 pt-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide">Identidad Artística</p>

              <div>
                <label className="block text-zinc-500 text-xs mb-1.5 uppercase tracking-wide font-medium">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Cuéntanos sobre tu música y lo que buscas..."
                  className="w-full bg-white/5 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600 resize-none border border-white/10"
                />
              </div>

              <div>
                <label className="block text-zinc-500 text-xs mb-1.5 uppercase tracking-wide font-medium">Años de experiencia</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={experiencia}
                  onChange={(e) => setExperiencia(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/5 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600 border border-white/10"
                />
              </div>

              <div>
                <label className="block text-zinc-500 text-xs mb-2 uppercase tracking-wide font-medium">Rol / Oficio</label>
                <div className="flex flex-wrap gap-1.5">
                  {OFICIOS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggleOficio(o)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        selectedOficio.includes(o)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/25'
                      }`}
                    >
                      {selectedOficio.includes(o) ? '✓ ' : ''}{o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 text-xs mb-2 uppercase tracking-wide font-medium">Estilos musicales</label>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        selectedTags.includes(t)
                          ? 'bg-white text-zinc-900 border-white'
                          : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/25'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/8 pt-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide">Redes sociales</p>
              <SocialField label="Instagram" placeholder="https://instagram.com/tuusuario"
                value={instagram} onChange={setInstagram} accent="#e1306c" />
              <SocialField label="Spotify"   placeholder="https://open.spotify.com/artist/..."
                value={spotify}   onChange={setSpotify}   accent="#1db954" />
              <SocialField label="Discord"   placeholder="https://discord.gg/tu-server o usuario#0000"
                value={discord}   onChange={setDiscord}   accent="#5865f2" />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEditing(false); setError('') }}
                className="flex-1 bg-white/8 text-zinc-300 font-semibold py-3 rounded-full text-sm hover:bg-white/12 transition-colors border border-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 bg-purple-600 text-white font-semibold py-3 rounded-full text-sm hover:bg-purple-500 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs mb-1 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-zinc-200 text-sm">{value}</p>
    </div>
  )
}

function EditField({ label, name, defaultValue, type = 'text' }) {
  return (
    <div>
      <label className="block text-zinc-500 text-xs mb-1.5 uppercase tracking-wide font-medium">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue || ''}
        className="w-full bg-white/5 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600 border border-white/10"
      />
    </div>
  )
}

function SocialField({ label, placeholder, value, onChange, accent }) {
  return (
    <div>
      <label className="block text-xs mb-1.5 font-medium" style={{ color: accent }}>
        {label}
      </label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600 border border-white/10"
      />
    </div>
  )
}

/* ─── Brand SVG icons ─── */
function IgIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}
function SpotifyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}
function DiscordIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.1 18.102.12 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}
