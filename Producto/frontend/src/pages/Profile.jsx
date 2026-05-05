import { useMemo, useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Music2, Upload, Zap, Wind, Activity, Sparkles,
  Camera, Loader2, MapPin, Edit3, BarChart2, Check, Pencil,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL, getInitials } from '../utils/helpers'
import {
  parseVector, parseMetadata, deriveStats,
  deriveMood, detectKey, suggestGenres,
} from '../utils/audioHelpers'
import { useImageUrl } from '../hooks/useImageUrl'
import AudioPlayer from '../components/AudioPlayer'

const TEXTURE_ICONS = { Zap, Wind, Activity, Sparkles }

/* ─── main component ─── */

export default function Profile() {
  const { user, token, updateUser } = useAuth()
  const navigate                    = useNavigate()
  const [editingBio, setEditingBio] = useState(false)
  const [bioValue, setBioValue]     = useState(user?.bio ?? '')
  const [bioSaving, setBioSaving]   = useState(false)
  const [activeCoverKey, setActiveCoverKey] = useState(null)
  const [photoUploading, setPhotoUploading]   = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const photoInputRef  = useRef(null)
  const bannerInputRef = useRef(null)

  const { url: photoUrl }      = useImageUrl(user?.foto_url   ?? null)
  const { url: bannerUrl }     = useImageUrl(user?.banner_url ?? null)
  const { url: activeCoverUrl} = useImageUrl(activeCoverKey)

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

  /* Obtiene la cover_key del demo activo buscando por s3_key */
  useEffect(() => {
    if (!user?.s3_key || !token) { setActiveCoverKey(null); return }
    let cancelled = false
    fetch(`${API_URL}/demos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((demos) => {
        if (cancelled) return
        const active = demos.find((d) => d.s3_key === user.s3_key)
        setActiveCoverKey(active?.cover_url ?? null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.s3_key, token])

  const saveBio = async () => {
    setBioSaving(true)
    try {
      const res = await fetch(`${API_URL}/usuarios/perfil`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ bio: bioValue.trim() }),
      })
      if (res.ok) { updateUser({ bio: bioValue.trim() }); setEditingBio(false) }
    } finally { setBioSaving(false) }
  }

  const handlePhotoUpload = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return
    setPhotoUploading(true)
    try {
      const urlRes = await fetch(`${API_URL}/images/upload-url?type=avatar&ext=${ext === 'jpeg' ? 'jpg' : ext}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { uploadUrl, key } = await urlRes.json()
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file })
      const r = await fetch(`${API_URL}/usuarios/perfil`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ foto_url: key }),
      })
      if (r.ok) updateUser({ foto_url: key })
    } finally { setPhotoUploading(false) }
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
      const r = await fetch(`${API_URL}/usuarios/perfil`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ banner_url: key }),
      })
      if (r.ok) updateUser({ banner_url: key })
    } finally { setBannerUploading(false) }
  }

  const v           = useMemo(() => parseVector(user?.audio_vector),     [user?.audio_vector])
  const meta        = useMemo(() => parseMetadata(user?.audio_metadata), [user?.audio_metadata])
  const stats       = useMemo(() => v ? deriveStats(v, meta) : null,     [v, meta])
  const mood        = useMemo(() => stats ? deriveMood(stats) : null,    [stats])
  const detectedKey = useMemo(() => stats ? detectKey(stats.chroma) : null, [stats])
  const gens        = useMemo(() => stats ? suggestGenres(stats) : [],   [stats])
  const TextureIcon = stats ? (TEXTURE_ICONS[stats.texture.icon] ?? Activity) : null

  if (!user) return null
  const tieneAnalisis = Boolean(user?.s3_key)
  const oficioUser    = Array.isArray(user?.oficio)    ? user.oficio    : []
  const tagsUser      = Array.isArray(user?.user_tags) ? user.user_tags : []
  const allTags       = [...tagsUser, ...gens.filter((g) => !tagsUser.includes(g))]

  return (
    <div className="-mx-6 -mt-8 min-h-screen pb-16">

      {/* Hidden inputs */}
      <input ref={photoInputRef}  type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => handlePhotoUpload(e.target.files[0])} />
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => handleBannerUpload(e.target.files[0])} />

      {/* ── Banner full-width ── */}
      <div className="relative w-full h-52 group/banner">
        {/* Fondo del banner */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-zinc-900 overflow-hidden">
          {bannerUrl && (
            <img src={bannerUrl} alt="banner" className="w-full h-full object-cover opacity-70" />
          )}
        </div>
        {/* Fade hacia abajo */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
        {/* Botón cambiar banner */}
        <button
          onClick={() => bannerInputRef.current?.click()}
          disabled={bannerUploading}
          className="absolute top-3 right-3 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-xs font-semibold border border-white/20 hover:bg-black/70"
        >
          {bannerUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          Cambiar banner
        </button>
      </div>

      {/* ── Franja de identidad (rompe la línea del banner) ── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-end justify-between gap-4 -mt-14 pb-5">
          <div className="flex items-end gap-4 min-w-0 flex-1">
            {/* Avatar */}
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="group/avatar relative w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-900 shadow-2xl focus:outline-none flex-shrink-0 z-10"
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

            {/* Nombre + oficio + ciudad */}
            <div className="pb-1 min-w-0 flex-1 pt-16">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-white text-2xl font-black tracking-tight leading-none">
                  {user.nombre}
                </h1>
                {user.es_premium && (
                  <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ✦ Premium
                  </span>
                )}
              </div>
              {oficioUser.length > 0 && (
                <p className="text-zinc-400 text-sm mt-0.5">
                  {oficioUser.join(' · ')}
                </p>
              )}
              {user.ciudad && (
                <p className="flex items-center gap-1 mt-0.5 text-zinc-500 text-xs">
                  <MapPin size={10} /> {user.ciudad}
                </p>
              )}
            </div>
          </div>

          {/* Botón editar */}
          <button
            onClick={() => navigate('/settings')}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-sm font-semibold transition-colors"
          >
            <Edit3 size={13} />
            Editar perfil
          </button>
        </div>
      </div>

      {/* ── Contenido en dos columnas ── */}
      <div className="max-w-5xl mx-auto px-6 mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Columna izquierda ── */}
        <div className="flex flex-col gap-4">

          {/* Sobre mí */}
          <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Sobre mí</p>
              {!editingBio && (
                <button
                  onClick={() => { setBioValue(user?.bio ?? ''); setEditingBio(true) }}
                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
                >
                  <Pencil size={11} />
                  {user?.bio ? 'Editar' : 'Agregar'}
                </button>
              )}
            </div>
            {editingBio ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value)}
                  rows={3}
                  placeholder="Cuéntanos sobre tu música y lo que buscas..."
                  autoFocus
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveBio}
                    disabled={bioSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {bioSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingBio(false)}
                    className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : user?.bio ? (
              <p className="text-zinc-300 text-sm leading-relaxed">{user.bio}</p>
            ) : (
              <p className="text-zinc-600 text-sm italic">Sin biografía aún.</p>
            )}
          </div>

          {/* Vibra Musical — tags + géneros IA fusionados */}
          {allTags.length > 0 && (
            <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Vibra Musical</p>
              <div className="flex flex-wrap gap-1.5">
                {tagsUser.map((t) => (
                  <span key={t} className="bg-purple-500/15 text-purple-200 text-xs px-2.5 py-1 rounded-full border border-purple-500/30 font-semibold">
                    #{t}
                  </span>
                ))}
                {gens.filter((g) => !tagsUser.includes(g)).map((g) => (
                  <span key={g} className="bg-white/5 text-zinc-400 text-xs px-2.5 py-1 rounded-full border border-white/10 font-medium">
                    #{g}
                  </span>
                ))}
              </div>
              {gens.length > 0 && (
                <p className="text-zinc-600 text-[10px] mt-2">
                  Los tags en gris son sugeridos por la IA de Bandify.
                </p>
              )}
            </div>
          )}

          {/* Redes sociales */}
          <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Redes sociales</p>
            {(user?.instagram_url || user?.spotify_url || user?.discord_url) ? (
              <div className="flex flex-wrap gap-2">
                {user.instagram_url && (
                  <a href={user.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold transition-opacity hover:opacity-75"
                    style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                    <IgIcon /> Instagram
                  </a>
                )}
                {user.spotify_url && (
                  <a href={user.spotify_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-[#1db954] hover:opacity-75 transition-opacity">
                    <SpotifyIcon /> Spotify
                  </a>
                )}
                {user.discord_url && (
                  <a href={user.discord_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-[#5865f2] hover:opacity-75 transition-opacity">
                    <DiscordIcon /> Discord
                  </a>
                )}
              </div>
            ) : (
              <p className="text-zinc-600 text-sm italic">
                Aún no hay redes vinculadas.{' '}
                <button
                  onClick={() => navigate('/settings')}
                  className="text-purple-400 hover:text-purple-300 transition-colors not-italic"
                >
                  Agrégalas en Ajustes →
                </button>
              </p>
            )}
          </div>
        </div>

        {/* ── Columna derecha: Mis Demos ── */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-800/50 rounded-2xl border border-white/8 overflow-hidden shadow-lg shadow-purple-900/5 self-start">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shadow-md shadow-purple-900/30 flex-shrink-0">
                  <Music2 size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Mis Demos</p>
                  <p className="text-zinc-500 text-xs">Tu sonido analizado por IA</p>
                </div>
              </div>
              {tieneAnalisis && stats && (
                <Link
                  to="/mi-adn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/12 text-xs font-semibold transition-colors flex-shrink-0"
                >
                  <BarChart2 size={12} />
                  Ver completo
                </Link>
              )}
            </div>

            {tieneAnalisis ? (
              <>
                {/* Reproductor — elemento central */}
                {audioUrl ? (
                  <div
                    className="relative rounded-xl overflow-hidden mb-4 border border-white/8"
                    style={activeCoverUrl ? {
                      backgroundImage: `url(${activeCoverUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : {}}
                  >
                    {activeCoverUrl && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40" />
                    )}
                    <div className={`relative z-10 p-4 ${!activeCoverUrl ? 'bg-zinc-900/80' : ''}`}>
                      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2">Demo activo</p>
                      <AudioPlayer key={audioUrl} src={audioUrl} />
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/8 mb-4 text-center">
                    <p className="text-zinc-600 text-xs">Cargando demo...</p>
                  </div>
                )}

                {/* Línea de resumen técnico sutil */}
                {stats && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400 text-sm mb-4">
                    {mood && (
                      <span className="flex items-center gap-1">
                        <span style={{ color: mood.color }}>●</span>
                        {mood.label}
                      </span>
                    )}
                    {detectedKey && <span>♪ {detectedKey}</span>}
                    <span>⏱ {stats.bpm} BPM</span>
                    <span>⚡ {stats.energia}% Energía</span>
                    {TextureIcon && (
                      <span className="flex items-center gap-1">
                        <TextureIcon size={13} className="text-zinc-500" />
                        {stats.texture.label}
                      </span>
                    )}
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
          </div>
        </div>

      </div>
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
