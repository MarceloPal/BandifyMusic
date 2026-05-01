import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Upload, CheckCircle, XCircle, Loader2, Music2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'

export default function Dashboard() {
  const { token, user, updateUser } = useAuth()
  const [jobId, setJobId]           = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef                = useRef(null)

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploadRes = await fetch(`${API_URL}/audio/upload-url`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!uploadRes.ok) throw new Error('No se pudo obtener la URL de subida')
      const uploadData = await uploadRes.json()

      await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: file,
      })

      const analyzeRes = await fetch(`${API_URL}/audio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ s3Key: uploadData.s3Key }),
      })
      if (!analyzeRes.ok) throw new Error('Error al iniciar el análisis')
      return analyzeRes.json()
    },
    onSuccess: (data) => setJobId(data.jobId),
  })

  const { data: jobData } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/audio/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' ? 2000 : false
    },
    staleTime: 0,
  })

  useEffect(() => {
    if (jobData?.status !== 'done') return
    fetch(`${API_URL}/usuarios/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((perfil) => { if (perfil?.id) updateUser(perfil) })
      .catch(() => {})
  }, [jobData?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile  = (file) => { if (!file) return; uploadMutation.mutate(file) }
  const handleDrop  = (e)    => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }
  const handleReset = ()     => { setJobId(null); uploadMutation.reset() }

  const isProcessing = uploadMutation.isPending || jobData?.status === 'processing'
  const isDone       = jobData?.status === 'done'
  const isError      = jobData?.status === 'error' || uploadMutation.isError

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h1 className="text-3xl font-bold text-stone-900 mb-1">Estudio de Análisis</h1>
      <p className="text-stone-500 text-sm mb-8">Sube tu track y deja que la IA descubra tu estilo.</p>

      {/* ── Zona de carga ── */}
      <div
        className={`border-2 border-dashed rounded-2xl py-20 px-8 flex flex-col items-center justify-center cursor-pointer transition-all select-none ${
          isDragging
            ? 'border-stone-400 bg-stone-100'
            : 'border-stone-300 hover:border-stone-400 bg-white'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !isProcessing && !isError && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {isProcessing ? (
          <>
            <Loader2 size={40} className="text-stone-400 animate-spin mb-4" />
            <p className="text-stone-800 font-semibold">Analizando tu demo...</p>
            <p className="text-stone-400 text-sm mt-1">Esto puede tomar unos momentos</p>
          </>
        ) : isDone ? (
          <>
            <CheckCircle size={40} className="text-green-500 mb-4" />
            <p className="text-stone-800 font-semibold">¡Análisis completado!</p>
            <p className="text-stone-400 text-sm mt-1">Tu perfil musical ya está activo</p>
          </>
        ) : isError ? (
          <>
            <XCircle size={40} className="text-red-400 mb-4" />
            <p className="text-stone-800 font-semibold">Hubo un error</p>
            <p className="text-stone-400 text-sm mt-1">Intenta con otro archivo</p>
            <button
              onClick={(e) => { e.stopPropagation(); handleReset() }}
              className="mt-5 px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-700 transition-colors"
            >
              Subir de nuevo
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
              <Upload size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-800 font-semibold">Arrastra tu archivo aquí</p>
            <p className="text-stone-400 text-sm mt-1">.mp3, .wav — máx 20 MB</p>
            <p className="text-stone-400 text-xs mt-3">o haz clic para seleccionar</p>
          </>
        )}
      </div>

      {/* ── Tarjeta de resultado ── */}
      {isDone && (
        <div className="mt-5 bg-white rounded-2xl p-5 border border-green-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Music2 size={16} className="text-green-600" />
            <p className="text-stone-900 font-semibold text-sm">Tu ADN Musical fue detectado</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {user?.instrumento && <Badge text={user.instrumento} color="purple" />}
            {user?.ciudad      && <Badge text={user.ciudad}      color="blue"   />}
            <Badge text="Audio analizado ✓" color="green" />
          </div>
          <Link
            to="/profile"
            className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
          >
            Ver mi perfil musical <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}

function Badge({ text, color }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    blue:   'bg-blue-50   text-blue-700   border-blue-200',
    green:  'bg-green-50  text-green-700  border-green-200',
    gray:   'bg-stone-100 text-stone-600  border-stone-200',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[color] ?? colors.gray}`}>
      {text}
    </span>
  )
}
