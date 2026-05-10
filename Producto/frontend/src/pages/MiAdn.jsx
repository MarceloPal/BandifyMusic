import { useMemo, useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Upload, CheckCircle, XCircle, Loader2, Music2,
  BarChart2, Zap, Wind, Activity, Sparkles, RefreshCw,
  Trash2, Camera, Library, Sparkles as SparklesIcon, MessageCircle, Users,
  Play, Pause,
} from 'lucide-react'
import { useAuth }        from '../context/AuthContext'
import { API_URL, getInitials }        from '../utils/helpers'
import { parseVector, parseMetadata, deriveStats, CHROMA_LABELS, deriveMood, detectKey, suggestGenres } from '../utils/audioHelpers'
import { useImageUrl }    from '../hooks/useImageUrl'
import { useProgressMessage } from '../hooks/useProgressMessage'
import PremiumModal           from '../components/PremiumModal'
import AudioAnalysisLoader    from '../components/AudioAnalysisLoader'
import ProfileDrawer          from '../components/ProfileDrawer'
import AudioPlayer            from '../components/AudioPlayer'

/* ─── sub-components ─── */

const TEXTURE_ICONS = { Zap, Wind, Activity, Sparkles }

function StatBox({ label, value, unit = '', accent = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-2xl border ${
      accent ? 'bg-purple-500/10 border-purple-500/30' : 'bg-zinc-700/50 border-white/8'
    }`}>
      <span className={`font-black text-2xl leading-none tabular-nums ${accent ? 'text-purple-300' : 'text-zinc-100'}`}>
        {value}<span className="text-sm font-semibold text-zinc-500 ml-0.5">{unit}</span>
      </span>
      <span className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">{label}</span>
    </div>
  )
}

function HpsBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-400 text-xs w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-zinc-300 font-bold text-xs tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

function ChromaChart({ chroma }) {
  const max = Math.max(...chroma, 0.01)
  return (
    <div className="flex items-end gap-1 h-20">
      {chroma.map((val, i) => {
        const pct = (val / max) * 100
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${Math.max(3, Math.round(pct * 0.64))}px`,
                background: pct > 70 ? '#7c3aed' : pct > 40 ? '#a78bfa' : '#ddd6fe',
              }}
            />
            <span className="text-zinc-500 font-medium" style={{ fontSize: '9px', lineHeight: 1 }}>
              {CHROMA_LABELS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DescriptorBar({ label, value, color = '#7c3aed', description = '' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-zinc-200 text-sm font-semibold">{label}</span>
        <span className="text-zinc-400 text-sm font-bold tabular-nums">{value}%</span>
      </div>
      <div className="h-2.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      {description && <p className="text-zinc-500 text-xs mt-1">{description}</p>}
    </div>
  )
}

function AnaCard({ title, children }) {
  return (
    <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">{title}</p>
      {children}
    </div>
  )
}

/* ── Demo card in the repertoire list ── */
function DemoCard({ demo, isSelected, isPlaying, onSelect, onTogglePlay, onDelete, onCoverUpload, isDeleting }) {
  const { url: coverUrl } = useImageUrl(demo.cover_url ?? null)

  const dateLabel = new Date(demo.created_at).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short',
  })

  return (
    <div
      onClick={() => onSelect(demo.id)}
      className={`relative flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all shadow-sm ${
        isSelected ? 'border-purple-500 shadow-purple-500/20 shadow-md' : 'border-transparent hover:border-zinc-600'
      }`}
    >
      {/* Cover */}
      <div className="aspect-square bg-zinc-700 relative group">
        {coverUrl ? (
          <img src={coverUrl} alt={demo.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={32} className="text-zinc-500" />
          </div>
        )}

        {/* Dark overlay + Play/Pause button (siempre visible si playing, fade-in si no) */}
        <div className={`absolute inset-0 transition-all ${isPlaying ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/40'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(demo.id) }}
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            <div className="w-14 h-14 rounded-full bg-purple-600/95 flex items-center justify-center shadow-xl backdrop-blur-sm hover:bg-purple-500 transition-colors">
              {isPlaying
                ? <Pause size={22} className="text-white" fill="white" />
                : <Play  size={22} className="text-white ml-0.5" fill="white" />
              }
            </div>
          </button>
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 bg-purple-600 rounded-full p-0.5 z-10">
            <CheckCircle size={12} className="text-white" />
          </div>
        )}

        {/* Camera overlay for cover upload */}
        <button
          onClick={(e) => { e.stopPropagation(); onCoverUpload(demo.id) }}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/90 transition-all z-10"
          title="Cambiar portada"
        >
          <Camera size={12} className="text-white" />
        </button>

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(demo.id) }}
          disabled={isDeleting}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-50 z-10"
          title="Eliminar demo"
        >
          {isDeleting
            ? <Loader2 size={12} className="text-white animate-spin" />
            : <Trash2  size={12} className="text-white" />
          }
        </button>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 bg-zinc-800">
        <p className="text-zinc-100 text-sm font-semibold truncate">{demo.nombre}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{dateLabel}</p>
      </div>
    </div>
  )
}

/* ── Progress messages ── */
const MAX_FILE_MB    = 60
const MAX_FILE_SIZE  = MAX_FILE_MB * 1024 * 1024
const HIFI_THRESHOLD = 20 * 1024 * 1024   // archivos > 20 MB muestran aviso hi-fi


/* ─── main page ─── */

/* ─── Simple view ─── */
function labelFromRange(value, low, high, labels) {
  if (value < low) return labels[0]
  if (value < high) return labels[1]
  return labels[2]
}

function SimpleView({ stats }) {
  const bpmLabel      = stats.bpm < 80 ? 'Lento' : stats.bpm < 110 ? 'Moderado' : stats.bpm < 140 ? 'Rápido' : 'Muy rápido'
  const colorLabel    = labelFromRange(stats.brillo, 33, 66, ['Cálido', 'Neutro', 'Brillante'])
  const energiaLabel  = labelFromRange(stats.energia, 33, 66, ['Suave', 'Moderada', 'Intensa'])
  const melodiaLabel  = stats.harmonyPct > stats.percussivePct + 20
    ? 'Melódico' : stats.percussivePct > stats.harmonyPct + 20 ? 'Percusivo' : 'Balanceado'
  const armoniaLabel  = labelFromRange(stats.riquezaArmonica, 33, 66, ['Minimalista', 'Armónico', 'Rico en notas'])

  const items = [
    { label: 'Textura',   value: stats.texture.label, desc: 'Carácter general del sonido' },
    { label: 'Color',     value: colorLabel,           desc: 'Temperatura del timbre' },
    { label: 'Ritmo',     value: `${bpmLabel} · ${stats.bpm} BPM`, desc: 'Velocidad del pulso' },
    { label: 'Energía',   value: energiaLabel,         desc: 'Intensidad del audio' },
    { label: 'Melodía',   value: melodiaLabel,         desc: 'Presencia melódica vs percusiva' },
    { label: 'Armonía',   value: armoniaLabel,         desc: 'Riqueza de notas y acordes' },
  ]

  return (
    <div key="simple" className="adn-fade-in grid grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(({ label, value, desc }) => (
        <div key={label} className="bg-zinc-800 rounded-2xl p-4 border border-white/8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
          <p className="text-zinc-100 font-bold text-lg leading-tight">{value}</p>
          <p className="text-zinc-500 text-xs mt-1">{desc}</p>
        </div>
      ))}
    </div>
  )
}

/* ─── QuickMatch card ─── */
function QuickMatchCard({ musico, onConnect, onOpenProfile }) {
  const { url: photoUrl } = useImageUrl(musico.foto_url ?? null)
  const oficio = Array.isArray(musico.oficio) ? musico.oficio : []

  return (
    <div
      onClick={() => onOpenProfile(musico)}
      className="flex items-center gap-3 p-3 rounded-2xl border border-white/8 bg-zinc-800 hover:border-purple-400/40 hover:bg-zinc-700/50 transition-colors group cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
        {photoUrl
          ? <img src={photoUrl} alt={musico.nombre} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
              {getInitials(musico.nombre)}
            </div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-zinc-100 font-semibold text-sm truncate">{musico.nombre}</p>
        <p className="text-zinc-500 text-xs truncate">
          {oficio[0] || musico.instrumento || musico.ciudad || '—'}
        </p>
      </div>

      {/* Compatibilidad */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full tabular-nums">
          {musico.compatibilidad}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onConnect(musico) }}
          className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-purple-600 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          title="Conectar"
        >
          <MessageCircle size={13} />
        </button>
      </div>
    </div>
  )
}

export default function MiAdn() {
  const { token, user, updateUser } = useAuth()
  const queryClient                 = useQueryClient()
  const navigate                    = useNavigate()

  /* adn view toggle */
  const [simpleView, setSimpleView] = useState(
    () => localStorage.getItem('adn-view') !== 'tecnico'
  )
  const toggleView = () => {
    const next = !simpleView
    setSimpleView(next)
    localStorage.setItem('adn-view', next ? 'simple' : 'tecnico')
  }

  /* upload / polling state */
  const [jobId, setJobId]             = useState(null)
  const [pendingDemoId, setPendingDemoId] = useState(null) // demo id being processed
  const [isDragging, setIsDragging]   = useState(false)
  const [fileError, setFileError]     = useState('')
  const [demoNombre, setDemoNombre]   = useState('')
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showUploader, setShowUploader] = useState(true)
  const [isHifi, setIsHifi]           = useState(false)  // archivo > 20 MB (lossless)
  const [quickMatches, setQuickMatches] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('quickMatches') || '[]') }
    catch { return [] }
  })   // top 3 matches tras análisis (persistidos en sessionStorage)
  const fileInputRef  = useRef(null)

  /* cover upload state */
  const coverInputRef   = useRef(null)
  const [activeCoverId, setActiveCoverId]     = useState(null)  // demo cuyo cover se sube actualmente

  /* repertoire */
  const [selectedDemoId, setSelectedDemoId] = useState(null)
  const [deletingId, setDeletingId]         = useState(null)
  const [selectedMusico, setSelectedMusico] = useState(null)
  const [audioUrl, setAudioUrl]             = useState(null)
  const [isPlaying, setIsPlaying]           = useState(false)
  const audioRef                            = useRef(null)
  const pendingAutoPlayRef                  = useRef(false)

  /* ── Fetch demo list ── */
  const { data: demos = [] } = useQuery({
    queryKey: ['demos'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/demos`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!token,
  })

  // Hide uploader when demos exist (and not actively processing)
  useEffect(() => {
    if (demos.length > 0 && !jobId) setShowUploader(false)
  }, [demos.length]) // eslint-disable-line

  // Auto-select first demo when list first loads
  useEffect(() => {
    if (!selectedDemoId && demos.length > 0) setSelectedDemoId(demos[0].id)
  }, [demos]) // eslint-disable-line

  /* ── Upload + analyze mutation ── */
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Determinar extensión real del archivo para Content-Type correcto en S3
      const fileExt = (file.name.split('.').pop() || 'mp3').toLowerCase()
      const AUDIO_MIME = {
        mp3:  'audio/mpeg',
        wav:  'audio/wav',
        ogg:  'audio/ogg',
        m4a:  'audio/mp4',
        flac: 'audio/flac',
        alac: 'audio/mp4',
      }
      const audioExt = AUDIO_MIME[fileExt] ? fileExt : 'mp3'

      const uploadRes = await fetch(`${API_URL}/audio/upload-url?ext=${audioExt}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!uploadRes.ok) throw new Error('No se pudo obtener la URL de subida')
      const { uploadUrl, s3Key } = await uploadRes.json()

      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': AUDIO_MIME[audioExt] }, body: file })

      const analyzeRes = await fetch(`${API_URL}/audio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ s3Key, nombre: demoNombre.trim() || 'Demo sin nombre' }),
      })

      if (analyzeRes.status === 403) {
        const errData = await analyzeRes.json().catch(() => ({}))
        const err = new Error(errData.error || 'Límite alcanzado')
        err.code = errData.code ?? 'FORBIDDEN'
        throw err
      }
      if (!analyzeRes.ok) throw new Error('Error al iniciar el análisis')
      return analyzeRes.json()
    },
    onSuccess: (data) => {
      setJobId(data.jobId)
      if (data.demoId) setPendingDemoId(data.demoId)
      setDemoNombre('')
    },
    onError: (err) => {
      if (err.code === 'DEMO_LIMIT_REACHED') setShowPremiumModal(true)
    },
  })

  /* ── Poll job ── */
  const { data: jobData } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/audio/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    enabled: !!jobId,
    refetchInterval: (q) => q.state.data?.status === 'processing' ? 5000 : false,
    staleTime: 0,
  })

  // When job completes → refresh demos, auto-select new demo, update user profile
  useEffect(() => {
    if (jobData?.status !== 'done') return
    queryClient.invalidateQueries({ queryKey: ['demos'] })
    if (pendingDemoId) {
      setSelectedDemoId(pendingDemoId)
      setPendingDemoId(null)
    }
    setShowUploader(false)
    fetch(`${API_URL}/usuarios/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (p?.id) updateUser(p) })
      .catch(() => {})

    // Quick Match — top 3 músicos compatibles con el nuevo demo
    // Pequeño delay para dar tiempo a que el vector se propague a perfiles
    setTimeout(() => {
      fetch(`${API_URL}/matching/buscar?limite=3`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : [])
        .then((rows) => {
          const matches = Array.isArray(rows) ? rows : []
          setQuickMatches(matches)
          sessionStorage.setItem('quickMatches', JSON.stringify(matches))
        })
        .catch(() => {})
    }, 1500)
  }, [jobData?.status]) // eslint-disable-line

  /* ── Delete demo ── */
  const handleDeleteDemo = async (demoId) => {
    setDeletingId(demoId)
    try {
      await fetch(`${API_URL}/demos/${demoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      queryClient.invalidateQueries({ queryKey: ['demos'] })
      if (selectedDemoId === demoId) {
        setSelectedDemoId(null)
        setAudioUrl(null)
        setIsPlaying(false)
      }
    } finally {
      setDeletingId(null)
    }
  }

  /* ── Cover upload ── */
  const handleCoverSelect = (demoId) => {
    setActiveCoverId(demoId)
    coverInputRef.current?.click()
  }

  const handleCoverFile = async (file) => {
    if (!file || !activeCoverId) return
    try {
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
      const urlRes = await fetch(
        `${API_URL}/images/upload-url?type=cover&ext=${ext}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const { uploadUrl, key } = await urlRes.json()
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      await fetch(`${API_URL}/demos/${activeCoverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cover_url: key }),
      })
      queryClient.invalidateQueries({ queryKey: ['demos'] })
      queryClient.invalidateQueries({ queryKey: ['image-url', key] })
    } finally {
      setActiveCoverId(null)
    }
  }

  /* ── File handlers ── */
  const handleFile = (file) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`El archivo supera el límite de ${MAX_FILE_MB} MB. Para archivos muy grandes exporta en MP3 320 kbps.`)
      return
    }
    setFileError('')
    setIsHifi(file.size > HIFI_THRESHOLD)
    uploadMutation.mutate(file)
  }
  const handleDrop  = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }
  const handleReset = ()  => { setJobId(null); uploadMutation.reset(); setShowUploader(true); setFileError('') }

  const isProcessing = uploadMutation.isPending || jobData?.status === 'processing'
  const isError      = jobData?.status === 'error' || uploadMutation.isError
  const isLimitError = uploadMutation.error?.code === 'DEMO_LIMIT_REACHED'

  /* ── ADN derivation from selected demo ── */
  const selectedDemo = useMemo(
    () => demos.find((d) => d.id === selectedDemoId) ?? null,
    [demos, selectedDemoId]
  )

  const v     = useMemo(() => parseVector(selectedDemo?.audio_vector),       [selectedDemo])
  const meta  = useMemo(() => parseMetadata(selectedDemo?.audio_metadata),   [selectedDemo])
  const stats = useMemo(() => v ? deriveStats(v, meta) : null, [v, meta])

  /* ── Listen URL para reproducir el demo seleccionado ── */
  useEffect(() => {
    const key = selectedDemo?.s3_key
    if (!key || !token) { setAudioUrl(null); setIsPlaying(false); return }
    let cancelled = false
    fetch(`${API_URL}/audio/listen-url?key=${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data?.url) setAudioUrl(data.url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedDemo?.s3_key, token])

  /* ── Auto-play cuando el URL queda disponible (al apretar play en una card) ── */
  useEffect(() => {
    if (audioUrl && pendingAutoPlayRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {})
      pendingAutoPlayRef.current = false
    }
  }, [audioUrl])

  const handleTogglePlay = (demoId) => {
    if (!audioRef.current) {
      // Audio aún no montado — selecciona y marca para auto-play
      setSelectedDemoId(demoId)
      pendingAutoPlayRef.current = true
      return
    }
    // Si ya es el demo actual, toggle play/pause
    if (selectedDemoId === demoId) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => {})
      else audioRef.current.pause()
      return
    }
    // Cambiar a otro demo y auto-play cuando el URL cargue
    setSelectedDemoId(demoId)
    pendingAutoPlayRef.current = true
  }

  /* ── Top 3 compatibles filtrados por ciudad + tags del usuario ── */
  const { data: compatibles = [] } = useQuery({
    queryKey: ['compatibles', user?.ciudad, user?.user_tags],
    queryFn: async () => {
      const params = new URLSearchParams({ limite: '3' })
      if (user?.ciudad) params.set('ciudad', user.ciudad)
      if (user?.user_tags?.length) params.set('tags', user.user_tags.join(','))
      const res = await fetch(`${API_URL}/matching/buscar?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      const rows = await res.json()
      return Array.isArray(rows) ? rows : []
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token && !!stats,
  })

  const TextureIcon = stats ? (TEXTURE_ICONS[stats.texture.icon] ?? Activity) : null
  const progressMsg = useProgressMessage(isProcessing)

  return (
    <div className="max-w-5xl mx-auto w-full">

      {/* Premium modal */}
      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}

      {/* ProfileDrawer para ver perfil del músico desde QuickMatch */}
      {selectedMusico && (
        <ProfileDrawer
          musico={selectedMusico}
          onClose={() => setSelectedMusico(null)}
        />
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.flac,.alac,.m4a,.ogg,audio/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleCoverFile(e.target.files[0])}
      />

      {/* ── Header ── */}
      <div className="mb-8 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-900/30">
          <BarChart2 size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">
            Mi ADN
          </h1>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
            Sube demos y la IA mapea tu sonido. Selecciona un demo para ver su análisis.
          </p>
        </div>
      </div>

      {/* ── Analysis loader popup ── */}
      {isProcessing && (
        <AudioAnalysisLoader
          progressText={progressMsg.text}
          progressSub={progressMsg.sub}
          isHifi={isHifi}
          secs={progressMsg.secs}
        />
      )}

      {/* ── Upload section ── */}
      {showUploader ? (
        <>
          {/* Demo name input */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Nombre del demo (ej: Versión 2024, Reggaetón Oscuro...)"
              value={demoNombre}
              onChange={(e) => setDemoNombre(e.target.value)}
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-2xl py-14 px-8 flex flex-col items-center justify-center cursor-pointer transition-all select-none mb-5 ${
              isDragging  ? 'border-purple-400 bg-purple-500/10'
              : isError && !isLimitError ? 'border-red-500/40 bg-red-500/10'
              :             'border-white/10 hover:border-white/20 bg-zinc-800'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            {isError && !isLimitError ? (
              <>
                <XCircle size={36} className="text-red-400 mb-3" />
                <p className="text-zinc-100 font-semibold">Hubo un error en el análisis</p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset() }}
                  className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-500 transition-colors"
                >
                  Intentar de nuevo
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-zinc-700 flex items-center justify-center mb-4">
                  <Upload size={24} className="text-zinc-500" />
                </div>
                <p className="text-zinc-100 font-semibold">Arrastra tu demo aquí</p>
                <p className="text-zinc-500 text-sm mt-1">
                  MP3 · WAV · FLAC · ALAC · OGG · máx {MAX_FILE_MB} MB
                </p>
                <p className="text-zinc-500 text-xs mt-3">o haz clic para seleccionar</p>
                <p className="text-zinc-500 text-xs mt-2">
                  WAV / FLAC = análisis más preciso · se convierte a MP3 automáticamente
                </p>
              </>
            )}
          </div>
        </>
      ) : (
        /* Compact post-upload card */
        <div className="bg-zinc-800 rounded-2xl p-5 flex items-center justify-between border border-green-500/30 shadow-sm mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-semibold text-sm">Demo analizado</p>
              <p className="text-zinc-500 text-xs mt-0.5">Selecciona un demo del repertorio para ver su ADN</p>
            </div>
          </div>
          <button
            onClick={() => setShowUploader(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-white/20 px-3 py-2 rounded-full transition-colors"
          >
            <RefreshCw size={11} />
            Subir otro
          </button>
        </div>
      )}

      {/* File size error */}
      {fileError && !isProcessing && showUploader && (
        <p className="text-red-500 text-sm mb-5 px-1">{fileError}</p>
      )}

      {/* ── Quick Match — top 3 tras análisis ── */}
      {quickMatches.length > 0 && !isProcessing && (
        <div className="mb-6 bg-gradient-to-br from-purple-500/15 to-violet-500/10 border border-purple-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Users size={12} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Matches de tu nuevo demo</p>
              <p className="text-zinc-400 text-xs">Los 3 músicos más compatibles con este sonido</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {quickMatches.map((m) => (
              <QuickMatchCard
                key={m.id}
                musico={m}
                onConnect={(musico) => navigate(`/messages?with=${musico.id}&nombre=${encodeURIComponent(musico.nombre)}`)}
                onOpenProfile={(musico) => setSelectedMusico(musico)}
              />
            ))}
          </div>

          <button
            onClick={() => navigate('/explore')}
            className="mt-4 w-full text-center text-purple-300 text-xs font-semibold hover:text-purple-200 transition-colors"
          >
            Ver todos los matches en Explorar →
          </button>
        </div>
      )}

      {/* ── Repertorio ── */}
      {demos.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Library size={15} className="text-zinc-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Repertorio · {demos.length} demo{demos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {demos.map((demo) => (
              <DemoCard
                key={demo.id}
                demo={demo}
                isSelected={demo.id === selectedDemoId}
                isPlaying={demo.id === selectedDemoId && isPlaying}
                onSelect={setSelectedDemoId}
                onTogglePlay={handleTogglePlay}
                onDelete={handleDeleteDemo}
                onCoverUpload={handleCoverSelect}
                isDeleting={deletingId === demo.id}
              />
            ))}
            {/* "Upload new" ghost card */}
            {!showUploader && !isProcessing && (
              <button
                onClick={() => setShowUploader(true)}
                className="flex-shrink-0 w-36 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-purple-400 flex flex-col items-center justify-center gap-2 py-8 transition-colors text-zinc-500 hover:text-purple-400 bg-zinc-800"
              >
                <Upload size={20} />
                <span className="text-xs font-semibold">Nuevo demo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── ADN cards ── */}
      {stats && (
        <div className="flex flex-col gap-4">

          {/* Resumen visual: Mood · Tonalidad · Géneros */}
          {(() => {
            const mood = deriveMood(stats)
            const key  = detectKey(stats.chroma)
            const gens = suggestGenres(stats)
            return (
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
            )
          })()}

          {/* Reproductor del demo seleccionado — custom dark */}
          {audioUrl && (
            <div className="bg-zinc-800 rounded-2xl p-4 border border-white/8">
              <p className="text-zinc-100 text-sm font-semibold truncate mb-2">
                {selectedDemo?.nombre ?? 'Demo'}
              </p>
              <AudioPlayer
                key={audioUrl}
                src={audioUrl}
                audioRef={audioRef}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}

          {/* Selected demo label + toggle */}
          <div className="flex items-center justify-between px-1">
            {selectedDemo ? (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <p className="text-zinc-400 text-xs font-medium">
                  Analizando: <span className="text-zinc-200 font-semibold">{selectedDemo.nombre}</span>
                </p>
              </div>
            ) : <div />}

            {/* Simple / Técnico toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold transition-colors ${simpleView ? 'text-white' : 'text-zinc-500'}`}>
                Simple
              </span>
              <button
                onClick={toggleView}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${simpleView ? 'bg-zinc-700' : 'bg-purple-600'}`}
                aria-label="Cambiar vista"
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${simpleView ? 'translate-x-0.5' : 'translate-x-5'}`} />
              </button>
              <span className={`text-xs font-semibold transition-colors ${!simpleView ? 'text-white' : 'text-zinc-500'}`}>
                Técnico
              </span>
            </div>
          </div>

          {/* Vista Simple */}
          {simpleView && <SimpleView stats={stats} />}

          {/* Vista Técnica */}
          {!simpleView && (
            <div key="tecnico" className="adn-fade-in grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Parámetros principales — full width */}
              <div className="lg:col-span-2">
                <AnaCard title="Parámetros de audio">
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox label="BPM"     value={stats.bpm}     accent />
                    <StatBox label="Brillo"  value={stats.brillo}  unit="%" />
                    <StatBox label="Energía" value={stats.energia} unit="%" />
                  </div>
                </AnaCard>
              </div>

              {/* Descriptores Sonoros */}
              <AnaCard title="Descriptores Sonoros">
                <div className="flex flex-col gap-4">
                  <DescriptorBar
                    label="Densidad Rítmica"
                    value={stats.densidadRitmica}
                    color="#f97316"
                    description="BPM y presencia percusiva — qué tan 'pulsante' es el sonido"
                  />
                  <DescriptorBar
                    label="Brillo Espectral"
                    value={stats.brilloEspectral}
                    color="#06b6d4"
                    description="Contenido de altas frecuencias — agresividad y ataque del timbre"
                  />
                  <DescriptorBar
                    label="Riqueza Armónica"
                    value={stats.riquezaArmonica}
                    color="#7c3aed"
                    description="Componente melódico y diversidad de notas (HPSS + Chroma)"
                  />
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  {TextureIcon && <TextureIcon size={13} className="text-zinc-500 flex-shrink-0" />}
                  <p className="text-zinc-500 text-xs">
                    Textura general: <span className="font-medium text-zinc-300">{stats.texture.label}</span>
                  </p>
                </div>
              </AnaCard>

              {/* HPSS */}
              <AnaCard title="Presencia rítmica vs. melódica (HPSS)">
                <div className="flex flex-col gap-3">
                  <HpsBar label="Melódico / Armónico" pct={stats.harmonyPct}    color="#7c3aed" />
                  <HpsBar label="Rítmico / Percusivo"  pct={stats.percussivePct} color="#f97316" />
                </div>
                <p className="text-zinc-500 text-xs mt-3">
                  {stats.fromServer
                    ? 'Separación armónica/percusiva calculada por Librosa (HPSS) en el servidor.'
                    : 'Aproximación a partir del contenido de Chroma STFT.'}
                </p>
              </AnaCard>

              {/* Chroma — full width abajo */}
              <div className="lg:col-span-2">
                <AnaCard title="Distribución de notas musicales">
                  <ChromaChart chroma={stats.chroma} />
                  <p className="text-zinc-500 text-xs mt-3">
                    Intensidad de cada nota en el rango cromático completo (Chroma STFT).
                  </p>
                </AnaCard>
              </div>
            </div>
          )}

          {/* ── Top 3 Músicos compatibles ── */}
          {compatibles.length > 0 && (
            <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-purple-400" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Músicos compatibles
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Los 3 más afines a tu sonido{user?.ciudad ? ` en ${user.ciudad}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {compatibles.map((m) => (
                  <QuickMatchCard
                    key={m.id}
                    musico={m}
                    onConnect={(musico) => navigate(`/messages?with=${musico.id}&nombre=${encodeURIComponent(musico.nombre)}`)}
                    onOpenProfile={(musico) => setSelectedMusico(musico)}
                  />
                ))}
              </div>
              <button
                onClick={() => navigate('/explore')}
                className="mt-4 w-full text-center text-purple-300 text-xs font-semibold hover:text-purple-200 transition-colors"
              >
                Ver todos en Explorar →
              </button>
            </div>
          )}

        </div>
      )}

      {/* No analysis yet */}
      {!stats && !isProcessing && (
        <div className="bg-zinc-800 rounded-2xl p-8 border border-white/8 shadow-sm text-center">
          <Music2 size={32} className="text-zinc-500 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm font-medium">
            {demos.length > 0
              ? 'El demo seleccionado aún no tiene análisis'
              : 'Aún no tienes demos analizados'}
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            {demos.length > 0
              ? 'Espera a que el procesamiento termine o sube un nuevo demo.'
              : 'Sube tu primer demo para ver tu ADN musical completo.'}
          </p>
        </div>
      )}
    </div>
  )
}
