import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Upload, CheckCircle, XCircle, Loader2, Music, SkipForward } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'
import { OFICIOS, TAG_OPTIONS, MAX_TAGS, CIUDADES_CHILE } from '../utils/audioHelpers'
import Stepper, { Step } from '../components/Stepper'
import SoftAurora from '../components/SoftAurora'
import { useProgressMessage } from '../hooks/useProgressMessage'

const MAX_FILE_MB   = 60
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024

/** Maps file extension → S3 Content-Type */
const AUDIO_MIME = {
  mp3:  'audio/mpeg',
  wav:  'audio/wav',
  ogg:  'audio/ogg',
  m4a:  'audio/mp4',
  flac: 'audio/flac',
  alac: 'audio/mp4',
}

/** Pill-style multi-select tag button. Soporta estado deshabilitado (límite). */
function TagPill({ label, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
        selected
          ? 'bg-[#5227FF] border-[#5227FF] text-white'
          : disabled
          ? 'bg-white/4 border-white/8 text-white/25 cursor-not-allowed'
          : 'bg-white/8 border-white/15 text-white/60 hover:border-white/40 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

export default function Onboarding() {
  const { user, token, updateUser } = useAuth()
  const navigate              = useNavigate()

  // Step 1: Ciudad
  const [ciudad,    setCiudad]    = useState('')
  // Step 2: Rol (oficio — multiple)
  const [oficio,    setOficio]    = useState([])
  // Step 3: Estilo musical (user_tags — multiple)
  const [userTags,  setUserTags]  = useState([])

  // Step 4: Audio upload state
  const [jobId, setJobId]           = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError]   = useState('')
  const fileInputRef                = useRef(null)

  const toggleTag = (list, setList, tag) => {
    setList((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  /**
   * Toggle específico para tags musicales con límite estricto (MAX_TAGS).
   * - Remover una tag siempre se permite (aunque el usuario esté en el límite).
   * - Añadir una tag está bloqueado si ya hay MAX_TAGS seleccionadas.
   */
  const toggleUserTag = (tag) => {
    setUserTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= MAX_TAGS) return prev   // límite alcanzado, no añadir
      return [...prev, tag]
    })
  }

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const ext         = (file.name.split('.').pop() || 'mp3').toLowerCase()
      const audioExt    = AUDIO_MIME[ext] ? ext : 'mp3'
      const contentType = AUDIO_MIME[audioExt]

      const uploadRes = await fetch(`${API_URL}/audio/upload-url?ext=${audioExt}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!uploadRes.ok) throw new Error('No se pudo obtener la URL de subida')
      const { uploadUrl, s3Key } = await uploadRes.json()

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      })

      const analyzeRes = await fetch(`${API_URL}/audio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ s3Key }),
      })
      if (!analyzeRes.ok) throw new Error('Error al iniciar el análisis')
      return analyzeRes.json()
    },
    onSuccess: (data) => setJobId(data.jobId),
  })

  const { data: jobData } = useQuery({
    queryKey: ['onboarding-job', jobId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/audio/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    enabled: !!jobId,
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' ? 5000 : false,
    staleTime: 0,
  })

  // Sync profile when audio analysis finishes
  useEffect(() => {
    if (jobData?.status !== 'done') return
    fetch(`${API_URL}/usuarios/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((perfil) => { if (perfil?.id) updateUser(perfil) })
      .catch(() => {})
  }, [jobData?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // isProcessing covers: upload in flight + first poll not yet returned + IA working
  const isProcessing = uploadMutation.isPending || (!!jobId && jobData?.status !== 'done' && jobData?.status !== 'error')
  const isDone       = jobData?.status === 'done'
  const isError      = jobData?.status === 'error' || uploadMutation.isError

  const progressMsg = useProgressMessage(isProcessing)

  const handleFile = (file) => {
    if (!file) return;
    const limitMB = user?.es_premium ? 100 : 60;
    const limitBytes = limitMB * 1024 * 1024;

    if (file.size > limitBytes) {
      setFileError(`Tu cuenta ${user?.es_premium ? 'Premium' : 'Básica'} permite archivos de hasta ${limitMB} MB. Prueba con un archivo más ligero o actualiza tu plan.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError('');
    uploadMutation.mutate(file)
  }
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }

  // Save ciudad + oficio + user_tags then go to dashboard
  const saveAndFinish = async () => {
    const body = {}
    if (ciudad.trim())   body.ciudad    = ciudad.trim()
    if (oficio.length)   body.oficio    = oficio
    if (userTags.length) body.user_tags = userTags

    if (Object.keys(body).length > 0) {
      try {
        const res = await fetch(`${API_URL}/usuarios/perfil`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok) updateUser(data)
      } catch {
        // Silencio intencional: el guardado del perfil es best-effort.
        // Si falla la red, el usuario puede reintentar desde su perfil.
      }
    }
    toast.success('¡Todo listo! Bienvenido a Bandify 🎸')
    navigate('/mi-adn')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ position: 'relative' }}>

      {/* Aurora de fondo */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <SoftAurora
          speed={0.4} scale={1.6} brightness={0.9}
          color1="#c4b5fd" color2="#5227FF"
          noiseFrequency={2.2} noiseAmplitude={0.8}
          bandHeight={0.5} bandSpread={1.0}
          octaveDecay={0.15} layerOffset={0.3} colorSpeed={0.6}
          enableMouseInteraction={false}
        />
      </div>

      {/* Contenido sobre la aurora */}
      <div className="flex flex-col flex-1" style={{ position: 'relative', zIndex: 1 }}>

        {/* Navbar mínima — solo logo. El botón "Omitir" global se removió:
            los pasos 1-3 (ciudad, oficio, tags) son obligatorios; solo el
            paso 4 (Demo) tiene un botón "Omitir este paso" propio. */}
        <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
          <div className="font-black text-sm tracking-widest text-white">
            BANDIFY
          </div>
        </nav>

        {/* Stepper centrado */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Completa tu perfil</h1>
              <p className="text-white/40 text-sm">Solo toma un momento. El demo es opcional.</p>
            </div>

            <Stepper
              initialStep={1}
              backButtonText="Atrás"
              nextButtonText="Continuar"
              onFinalStepCompleted={saveAndFinish}
              disableFinalStep={isProcessing || (!isDone && !isError)}
            >

              {/* ── Paso 1: Ciudad (dropdown cerrado) ── */}
              <Step>
                <h2>¿Desde dónde tocas?</h2>
                <p>Tu ciudad nos ayuda a conectarte con músicos cercanos.</p>
                <select
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="mt-5 w-full bg-white/8 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#5227FF]/60 border border-white/10 [color-scheme:dark] appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='rgba(255,255,255,0.4)'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1.25rem',
                    paddingRight: '2.5rem',
                  }}
                >
                  <option value="" className="bg-zinc-900 text-white/40">Selecciona tu ciudad...</option>
                  {CIUDADES_CHILE.map((c) => (
                    <option key={c} value={c} className="bg-zinc-900 text-white">{c}</option>
                  ))}
                </select>
              </Step>

              {/* ── Paso 2: Rol ── */}
              <Step>
                <h2>¿Cuál es tu rol?</h2>
                <p>Elige los roles que mejor te describen. Puedes seleccionar más de uno.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {OFICIOS.map((tag) => (
                    <TagPill
                      key={tag}
                      label={tag}
                      selected={oficio.includes(tag)}
                      onClick={() => toggleTag(oficio, setOficio, tag)}
                    />
                  ))}
                </div>
                {oficio.length > 0 && (
                  <p className="mt-3 text-white/40 text-xs">
                    Seleccionado: {oficio.join(', ')}
                  </p>
                )}
              </Step>

              {/* ── Paso 3: Estilo Musical (máx 5 tags) ── */}
              <Step>
                <h2>Estilo Musical</h2>
                <p>¿Con qué géneros se identifica tu sonido? Elige hasta {MAX_TAGS} para que el matching sea preciso.</p>

                {/* Contador de selección */}
                <div className="mt-5 flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold ${
                    userTags.length >= MAX_TAGS ? 'text-[#5227FF]' : 'text-white/50'
                  }`}>
                    Seleccionados: {userTags.length} / {MAX_TAGS}
                  </span>
                  {userTags.length >= MAX_TAGS && (
                    <span className="text-[#5227FF] text-xs">Límite alcanzado</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <TagPill
                      key={tag}
                      label={tag}
                      selected={userTags.includes(tag)}
                      disabled={userTags.length >= MAX_TAGS}
                      onClick={() => toggleUserTag(tag)}
                    />
                  ))}
                </div>
                {userTags.length > 0 && (
                  <p className="mt-3 text-white/40 text-xs">
                    Seleccionado: {userTags.join(', ')}
                  </p>
                )}
              </Step>

              {/* ── Paso 4: ADN Musical ── */}
              <Step>
                <h2>Sube tu demo</h2>
                <p>Nuestra IA analiza 27 características de tu sonido para encontrar tu match perfecto.</p>

                <div
                  className={`mt-5 border-2 border-dashed rounded-2xl py-10 px-6 flex flex-col items-center justify-center cursor-pointer transition-all select-none ${
                    isDragging
                      ? 'border-[#5227FF] bg-[#5227FF]/10'
                      : 'border-white/15 hover:border-white/30 bg-white/3'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => !isProcessing && !isDone && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.wav,.flac,.alac,.m4a,.ogg,audio/*"
                    className="hidden"
                    onChange={(e) => { handleFile(e.target.files[0]); e.target.value = '' }}
                  />

                  {isProcessing ? (
                    <>
                      <Loader2 size={32} className="text-[#5227FF] animate-spin mb-3" />
                      <p className="text-white text-sm font-semibold">{progressMsg.text}</p>
                      <p className="text-white/40 text-xs mt-1">{progressMsg.sub}</p>
                    </>
                  ) : isDone ? (
                    <>
                      <CheckCircle size={32} className="text-green-400 mb-3" />
                      <p className="text-white text-sm font-semibold">¡Análisis completado!</p>
                      <p className="text-white/40 text-xs mt-1">Tu ADN Musical está listo</p>
                    </>
                  ) : isError ? (
                    <>
                      <XCircle size={32} className="text-red-400 mb-3" />
                      <p className="text-white text-sm font-semibold">Hubo un error</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); uploadMutation.reset(); setJobId(null) }}
                        className="mt-3 px-5 py-2 bg-white/10 text-white rounded-full text-xs font-semibold hover:bg-white/20 transition-colors"
                      >
                        Intentar de nuevo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center mb-3">
                        <Upload size={20} className="text-white/50" />
                      </div>
                      <p className="text-white text-sm font-semibold">Arrastra tu archivo aquí</p>
                      <p className="text-white/40 text-xs mt-1">.mp3, .wav, .flac — máx {MAX_FILE_MB} MB</p>
                      <p className="text-white/25 text-xs mt-2">o haz clic para seleccionar</p>
                    </>
                  )}
                </div>

                {fileError && (
                  <p className="text-red-400 text-xs text-center mt-2">{fileError}</p>
                )}

                <p className="text-white/25 text-xs text-center mt-3">
                  {isProcessing
                    ? 'Analizando… el botón Finalizar se activará al terminar.'
                    : isDone
                    ? '¡Análisis listo! Puedes finalizar.'
                    : isError
                    ? 'Hubo un error. Puedes finalizar de todas formas o intentarlo de nuevo.'
                    : 'Sube tu demo o continúa sin él — siempre podrás subirlo después.'}
                </p>

                {/* Botón "Omitir este paso por ahora" — solo en este paso (Demo).
                    Llama a saveAndFinish() para persistir ciudad+oficio+tags antes
                    de redirigir, sin esperar el upload del demo. */}
                {!isProcessing && !isDone && (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={saveAndFinish}
                      className="flex items-center gap-2 text-white/50 hover:text-white text-xs font-semibold transition-colors px-4 py-2 border border-white/10 rounded-full hover:border-white/30"
                    >
                      <SkipForward size={12} />
                      Omitir este paso por ahora
                    </button>
                  </div>
                )}
              </Step>

            </Stepper>
          </div>
        </div>

      </div>{/* /zIndex wrapper */}
    </div>
  )
}
