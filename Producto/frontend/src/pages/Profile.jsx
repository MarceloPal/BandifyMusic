import { useMemo, useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Music2, Upload, Zap, Wind, Activity, Sparkles,
  Camera, Loader2, MapPin, Edit3, BarChart2, Check, Pencil,
  Folder, Plus, X, ImagePlus,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL, getInitials } from '../utils/helpers'
import {
  parseVector, parseMetadata, deriveStats,
  deriveMood, detectKey, suggestGenres,
} from '../utils/audioHelpers'
import { useImageUrl } from '../hooks/useImageUrl'
import AudioPlayer from '../components/AudioPlayer'
import GlassIcons from '../components/GlassIcons'

const TEXTURE_ICONS = { Zap, Wind, Activity, Sparkles }

/* ─── SectionHeader técnico ─── */
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

/* ─── main component ─── */

export default function Profile() {
  const { user, token, updateUser } = useAuth()
  const navigate                    = useNavigate()
  const [editingBio, setEditingBio] = useState(false)
  const [bioValue, setBioValue]     = useState(user?.bio ?? '')
  const [bioSaving, setBioSaving]   = useState(false)
  const [activeCoverKey, setActiveCoverKey]   = useState(null)
  const [photoUploading, setPhotoUploading]   = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [demos, setDemos] = useState([])
  const photoInputRef  = useRef(null)
  const bannerInputRef = useRef(null)

  // ── ÉPICA 2: Carpetas de Proyectos ──
  const [folders, setFolders]                   = useState([])
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)

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

  /* Trae todos los demos del usuario y deriva la cover_key del activo */
  useEffect(() => {
    if (!user?.s3_key || !token) {
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
  }, [user?.s3_key, token])

  /* Carpetas del usuario (Épica 2) */
  useEffect(() => {
    if (!token) { setFolders([]); return }
    let cancelled = false
    fetch(`${API_URL}/api/folders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((list) => {
        if (cancelled) return
        setFolders(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token])

  /**
   * Asigna un demo a una carpeta (o lo desvincula con folderId=null).
   * Actualiza el estado local sin re-fetch para que la UI responda instantáneo.
   */
  const assignDemoToFolder = async (demoId, folderId) => {
    try {
      const res = await fetch(`${API_URL}/demos/${demoId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ folder_id: folderId || null }),
      })
      if (!res.ok) return
      setDemos((prev) => prev.map((d) =>
        d.id === demoId ? { ...d, folder_id: folderId || null } : d
      ))
      // Refrescar conteo de demos por carpeta — refetch ligero
      const refetch = await fetch(`${API_URL}/api/folders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (refetch.ok) setFolders(await refetch.json())
    } catch {
      // Silencio intencional: si falla, el usuario verá que el select no cambió
    }
  }

  /** Tras crear una carpeta nueva (desde el modal), la añadimos al state. */
  const handleFolderCreated = (newFolder) => {
    setFolders((prev) => [newFolder, ...prev])
    setShowNewFolderModal(false)
  }

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

  return (
    // MainLayout añade /profile a FULL_BLEED_ROUTES → este div ocupa el ancho
    // total de la ventana. No usamos negative margins; el negro fluye directo
    // hasta los bordes de la pantalla.
    <div className="min-h-screen w-full bg-black pb-20">

      {/* Hidden inputs */}
      <input ref={photoInputRef}  type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => handlePhotoUpload(e.target.files[0])} />
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => handleBannerUpload(e.target.files[0])} />

      {/* ══════════════════════════════════════════════
          BANNER — full-width, gradiente morado oscuro → negro
      ══════════════════════════════════════════════ */}
      <div className="relative w-full h-56 group/banner overflow-hidden bg-gradient-to-b from-purple-950 via-zinc-950 to-black">
        {bannerUrl && (
          <img src={bannerUrl} alt="banner" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" />
        )}
        {/* Líneas técnicas decorativas */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(to right, rgba(168,85,247,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 100%',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-800" />

        {/* Botón cambiar banner */}
        <button
          onClick={() => bannerInputRef.current?.click()}
          disabled={bannerUploading}
          className="absolute top-4 right-4 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-black/80 border border-zinc-700 text-zinc-300 text-[10px] uppercase tracking-widest hover:border-purple-500 hover:text-purple-400"
        >
          {bannerUploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
          Cambiar banner
        </button>

      </div>

      {/* ══════════════════════════════════════════════
          FRANJA DE IDENTIDAD
      ══════════════════════════════════════════════ */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-end gap-5">

          {/* Avatar cuadrado con borde técnico */}
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            className="group/avatar relative w-28 h-28 -mt-16 overflow-hidden border-2 border-zinc-700 hover:border-purple-500 bg-zinc-900 focus:outline-none flex-shrink-0 transition-colors z-10"
          >
            {photoUrl ? (
              <img src={photoUrl} alt={user.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-700 to-zinc-900 flex items-center justify-center text-white font-black text-3xl">
                {getInitials(user.nombre)}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
              {photoUploading
                ? <Loader2 size={20} className="text-purple-400 animate-spin" />
                : <Camera size={20} className="text-purple-400" />}
            </div>
          </button>

          {/* Nombre + roles + ciudad */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-white text-3xl md:text-4xl font-black uppercase tracking-tight leading-none">
                {user.nombre}
              </h1>
              {user.es_premium && (
                <span className="border border-purple-500 text-purple-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                  ✦ Premium
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] uppercase tracking-widest text-zinc-500">
              {oficioUser.length > 0 && (
                <span className="text-zinc-300">{oficioUser.join(' · ')}</span>
              )}
              {user.ciudad && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} />
                  {user.ciudad}
                </span>
              )}
              <span className="text-zinc-700 font-mono">ID://{user.id?.slice(0, 8) ?? '────────'}</span>
            </div>
          </div>

          {/* Botón editar — borde sólido, sin fondo */}
          <button
            onClick={() => navigate('/settings')}
            className="flex-shrink-0 flex items-center gap-2 border border-purple-500 text-purple-400 hover:bg-purple-500/10 px-4 py-2 text-[11px] uppercase tracking-widest font-bold transition-colors"
          >
            <Edit3 size={12} />
            Editar perfil
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          GRID PRINCIPAL — 3 columnas con divisores full-bleed
          Sin max-w para que las líneas divisoras lleguen hasta los bordes
          de la pantalla (parte clave del look brutalista/dashboard).
      ══════════════════════════════════════════════ */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">

        {/* ───────────────── COLUMNA IZQUIERDA ───────────────── */}
        <div className="p-6 flex flex-col gap-8">

          {/* BIOGRAFÍA */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-300 text-[11px] font-bold uppercase tracking-[0.25em]">
                Biografía
              </p>
              {!editingBio && (
                <button
                  onClick={() => { setBioValue(user?.bio ?? ''); setEditingBio(true) }}
                  className="flex items-center gap-1 text-zinc-600 hover:text-purple-400 transition-colors text-[10px] uppercase tracking-widest"
                >
                  <Pencil size={10} />
                  {user?.bio ? 'Editar' : 'Agregar'}
                </button>
              )}
            </div>
            <div className="h-px bg-zinc-800 -mt-2 mb-4" />

            {editingBio ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value)}
                  rows={5}
                  placeholder="Cuéntanos sobre tu música y lo que buscas..."
                  autoFocus
                  className="w-full bg-black border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-purple-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveBio}
                    disabled={bioSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest transition-colors"
                  >
                    {bioSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingBio(false)}
                    className="px-4 py-1.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-[11px] font-bold uppercase tracking-widest transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : user?.bio ? (
              <p className="text-zinc-300 text-sm leading-relaxed">{user.bio}</p>
            ) : (
              <p className="text-zinc-600 text-sm italic">Sin biografía registrada.</p>
            )}
          </section>

          {/* VIBRA MUSICAL */}
          <section>
            <SectionHeader>Vibra Musical</SectionHeader>
            {(tagsUser.length > 0 || gens.length > 0) ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {tagsUser.map((t) => (
                    <span
                      key={t}
                      className="bg-black border border-purple-500/40 text-purple-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                    >
                      {t}
                    </span>
                  ))}
                  {gens.filter((g) => !tagsUser.includes(g)).map((g) => (
                    <span
                      key={g}
                      className="bg-black border border-zinc-700 text-zinc-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                {gens.length > 0 && (
                  <p className="text-zinc-700 text-[10px] mt-3 uppercase tracking-widest">
                    [ Tags grises = sugerencias IA Bandify ]
                  </p>
                )}
              </>
            ) : (
              <p className="text-zinc-600 text-sm italic">Sin tags definidos.</p>
            )}
          </section>
        </div>

        {/* ───────────────── COLUMNA CENTRAL: Carpetas de Proyectos ───────────────── */}
        <div className="p-6">

          {/* Header con botón "+ Nueva Carpeta" inline */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <p className="text-zinc-300 text-[11px] font-bold uppercase tracking-[0.25em]">
                Carpetas de Proyectos
              </p>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-[10px] uppercase tracking-widest font-bold transition-colors"
              >
                <Plus size={11} />
                Nueva
              </button>
            </div>
            <div className="h-px bg-zinc-800 mt-2" />
          </div>

          {folders.length === 0 ? (
            <div className="border border-dashed border-zinc-800 bg-zinc-950/50 p-8 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 border border-zinc-800 flex items-center justify-center">
                <Folder size={22} className="text-zinc-700" strokeWidth={1.5} />
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
                Aún no tienes carpetas. Crea una para organizar tus demos por proyecto.
              </p>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="mt-1 px-4 py-2 border border-purple-500 text-purple-400 hover:bg-purple-500/10 text-[11px] uppercase tracking-widest font-bold transition-colors"
              >
                Crear primera carpeta
              </button>
            </div>
          ) : (
            <FoldersGrid folders={folders} />
          )}
        </div>

        {/* ───────────────── COLUMNA DERECHA ───────────────── */}
        <div className="p-6 flex flex-col gap-8">

          {/* DEMOS PUBLICADOS */}
          <section>
            <SectionHeader>Demos Publicados</SectionHeader>

            {tieneAnalisis ? (
              <>
                {/* Tracklist */}
                {demos.length > 0 ? (
                  <ul className="border border-zinc-800 divide-y divide-zinc-800">
                    {demos.map((d, i) => {
                      const isActive = d.s3_key === user.s3_key
                      return (
                        <li
                          key={d.id || d.s3_key || i}
                          className={`flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors ${
                            isActive ? 'bg-purple-500/5 border-l-2 border-l-purple-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-zinc-700 text-[11px] font-mono flex-shrink-0">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className={`truncate text-[13px] ${isActive ? 'text-purple-300 font-bold' : 'text-zinc-400'}`}>
                              {d.nombre || 'Demo sin nombre'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] flex-shrink-0 uppercase tracking-widest">
                            {/* Selector de carpeta — solo aparece si hay carpetas creadas */}
                            {folders.length > 0 && (
                              <select
                                value={d.folder_id || ''}
                                onChange={(e) => assignDemoToFolder(d.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                title="Asignar a carpeta"
                                className="bg-zinc-900 border border-zinc-800 hover:border-purple-500 text-zinc-400 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-none focus:outline-none cursor-pointer max-w-[110px] truncate"
                              >
                                <option value="">Sin carpeta</option>
                                {folders.map((f) => (
                                  <option key={f.id} value={f.id}>{f.nombre}</option>
                                ))}
                              </select>
                            )}
                            {isActive && stats?.bpm && (
                              <span className="text-zinc-500 font-mono">{stats.bpm} BPM</span>
                            )}
                            {isActive && (
                              <span className="text-purple-400 font-bold">● Activo</span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-zinc-600 text-sm italic">Cargando demos...</p>
                )}

                {/* Reproductor del demo activo */}
                {audioUrl && (
                  <div className="mt-4 border border-zinc-800 bg-zinc-950">
                    <div
                      className="relative overflow-hidden"
                      style={activeCoverUrl ? {
                        backgroundImage: `url(${activeCoverUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : {}}
                    >
                      {activeCoverUrl && (
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/60" />
                      )}
                      <div className="relative z-10 p-4">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] mb-2">
                          Reproduciendo
                        </p>
                        <AudioPlayer key={audioUrl} src={audioUrl} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats técnicos del demo activo */}
                {stats && (
                  <div className="mt-3 grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800">
                    {mood && (
                      <div className="bg-black p-2.5 flex items-center gap-2">
                        <span className="w-2 h-2" style={{ backgroundColor: mood.color }} />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{mood.label}</span>
                      </div>
                    )}
                    {detectedKey && (
                      <div className="bg-black p-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Tonalidad</span>
                        <span className="text-[11px] font-mono font-bold text-zinc-200">{detectedKey}</span>
                      </div>
                    )}
                    <div className="bg-black p-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">BPM</span>
                      <span className="text-[11px] font-mono font-bold text-zinc-200">{stats.bpm}</span>
                    </div>
                    <div className="bg-black p-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Energía</span>
                      <span className="text-[11px] font-mono font-bold text-purple-400">{stats.energia}%</span>
                    </div>
                    {TextureIcon && (
                      <div className="bg-black p-2.5 flex items-center gap-2 col-span-2">
                        <TextureIcon size={12} className="text-zinc-500" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{stats.texture.label}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Link a análisis completo */}
                <Link
                  to="/mi-adn"
                  className="mt-3 flex items-center justify-center gap-2 border border-zinc-800 hover:border-purple-500 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-purple-400 transition-colors"
                >
                  <BarChart2 size={11} />
                  Ver análisis completo
                </Link>
              </>
            ) : (
              <div className="border border-dashed border-zinc-800 p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 border border-zinc-800 flex items-center justify-center">
                  <Upload size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-zinc-300 text-sm uppercase tracking-widest font-bold">Sin demos analizados</p>
                  <p className="text-zinc-600 text-[11px] mt-1">Sube tu primer demo para activar el ADN.</p>
                </div>
                <Link
                  to="/mi-adn"
                  className="mt-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors"
                >
                  Subir primer demo
                </Link>
              </div>
            )}
          </section>

          {/* REDES SOCIALES */}
          <section>
            <SectionHeader>Redes Sociales</SectionHeader>

            {(user?.instagram_url || user?.spotify_url || user?.discord_url) ? (
              <div className="flex flex-wrap gap-2">
                {user.instagram_url && (
                  <a
                    href={user.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram"
                    className="w-11 h-11 border border-zinc-700 hover:border-purple-500 flex items-center justify-center text-zinc-400 hover:text-purple-400 transition-colors"
                  >
                    <IgIcon />
                  </a>
                )}
                {user.spotify_url && (
                  <a
                    href={user.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Spotify"
                    className="w-11 h-11 border border-zinc-700 hover:border-purple-500 flex items-center justify-center text-zinc-400 hover:text-purple-400 transition-colors"
                  >
                    <SpotifyIcon />
                  </a>
                )}
                {user.discord_url && (
                  <a
                    href={user.discord_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Discord"
                    className="w-11 h-11 border border-zinc-700 hover:border-purple-500 flex items-center justify-center text-zinc-400 hover:text-purple-400 transition-colors"
                  >
                    <DiscordIcon />
                  </a>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-800 p-4">
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  Sin redes vinculadas.{' '}
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest font-bold"
                  >
                    Vincular →
                  </button>
                </p>
              </div>
            )}
          </section>
        </div>

      </div>

      {/* Modal "Nueva Carpeta" */}
      {showNewFolderModal && (
        <NewFolderModal
          token={token}
          onClose={() => setShowNewFolderModal(false)}
          onCreated={handleFolderCreated}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   FoldersGrid — wrapper que resuelve los signed URLs de las covers y los
   pasa a GlassIcons. useImageUrl es un hook, así que necesita un componente
   por carpeta para llamarlo legítimamente.
══════════════════════════════════════════════════════════════════════════ */
function FoldersGrid({ folders }) {
  // Mapa de id → signed URL resuelta. Tenemos que llamar useImageUrl una vez
  // por carpeta usando un sub-componente "resolver".
  const [coverUrls, setCoverUrls] = useState({})

  // Build items — el `cover_url` que pasamos a GlassIcons es la URL FIRMADA,
  // no la s3_key. Cada FolderCoverResolver setea su URL en coverUrls.
  const items = folders.map((f) => ({
    id:        f.id,
    label:     f.nombre,
    icon:      <Folder size={18} strokeWidth={2} />,
    cover_url: coverUrls[f.id] || null,
    count:     f.demo_count,
  }))

  return (
    <>
      {/* Resolvers invisibles: cada uno llama useImageUrl y publica el resultado */}
      {folders.map((f) => (
        <FolderCoverResolver
          key={f.id}
          folderId={f.id}
          s3Key={f.cover_url}
          onResolved={(url) => setCoverUrls((prev) => ({ ...prev, [f.id]: url }))}
        />
      ))}
      <GlassIcons items={items} />
    </>
  )
}

/** Resolver invisible — llama useImageUrl y reporta el resultado al padre. */
function FolderCoverResolver({ folderId, s3Key, onResolved }) {
  const { url } = useImageUrl(s3Key || null)
  useEffect(() => {
    onResolved(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  return null
}

/* ══════════════════════════════════════════════════════════════════════════
   NewFolderModal — input de nombre + upload opcional de cover.
══════════════════════════════════════════════════════════════════════════ */
function NewFolderModal({ token, onClose, onCreated }) {
  const [nombre, setNombre]                 = useState('')
  const [coverKey, setCoverKey]             = useState(null)
  const [coverPreview, setCoverPreview]     = useState(null)
  const [uploading, setUploading]           = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  const coverInputRef = useRef(null)

  const handleCoverFile = async (file) => {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError('Solo JPG, PNG o WebP')
      return
    }
    setError('')
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
      const urlRes = await fetch(`${API_URL}/images/upload-url?type=folder&ext=${ext}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { uploadUrl, key } = await urlRes.json()
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      setCoverKey(key)
    } catch {
      setError('Error al subir la imagen')
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      setCoverPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/folders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ nombre: nombre.trim(), cover_url: coverKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al crear la carpeta')
        return
      }
      onCreated(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Cleanup del blob URL al desmontar
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white text-lg font-bold uppercase tracking-wide">Nueva Carpeta</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Cover opcional */}
          <div>
            <label className="block text-zinc-500 text-[11px] uppercase tracking-widest font-bold mb-2">
              Imagen (opcional)
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleCoverFile(e.target.files?.[0])}
              className="hidden"
            />
            {coverPreview ? (
              <div className="relative">
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-32 object-cover border border-zinc-800"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-purple-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (coverPreview) URL.revokeObjectURL(coverPreview)
                    setCoverPreview(null)
                    setCoverKey(null)
                    if (coverInputRef.current) coverInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-black text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-800 hover:border-purple-500/40 py-6 flex flex-col items-center gap-2 text-zinc-500 hover:text-purple-400 transition-colors"
              >
                <ImagePlus size={20} />
                <span className="text-[10px] uppercase tracking-widest font-bold">Subir cover</span>
              </button>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-zinc-500 text-[11px] uppercase tracking-widest font-bold mb-2">
              Nombre de la carpeta
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Sesiones 2026"
              maxLength={100}
              autoFocus
              className="w-full bg-black border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {saving ? 'Creando...' : 'Crear carpeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Brand SVG icons ─── */
function IgIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}
function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}
function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.1 18.102.12 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}
