import { useMemo, useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Upload, Zap, Wind, Activity, Sparkles,
  Camera, Loader2, MapPin, Edit3, BarChart2, Check, Pencil,
  Share2, MessageCircle, Headphones, Music2, UserX,
  CalendarDays, Ticket, Music,
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

const TABS = [
  { id: 'demos',   label: 'Demos'     },
  { id: 'bio',     label: 'Biografía' },
  { id: 'tocatas', label: 'Tocatas'   },
]

function SectionHeader({ children }) {
  return (
    <div className="mb-4">
      <p className="text-zinc-300 text-[11px] font-bold uppercase tracking-[0.25em]">
        {children}
      </p>
      <div className="h-px bg-zinc-800 mt-2" />
    </div>
  )
}

export default function Profile() {
  const { user, token, updateUser } = useAuth()
  const navigate                    = useNavigate()
  const { username }                = useParams()
  const isOwnProfile                = !username

  // ── Estado: perfil público ──────────────────────────────────────────────
  const [publicProfile,   setPublicProfile]   = useState(null)
  const [profileLoading,  setProfileLoading]  = useState(false)
  const [profileNotFound, setProfileNotFound] = useState(false)

  // ── Estado: UI ──────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState('demos')
  const [editingBio,      setEditingBio]      = useState(false)
  const [bioValue,        setBioValue]        = useState(user?.bio ?? '')
  const [bioSaving,       setBioSaving]       = useState(false)
  const [activeCoverKey,  setActiveCoverKey]  = useState(null)
  const [photoUploading,  setPhotoUploading]  = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [demos,           setDemos]           = useState([])
  const [copied,          setCopied]          = useState(false)
  const [userTocatas,     setUserTocatas]     = useState([])
  const [tocatasLoading,  setTocatasLoading]  = useState(false)

  const photoInputRef  = useRef(null)
  const bannerInputRef = useRef(null)

  // ── Fuente de datos unificada ───────────────────────────────────────────
  // En vista pública usa publicProfile; en vista propia usa user del contexto.
  const perfilData = isOwnProfile ? user : publicProfile

  // Hooks de imagen: dependen de perfilData (se actualizan cuando cambia)
  const { url: photoUrl }     = useImageUrl(perfilData?.foto_url   ?? null)
  const { url: bannerUrl }    = useImageUrl(perfilData?.banner_url ?? null)
  const { url: activeCoverUrl } = useImageUrl(activeCoverKey)

  // ── Effect: refrescar perfil propio al montar ───────────────────────────
  useEffect(() => {
    if (!isOwnProfile || !token) return
    let cancelled = false
    fetch(`${API_URL}/usuarios/perfil`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data?.id) updateUser(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token, isOwnProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect: cargar perfil público por username ──────────────────────────
  useEffect(() => {
    if (isOwnProfile) return
    setProfileLoading(true)
    setProfileNotFound(false)
    setPublicProfile(null)
    fetch(`${API_URL}/usuarios/publico/${encodeURIComponent(username)}`)
      .then((r) => {
        if (r.status === 404) { setProfileNotFound(true); return null }
        return r.ok ? r.json() : null
      })
      .then((data) => { if (data) setPublicProfile(data) })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [username, isOwnProfile])

  // ── Effect: URL de audio (presigned) ───────────────────────────────────
  const [audioUrl, setAudioUrl] = useState(null)
  useEffect(() => {
    if (!perfilData?.s3_key || !token) { setAudioUrl(null); return }
    let cancelled = false
    fetch(`${API_URL}/audio/listen-url?key=${encodeURIComponent(perfilData.s3_key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data?.url) setAudioUrl(data.url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [perfilData?.s3_key, token])

  // ── Effect: lista de demos (solo perfil propio) ─────────────────────────
  useEffect(() => {
    if (!isOwnProfile || !user?.s3_key || !token) {
      setActiveCoverKey(null)
      setDemos([])
      return
    }
    let cancelled = false
    fetch(`${API_URL}/demos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((demoList) => {
        if (cancelled) return
        const list = Array.isArray(demoList) ? demoList : []
        setDemos(list)
        const active = list.find((d) => d.s3_key === user.s3_key)
        setActiveCoverKey(active?.cover_url ?? null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.s3_key, token, isOwnProfile])

  // ── Handlers: solo activos en perfil propio ─────────────────────────────
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

  const handleShare = () => {
    const shareUrl = isOwnProfile
      ? `${window.location.origin}/u/${perfilData?.nombre}`
      : window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  // ── Effect: tocatas del usuario ────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'tocatas' || !perfilData?.id) return
    let cancelled = false
    setTocatasLoading(true)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(`${API_URL}/tocatas?organizador_id=${perfilData.id}`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) setUserTocatas(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setUserTocatas([]) })
      .finally(() => { if (!cancelled) setTocatasLoading(false) })
    return () => { cancelled = true }
  }, [activeTab, perfilData?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio + estadísticas ────────────────────────────────────────────────
  const v           = useMemo(() => parseVector(perfilData?.audio_vector),     [perfilData?.audio_vector])
  const meta        = useMemo(() => parseMetadata(perfilData?.audio_metadata), [perfilData?.audio_metadata])
  const stats       = useMemo(() => v ? deriveStats(v, meta) : null,           [v, meta])
  const mood        = useMemo(() => stats ? deriveMood(stats) : null,          [stats])
  const detectedKey = useMemo(() => stats ? detectKey(stats.chroma) : null,    [stats])
  const gens        = useMemo(() => stats ? suggestGenres(stats) : [],         [stats])
  const TextureIcon = stats ? (TEXTURE_ICONS[stats.texture.icon] ?? Activity) : null

  // ── Early returns ───────────────────────────────────────────────────────
  if (isOwnProfile && !user) return null

  if (!isOwnProfile && profileLoading) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-purple-400 animate-spin" />
      </div>
    )
  }

  if (!isOwnProfile && profileNotFound) {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <UserX size={28} className="text-zinc-600" />
        </div>
        <h1 className="text-white text-xl font-bold">Usuario no encontrado</h1>
        <p className="text-zinc-500 text-sm text-center max-w-xs">
          No existe ningún músico con el nombre <span className="text-purple-400">@{username}</span> en Bandify.
        </p>
        <button onClick={() => navigate(-1)}
          className="mt-2 px-5 py-2 border border-zinc-700 hover:border-purple-500 text-zinc-400 hover:text-purple-400 text-xs font-semibold uppercase tracking-widest rounded-xl transition-colors">
          Volver
        </button>
      </div>
    )
  }

  if (!isOwnProfile && !publicProfile) return null

  // ── Valores derivados de display ────────────────────────────────────────
  const displayName   = perfilData?.nombre || (isOwnProfile ? user?.email?.split('@')[0] || '' : '')
  const tieneAnalisis = Boolean(perfilData?.s3_key)
  const oficioUser    = Array.isArray(perfilData?.oficio)    ? perfilData.oficio    : []
  const tagsUser      = Array.isArray(perfilData?.user_tags) ? perfilData.user_tags : []

  return (
    <div className="min-h-screen w-full bg-black pb-20">

      {/* ── Hidden file inputs (solo perfil propio) ── */}
      {isOwnProfile && (
        <>
          <input ref={photoInputRef}  type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => handlePhotoUpload(e.target.files[0])} />
          <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => handleBannerUpload(e.target.files[0])} />
        </>
      )}

      {/* ════════════════════════════════════════════════
          BANNER
          ════════════════════════════════════════════════ */}
      <div className="relative w-full h-48 md:h-60 group/banner overflow-hidden bg-zinc-950">
        {bannerUrl && (
          <img src={bannerUrl} alt="banner"
            className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-800" />

        {isOwnProfile && (
          <button
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className="absolute top-4 right-4 z-20 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-black/80 border border-zinc-700 text-zinc-300 text-[10px] uppercase tracking-widest hover:border-purple-500 hover:text-purple-400 rounded-lg"
          >
            {bannerUploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
            Cambiar banner
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          HERO — Avatar + identidad
          ════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 md:-mt-14 pb-6 border-b border-zinc-800/60">

          {/* Avatar */}
          {isOwnProfile ? (
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="group/avatar relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-zinc-950 bg-zinc-900 focus:outline-none flex-shrink-0 hover:border-purple-600 transition-colors z-10"
            >
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-700 to-zinc-900 flex items-center justify-center text-white font-black text-3xl">
                  {getInitials(displayName)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                {photoUploading
                  ? <Loader2 size={20} className="text-purple-400 animate-spin" />
                  : <Camera size={20} className="text-purple-400" />}
              </div>
            </button>
          ) : (
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-zinc-950 bg-zinc-900 flex-shrink-0 z-10">
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-700 to-zinc-900 flex items-center justify-center text-white font-black text-3xl">
                  {getInitials(displayName)}
                </div>
              )}
            </div>
          )}

          {/* Nombre · hashtags · redes */}
          <div className="flex-1 min-w-0 mt-1 sm:mt-0 sm:pb-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight leading-none">
                {displayName || (isOwnProfile
                  ? <span className="text-zinc-600 font-normal text-base italic">Sin nombre configurado</span>
                  : null
                )}
              </h1>
              {displayName && perfilData?.es_premium && (
                <span className="border border-purple-500 text-purple-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded">
                  PRO
                </span>
              )}
            </div>
            {/* Hashtags */}
            {(oficioUser.length > 0 || tagsUser.length > 0 || perfilData?.ciudad) && (
              <div className="flex flex-wrap gap-3 mb-3">
                {oficioUser.map((o) => (
                  <span key={o} className="text-purple-400 font-medium text-sm hover:text-purple-300 transition-colors cursor-default">
                    #{o}
                  </span>
                ))}
                {tagsUser.map((t) => (
                  <span key={t} className="text-zinc-400 font-medium text-sm hover:text-zinc-200 transition-colors cursor-default">
                    #{t}
                  </span>
                ))}
                {perfilData?.ciudad && (
                  <span className="text-zinc-500 text-sm flex items-center gap-1">
                    <MapPin size={11} />
                    {perfilData.ciudad}
                  </span>
                )}
              </div>
            )}

            {/* Redes sociales */}
            {(perfilData?.instagram_url || perfilData?.spotify_url || perfilData?.discord_url) && (
              <div className="flex items-center gap-3">
                {perfilData.instagram_url && (
                  <a href={perfilData.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-pink-400 transition-colors">
                    <IgIcon />
                  </a>
                )}
                {perfilData.spotify_url && (
                  <a href={perfilData.spotify_url} target="_blank" rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-green-400 transition-colors">
                    <SpotifyIcon />
                  </a>
                )}
                {perfilData.discord_url && (
                  <a href={perfilData.discord_url} target="_blank" rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-indigo-400 transition-colors">
                    <DiscordIcon />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* CTA: editar (propio) vs enviar mensaje (público) */}
          {isOwnProfile ? (
            <button
              onClick={() => navigate('/settings')}
              className="self-start sm:self-auto flex-shrink-0 flex items-center gap-2 border border-purple-500/60 text-purple-400 hover:bg-purple-500/10 px-4 py-2 text-[11px] uppercase tracking-widest font-bold transition-colors rounded-xl"
            >
              <Edit3 size={12} />
              Editar perfil
            </button>
          ) : token ? (
            <Link
              to="/messages"
              className="self-start sm:self-auto flex-shrink-0 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-[11px] uppercase tracking-widest font-bold transition-colors rounded-xl"
            >
              <MessageCircle size={12} />
              Enviar mensaje
            </Link>
          ) : (
            <Link
              to="/auth"
              className="self-start sm:self-auto flex-shrink-0 flex items-center gap-2 border border-purple-500/60 text-purple-400 hover:bg-purple-500/10 px-4 py-2 text-[11px] uppercase tracking-widest font-bold transition-colors rounded-xl"
            >
              Inicia sesión para contactar
            </Link>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          TABS
          ════════════════════════════════════════════════ */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-sm border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-purple-400 border-purple-500'
                    : 'text-zinc-500 border-transparent hover:text-zinc-200 hover:border-zinc-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          CONTENT GRID — 2/3 principal + 1/3 sidebar
          ════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ── Columna principal ── */}
          <div className="md:col-span-2 flex flex-col gap-6">

            {/* TAB: Demos */}
            {activeTab === 'demos' && (
              <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-6">
                <SectionHeader>Demos Publicados</SectionHeader>

                {tieneAnalisis ? (
                  <>
                    {/* Tracklist: lista completa en perfil propio, entrada única en público */}
                    {isOwnProfile && demos.length > 0 ? (
                      <ul className="border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden mb-4">
                        {demos.map((d, i) => {
                          const isActive = d.s3_key === user.s3_key
                          return (
                            <li
                              key={d.id || d.s3_key || i}
                              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                                isActive ? 'bg-purple-500/8 border-l-2 border-l-purple-500' : 'hover:bg-white/3'
                              }`}
                            >
                              <span className="text-zinc-600 text-[11px] font-mono flex-shrink-0 w-5">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className={`truncate flex-1 text-[13px] ${isActive ? 'text-purple-300 font-semibold' : 'text-zinc-300'}`}>
                                {d.nombre || 'Demo sin nombre'}
                              </span>
                              {isActive && stats?.bpm && (
                                <span className="text-zinc-600 text-[10px] font-mono flex-shrink-0">{stats.bpm} BPM</span>
                              )}
                              {isActive && (
                                <span className="text-purple-400 text-[10px] font-bold uppercase tracking-widest flex-shrink-0">
                                  Activo
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    ) : !isOwnProfile ? (
                      <div className="border border-zinc-800 rounded-xl overflow-hidden mb-4">
                        <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/8 border-l-2 border-l-purple-500">
                          <span className="text-zinc-600 text-[11px] font-mono flex-shrink-0 w-5">01</span>
                          <span className="truncate flex-1 text-[13px] text-purple-300 font-semibold">
                            Demo principal
                          </span>
                          {stats?.bpm && (
                            <span className="text-zinc-600 text-[10px] font-mono flex-shrink-0">{stats.bpm} BPM</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-600 text-sm italic mb-4">Cargando demos...</p>
                    )}

                    {/* Reproductor */}
                    {audioUrl ? (
                      <div className="border border-zinc-800 rounded-xl bg-zinc-950 overflow-hidden">
                        <div className="relative"
                          style={activeCoverUrl ? {
                            backgroundImage: `url(${activeCoverUrl})`,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                          } : {}}>
                          {activeCoverUrl && (
                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/60" />
                          )}
                          <div className="relative z-10 p-4">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                              <Headphones size={10} />
                              Reproduciendo
                            </p>
                            <AudioPlayer key={audioUrl} src={audioUrl} />
                          </div>
                        </div>
                      </div>
                    ) : !isOwnProfile && !token ? (
                      <div className="border border-zinc-800 rounded-xl p-5 text-center">
                        <p className="text-zinc-500 text-sm mb-3">Inicia sesión para escuchar este demo.</p>
                        <Link to="/auth"
                          className="inline-flex px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                          Iniciar sesión
                        </Link>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center gap-4 py-6">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Upload size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold mb-1">Sin demos publicados</p>
                      <p className="text-zinc-500 text-xs">
                        {isOwnProfile ? 'Sube tu primer demo para activar el ADN.' : 'Este músico aún no ha publicado demos.'}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <Link to="/mi-adn"
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                        Subir demo
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Biografía */}
            {activeTab === 'bio' && (
              <div className="flex flex-col gap-5">
                <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <SectionHeader>Biografía</SectionHeader>
                    {isOwnProfile && !editingBio && (
                      <button
                        onClick={() => { setBioValue(user?.bio ?? ''); setEditingBio(true) }}
                        className="flex items-center gap-1 text-zinc-600 hover:text-purple-400 transition-colors text-[10px] uppercase tracking-widest -mt-4"
                      >
                        <Pencil size={10} />
                        {user?.bio ? 'Editar' : 'Agregar'}
                      </button>
                    )}
                  </div>

                  {isOwnProfile && editingBio ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={bioValue}
                        onChange={(e) => setBioValue(e.target.value)}
                        rows={5}
                        placeholder="Cuéntanos sobre tu música y lo que buscas..."
                        autoFocus
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-purple-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveBio} disabled={bioSaving}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest transition-colors rounded-lg">
                          {bioSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Guardar
                        </button>
                        <button onClick={() => setEditingBio(false)}
                          className="px-4 py-1.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-[11px] font-bold uppercase tracking-widest transition-colors rounded-lg">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : perfilData?.bio ? (
                    <p className="text-zinc-300 text-sm leading-relaxed">{perfilData.bio}</p>
                  ) : (
                    <p className="text-zinc-600 text-sm italic">
                      {isOwnProfile ? 'Sin biografía. Haz clic en Agregar para escribir la tuya.' : 'Este músico aún no ha escrito su biografía.'}
                    </p>
                  )}
                </div>

                {/* Vibra Musical */}
                <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-6">
                  <SectionHeader>Vibra Musical</SectionHeader>
                  {(tagsUser.length > 0 || gens.length > 0) ? (
                    <>
                      <div className="flex flex-wrap gap-3">
                        {tagsUser.map((t) => (
                          <span key={t} className="text-purple-400 font-medium text-sm hover:text-purple-300 transition-colors cursor-default">
                            #{t}
                          </span>
                        ))}
                        {gens.filter((g) => !tagsUser.includes(g)).map((g) => (
                          <span key={g} className="text-zinc-500 font-medium text-sm hover:text-zinc-400 transition-colors cursor-default">
                            #{g}
                          </span>
                        ))}
                      </div>
                      {isOwnProfile && gens.length > 0 && (
                        <p className="text-zinc-700 text-[10px] mt-3 uppercase tracking-widest">
                          Tags grises = sugerencias IA Bandify
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-zinc-600 text-sm italic">
                      {isOwnProfile ? 'Sin estilos definidos. Agrégalos en Configuración.' : 'Sin estilos definidos aún.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Tocatas */}
            {activeTab === 'tocatas' && (
              <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader>Tocatas organizadas</SectionHeader>
                  {isOwnProfile && (
                    <Link
                      to="/gestion"
                      className="flex items-center gap-1.5 text-zinc-500 hover:text-purple-400 text-[10px] font-bold uppercase tracking-widest transition-colors -mt-4"
                    >
                      Gestionar →
                    </Link>
                  )}
                </div>

                {/* Estado: cargando */}
                {tocatasLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={28} className="text-purple-400 animate-spin" />
                  </div>
                )}

                {/* Estado: con datos */}
                {!tocatasLoading && userTocatas.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userTocatas.map((tocata) => (
                      <TocataProfileCard key={tocata.id} tocata={tocata} />
                    ))}
                  </div>
                )}

                {/* Estado: vacío */}
                {!tocatasLoading && userTocatas.length === 0 && (
                  <div className="flex flex-col items-center text-center gap-4 py-8">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Music size={18} className="text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-zinc-300 font-bold text-sm mb-1">
                        {isOwnProfile ? 'Aún no has publicado tocatas' : 'Sin tocatas programadas'}
                      </p>
                      <p className="text-zinc-600 text-xs leading-relaxed max-w-xs">
                        {isOwnProfile
                          ? 'Publica tu primer evento y aparecerá aquí para que tu comunidad lo vea.'
                          : `Este músico aún no tiene tocatas programadas.`}
                      </p>
                    </div>
                    {isOwnProfile ? (
                      <Link to="/tocatas/publicar"
                        className="mt-1 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                        Publicar tocata
                      </Link>
                    ) : (
                      <Link to="/tocatas"
                        className="mt-1 px-5 py-2 border border-zinc-700 hover:border-purple-500 text-zinc-400 hover:text-purple-400 text-xs font-semibold uppercase tracking-widest rounded-xl transition-colors">
                        Explorar tocatas
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>{/* /main col */}

          {/* ── Sidebar ── */}
          <div className="md:col-span-1 flex flex-col gap-4">

            {/* Widget: ADN en cifras */}
            <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-5">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                {isOwnProfile ? 'Tu ADN en cifras' : 'ADN Musical'}
              </p>

              {stats ? (
                <div className="flex flex-col gap-3">
                  <StatRow label="BPM" value={stats.bpm} />
                  <StatRow label="Energía" value={`${stats.energia}%`} accent />
                  {detectedKey && <StatRow label="Tonalidad" value={detectedKey} />}
                  {mood && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs uppercase tracking-widest">Mood</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mood.color }} />
                        <span className="text-white text-xs font-semibold">{mood.label}</span>
                      </div>
                    </div>
                  )}

                  {isOwnProfile && (
                    <Link to="/mi-adn"
                      className="mt-1 w-full flex items-center justify-center gap-2 py-2 border border-purple-500/30 hover:border-purple-500 text-purple-400 hover:text-purple-300 text-xs font-semibold rounded-xl transition-colors">
                      <BarChart2 size={12} />
                      Ver análisis completo
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-zinc-600 text-xs">
                    {isOwnProfile ? 'Sube un demo para ver tus estadísticas de ADN.' : 'Sin datos de ADN disponibles.'}
                  </p>
                  {isOwnProfile && (
                    <Link to="/mi-adn" className="mt-3 inline-block text-purple-400 hover:text-purple-300 text-xs font-semibold transition-colors">
                      Ir a Mi ADN →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Widget: Acciones */}
            <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-5 flex flex-col gap-2.5">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Acciones</p>

              {isOwnProfile ? (
                <>
                  <Link to="/matching/buscar"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                    <MessageCircle size={13} />
                    Ver mis matches
                  </Link>

                  <button onClick={handleShare}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl transition-colors">
                    {copied ? <Check size={13} className="text-green-400" /> : <Share2 size={13} />}
                    {copied ? 'Enlace copiado' : 'Compartir mi perfil'}
                  </button>

                </>
              ) : (
                <>
                  {token ? (
                    <Link to="/messages"
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                      <MessageCircle size={13} />
                      Enviar mensaje
                    </Link>
                  ) : (
                    <Link to="/auth"
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                      <MessageCircle size={13} />
                      Conectar con este músico
                    </Link>
                  )}

                  <button onClick={handleShare}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl transition-colors">
                    {copied ? <Check size={13} className="text-green-400" /> : <Share2 size={13} />}
                    {copied ? 'Enlace copiado' : 'Compartir perfil'}
                  </button>
                </>
              )}
            </div>

            {/* Widget: sugerencia de redes cuando no están configuradas (solo propio) */}
            {isOwnProfile && !(perfilData?.instagram_url || perfilData?.spotify_url || perfilData?.discord_url) && (
              <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-5">
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-3">Redes sociales</p>
                <p className="text-zinc-600 text-xs leading-relaxed mb-3">
                  Conecta tus redes para que otros músicos te encuentren más fácilmente.
                </p>
                <button onClick={() => navigate('/settings')}
                  className="text-purple-400 hover:text-purple-300 text-xs font-semibold transition-colors uppercase tracking-widest">
                  Vincular redes →
                </button>
              </div>
            )}

          </div>{/* /sidebar */}

        </div>
      </div>

    </div>
  )
}

/* ─── TocataProfileCard ─── */

function TocataProfileCard({ tocata }) {
  const { url: afficheUrl } = useImageUrl(tocata.afiche_url ?? null)

  const fechaFormateada = tocata.fecha
    ? new Date(tocata.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null
  const acceso = tocata.precio
    ? `$${Number(tocata.precio).toLocaleString('es-CL')} CLP`
    : 'Entrada liberada'

  return (
    <div className="border border-zinc-800 hover:border-purple-500/40 bg-white/3 hover:bg-white/5 rounded-xl overflow-hidden transition-colors group">
      {/* Cover / afiche */}
      <div className="h-36 w-full relative overflow-hidden bg-gradient-to-br from-purple-900/40 to-zinc-900 flex-shrink-0">
        {afficheUrl ? (
          <img
            src={afficheUrl}
            alt={tocata.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={32} className="text-purple-500/40" />
          </div>
        )}
        {/* Degradado inferior para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {/* Badge de género sobre la imagen */}
        {tocata.genero && (
          <span className="absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-sm text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-zinc-700/60">
            {tocata.genero}
          </span>
        )}
        {/* Fecha flotante en la esquina inferior */}
        {fechaFormateada && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-[11px] font-semibold drop-shadow">
            <CalendarDays size={11} className="text-purple-300 flex-shrink-0" />
            {fechaFormateada}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate mb-1.5">
            {tocata.nombre}
          </p>
          {tocata.ciudad && (
            <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
              <MapPin size={11} className="text-purple-400 flex-shrink-0" />
              {tocata.ciudad}
            </span>
          )}
        </div>
        <span className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
          tocata.precio
            ? 'border-purple-500/40 text-purple-300 bg-purple-500/10'
            : 'border-zinc-700 text-zinc-400'
        }`}>
          <Ticket size={10} />
          {acceso}
        </span>
      </div>
    </div>
  )
}

/* ─── Helpers de UI ─── */

function StatCard({ label, value, accent = false }) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-3 flex flex-col gap-1">
      <span className="text-zinc-500 text-[10px] uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-bold mt-auto ${accent ? 'text-purple-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

function StatRow({ label, value, accent = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-xs uppercase tracking-widest">{label}</span>
      <span className={`text-xs font-bold ${accent ? 'text-purple-400' : 'text-white'}`}>{value}</span>
    </div>
  )
}

/* ─── Iconos SVG de redes ─── */

function IgIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}

function SpotifyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.1 18.102.12 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}
