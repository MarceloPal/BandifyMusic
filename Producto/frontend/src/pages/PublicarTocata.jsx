import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams }      from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Music2, CalendarDays, Clock, MapPin, Tag,
  ImagePlus, AlignLeft, AtSign, Ticket, Users2,
  Loader2, X, Plus, Mail, MessageCircle,
  Check, Eye, EyeOff, Save,
} from 'lucide-react'
import { toast }       from 'sonner'
import { useAuth }     from '../context/AuthContext'
import { API_URL }     from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'

/* ─── Constants ─── */

const GENEROS = [
  'Rock', 'Indie', 'Jazz', 'Punk', 'Metal',
  'Hip-Hop', 'Electrónica', 'Cumbia', 'Folk', 'Reggae',
  'Funk', 'Blues', 'Pop', 'Clásica', 'Otro',
]

const CONTACT_TYPES = [
  { id: 'email',     label: 'Email',     icon: Mail,          placeholder: 'contacto@evento.com', prefix: '' },
  { id: 'instagram', label: 'Instagram', icon: AtSign,        placeholder: 'nombre_del_evento',   prefix: '@' },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageCircle, placeholder: '9 1234 5678',         prefix: '+56 ' },
]

const EDAD_MINIMA_OPTS = [
  { id: 'todo_publico', label: 'Todo público', desc: 'Todas las edades' },
  { id: '+14',          label: '+14 años',     desc: 'Desde los 14'    },
  { id: '+18',          label: '+18 años',     desc: 'Desde los 18'    },
  { id: '+21',          label: '+21 años',     desc: 'Desde los 21'    },
]

// Static color maps — Tailwind needs full class strings, no dynamic construction
const EDAD_STYLES = {
  todo_publico: {
    active:   'border-emerald-500/70 bg-emerald-500/10 shadow-sm shadow-emerald-500/20',
    label:    'text-emerald-300',
    check:    'bg-emerald-500',
  },
  '+14': {
    active:   'border-amber-500/70 bg-amber-500/10 shadow-sm shadow-amber-500/20',
    label:    'text-amber-300',
    check:    'bg-amber-500',
  },
  '+18': {
    active:   'border-orange-500/70 bg-orange-500/10 shadow-sm shadow-orange-500/20',
    label:    'text-orange-300',
    check:    'bg-orange-500',
  },
  '+21': {
    active:   'border-red-500/70 bg-red-500/10 shadow-sm shadow-red-500/20',
    label:    'text-red-300',
    check:    'bg-red-500',
  },
}

const TIPOS_ENTRADA_OPTS = ['Preventa', 'General', 'VIP', 'Early Bird', 'Puerta']

/* ─── Module-level helpers (extracted to avoid nesting complexity) ─── */

function validateTocataForm(form, edadMinima, contactValue, tipoAcceso, tiposEntrada) {
  const errs = {}
  if (!form.nombre.trim())  errs.nombre   = 'El nombre del evento es obligatorio'
  if (!form.fecha)          errs.fecha    = 'La fecha es obligatoria'
  if (!form.hora)           errs.hora     = 'La hora es obligatoria'
  if (!form.ciudad.trim())  errs.ciudad   = 'La ciudad es obligatoria'
  if (!edadMinima)          errs.edad     = 'La edad mínima es obligatoria'
  if (!contactValue.trim()) errs.contacto = 'El contacto es obligatorio'
  if (!tipoAcceso)          errs.acceso   = 'Elige el tipo de acceso'
  if (tipoAcceso === 'paid') {
    if (Object.keys(tiposEntrada).length === 0) {
      errs.tipos = 'Selecciona al menos un tipo de entrada'
    } else {
      Object.keys(tiposEntrada).forEach((tipo) => {
        if (!tiposEntrada[tipo].precio)   errs[`precio_${tipo}`]   = 'Ingresa el precio'
        if (!tiposEntrada[tipo].cantidad) errs[`cantidad_${tipo}`] = 'Ingresa la cantidad'
      })
    }
  }
  return errs
}

async function buildAndSubmitTocata({ token, isEditing, tocataId, contactType, contactValue, form, generos, afficheKey, edadMinima, tipoAcceso, tiposEntrada }) {
  const ct = CONTACT_TYPES.find((c) => c.id === contactType)
  const contactStr = ct?.prefix ? `${ct.prefix}${contactValue}`.trim() : contactValue.trim()

  const tiposArr = TIPOS_ENTRADA_OPTS
    .filter((t) => tiposEntrada[t] !== undefined)
    .map((t) => ({ tipo: t, precio: Number(tiposEntrada[t].precio), cantidad: parseInt(tiposEntrada[t].cantidad) }))

  const minPrecio  = tiposArr.length > 0 ? Math.min(...tiposArr.map((t) => t.precio)) : undefined
  const totalStock = tiposArr.length > 0 ? tiposArr.reduce((s, t) => s + t.cantidad, 0) : undefined

  const body = {
    nombre:              form.nombre.trim(),
    fecha:               form.fecha,
    hora:                form.hora         || undefined,
    ciudad:              form.ciudad.trim(),
    direccion:           form.direccion     || undefined,
    descripcion:         form.descripcion   || undefined,
    genero:              generos.join(', ') || undefined,
    afiche_url:          afficheKey         || undefined,
    contacto_email:      contactStr         || undefined,
    edad_minima:         edadMinima         || undefined,
    tipos_entrada:       tipoAcceso === 'paid' && tiposArr.length > 0 ? tiposArr : undefined,
    precio:              tipoAcceso === 'paid' ? minPrecio    : undefined,
    cantidad_disponible: tipoAcceso === 'paid' ? totalStock   : undefined,
  }

  const url    = isEditing ? `${API_URL}/tocatas/${tocataId}` : `${API_URL}/tocatas`
  const method = isEditing ? 'PATCH' : 'POST'

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || (isEditing ? 'Error al guardar los cambios' : 'Error al publicar la tocata'))
  }
  return res.json()
}

async function fetchUploadedAfiche(file, token) {
  if (!file || !file.type.startsWith('image/')) return null
  const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
  const res = await fetch(`${API_URL}/images/upload-url?type=afiche&ext=${ext}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const { uploadUrl, key } = await res.json()
  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  return { key, previewUrl: URL.createObjectURL(file) }
}

/* ─── Helpers ─── */

function parseContactField(raw) {
  if (raw.startsWith('+56 ')) return { type: 'whatsapp', value: raw.slice(4) }
  if (raw.startsWith('@'))    return { type: 'instagram', value: raw.slice(1) }
  return { type: 'email', value: raw }
}

function buildTiposEntradaMap(tipos) {
  const map = {}
  tipos.forEach(({ tipo, precio, cantidad }) => {
    const p = String(precio ?? '')
    map[tipo] = { precio: p, precioDisplay: p ? Number(p).toLocaleString('es-CL') : '', cantidad: String(cantidad ?? '') }
  })
  return map
}

function hasCompleteAccess(tipoAcceso, tiposEntrada) {
  if (tipoAcceso === 'free') return true
  return Object.keys(tiposEntrada).length > 0 &&
    Object.values(tiposEntrada).every((c) => c.precio && c.cantidad)
}

function toggleTipoReducer(prev, tipo) {
  if (prev[tipo] !== undefined) {
    const next = { ...prev }
    delete next[tipo]
    return next
  }
  return { ...prev, [tipo]: { precio: '', precioDisplay: '', cantidad: '' } }
}

function handleMutationSuccess(data, { isEditing, queryClient, user, navigate, tocataId }) {
  if (isEditing) {
    queryClient.invalidateQueries({ queryKey: ['tocatas'] })
    queryClient.invalidateQueries({ queryKey: ['mis-tocatas'] })
    queryClient.removeQueries({ queryKey: ['tocata-edit', tocataId] })
    navigate('/gestion')
    return
  }
  const enriched = {
    ...data,
    organizador_id:     user?.id,
    organizador_nombre: user?.nombre,
    organizador_email:  user?.email,
  }
  queryClient.setQueryData(['tocatas'], (old = []) => {
    const list = Array.isArray(old) ? old : []
    return [...list, enriched].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  })
  queryClient.invalidateQueries({ queryKey: ['tocatas-publicas'] })
  toast.success('¡Tocata publicada con éxito! Ya aparece en el mapa.')
  navigate('/tocatas', { state: { createdId: data.id } })
}

function formatFechaShort(isoDate) {
  if (!isoDate) return null
  const d = new Date(isoDate + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Field primitives ─── */

function Field({ label, htmlFor, required, error, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-2"
      >
        {label}
        {required && <span className="text-purple-400 ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function Input({ error, className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3.5 rounded-xl border text-zinc-100 text-sm placeholder:text-zinc-600
        focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400/40 transition-all
        ${error
          ? 'border-red-500/50 bg-red-500/8'
          : 'border-zinc-700 bg-zinc-800/80 hover:border-zinc-600'}
        ${className}`}
    />
  )
}

function SectionCard({ icon: Icon, title, hint, children }) {
  return (
    <div className="bg-zinc-800/50 border border-white/6 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-purple-400" />
        </div>
        <div>
          <p className="text-zinc-100 font-bold text-sm">{title}</p>
          {hint && <p className="text-zinc-500 text-xs mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-5 flex flex-col gap-4">
        {children}
      </div>
    </div>
  )
}

/* ─── Progress Bar ─── */

function ProgressStep({ label, status, isLast, optional }) {
  return (
    <div className="flex items-start flex-1 last:flex-initial">
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-6">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
          status === 'complete'
            ? 'bg-purple-600 shadow-md shadow-purple-500/40'
            : status === 'active'
            ? 'ring-2 ring-purple-500 bg-purple-500/15 shadow-sm shadow-purple-500/20'
            : 'bg-zinc-800 ring-1 ring-zinc-700'
        }`}>
          {status === 'complete'
            ? <Check size={11} className="text-white" strokeWidth={3} />
            : status === 'active'
            ? <div className="w-2 h-2 rounded-full bg-purple-400" />
            : null}
        </div>
        <span className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors whitespace-nowrap ${
          status === 'complete' ? 'text-purple-400'
          : status === 'active' ? 'text-zinc-200'
          : 'text-zinc-600'
        }`}>
          {label}
          {optional && status !== 'complete' && (
            <span className="block text-zinc-700 font-normal">opcional</span>
          )}
        </span>
      </div>
      {!isLast && (
        <div className={`h-px flex-1 mt-3 mx-2 transition-all duration-500 ${
          status === 'complete' ? 'bg-gradient-to-r from-purple-500/60 to-purple-500/20' : 'bg-zinc-700/60'
        }`} />
      )}
    </div>
  )
}

function ProgressBar({ sec1, sec2, sec3 }) {
  const allReady = sec1 && sec3

  const steps = [
    { label: 'Básico',   status: sec1 ? 'complete' : 'active',                      optional: false },
    { label: 'Detalles', status: sec2 ? 'complete' : sec1 ? 'active' : 'pending',   optional: true  },
    { label: 'Acceso',   status: sec3 ? 'complete' : sec1 ? 'active' : 'pending',   optional: false },
    { label: 'Publicar', status: allReady ? 'active' : 'pending',                   optional: false },
  ]

  return (
    <div className="flex items-start gap-0 py-1">
      {steps.map((step, i) => (
        <ProgressStep
          key={step.label}
          label={step.label}
          status={step.status}
          optional={step.optional}
          isLast={i === steps.length - 1}
        />
      ))}
    </div>
  )
}

/* ─── Live Preview Card ─── */

function PreviewCard({ form, generos, affichePreview, tipoAcceso, tiposEntrada, edadMinima }) {
  const fechaFmt = formatFechaShort(form.fecha)
  const hasAnyData = form.nombre || form.ciudad || form.fecha || affichePreview

  // Compute minimum price across all ticket types for preview
  const tiposArr = TIPOS_ENTRADA_OPTS.filter(t => tiposEntrada[t] !== undefined)
  const prices = tiposArr.map(t => Number(tiposEntrada[t].precio)).filter(p => p > 0)
  const minPrecio = prices.length > 0 ? Math.min(...prices) : null
  const minPrecioDisplay = minPrecio !== null ? minPrecio.toLocaleString('es-CL') : null

  const edadOpt = edadMinima ? EDAD_MINIMA_OPTS.find(o => o.id === edadMinima) : null

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-800 shadow-xl shadow-black/30">

      {/* Afiche area */}
      <div className="h-44 relative overflow-hidden bg-zinc-800">
        {affichePreview ? (
          <img src={affichePreview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-950/60 via-zinc-900 to-zinc-800 flex flex-col items-center justify-center gap-2">
            <Music2 size={28} className="text-zinc-700" />
            <p className="text-zinc-700 text-xs font-medium">Sin afiche</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute top-3 left-3">
          <span className="bg-zinc-900/80 backdrop-blur-sm text-purple-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-purple-400" />
            Comunidad
          </span>
        </div>

        {generos.length > 0 && (
          <div className="absolute top-3 right-3">
            <span className="bg-white/90 backdrop-blur-sm text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {generos[0]}{generos.length > 1 ? ` +${generos.length - 1}` : ''}
            </span>
          </div>
        )}

        {fechaFmt && (
          <div className="absolute bottom-3 left-3">
            <span className="text-white text-xs font-bold drop-shadow">{fechaFmt}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <h3 className={`font-bold text-base leading-tight line-clamp-2 transition-colors ${
          form.nombre ? 'text-zinc-100' : 'text-zinc-600 italic'
        }`}>
          {form.nombre || 'Nombre del evento'}
        </h3>

        <div className="flex items-center gap-1.5 text-xs">
          <MapPin size={10} className="text-zinc-500 flex-shrink-0" />
          <span className={[form.direccion, form.ciudad].filter(Boolean).length ? 'text-zinc-400' : 'text-zinc-600 italic'}>
            {[form.direccion, form.ciudad].filter(Boolean).join(' · ') || 'Ciudad'}
          </span>
        </div>

        {form.hora && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock size={10} className="flex-shrink-0" />
            <span>{form.hora.slice(0, 5)}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-1">
          {tipoAcceso === 'free' && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Entrada liberada
            </span>
          )}
          {tipoAcceso === 'paid' && minPrecioDisplay && (
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              Desde ${minPrecioDisplay}
            </span>
          )}
          {tipoAcceso === 'paid' && !minPrecioDisplay && (
            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-700/40 border border-zinc-700 px-2 py-0.5 rounded-full">
              Con venta de entradas
            </span>
          )}
          {edadOpt && edadOpt.id !== 'todo_publico' && (
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-700/60 border border-zinc-600 px-2 py-0.5 rounded-full">
              {edadOpt.label}
            </span>
          )}
        </div>

        {!hasAnyData && (
          <p className="text-zinc-600 text-xs italic mt-1">
            Tu evento aparecerá aquí a medida que lo completes
          </p>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════
   Página principal
════════════════════════════════════ */

export default function PublicarTocata() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const { token, user } = useAuth()
  const { id: tocataId } = useParams()
  const isEditing   = Boolean(tocataId)
  const afficheRef  = useRef(null)

  /* ── Edit mode: fetch existing tocata ── */
  const { data: editTocata } = useQuery({
    queryKey: ['tocata-edit', tocataId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tocatas/${tocataId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No encontrada')
      return res.json()
    },
    enabled: isEditing && !!token,
    staleTime: Infinity,
  })

  const { url: existingAfficheUrl } = useImageUrl(editTocata?.afiche_url ?? null)

  /* ── form state ── */
  const [form, setForm] = useState({
    nombre: '', fecha: '', hora: '', ciudad: '', direccion: '', descripcion: '',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const [generos, setGeneros] = useState([])
  const toggleGenero = (g) =>
    setGeneros((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])

  const [afficheKey, setAfficheKey]         = useState(null)
  const [affichePreview, setAffichePreview] = useState(null)
  const [afficheLoading, setAfficheLoading] = useState(false)
  const [isDragging, setIsDragging]         = useState(false)

  const [contactType, setContactType]   = useState('email')
  const [contactValue, setContactValue] = useState('')

  const [edadMinima, setEdadMinima]     = useState(null)

  const [tipoAcceso, setTipoAcceso]     = useState(null)

  // { 'General': { precio: '6000', precioDisplay: '6.000', cantidad: '100' } }
  const [tiposEntrada, setTiposEntrada] = useState({})

  const [errors, setErrors]           = useState({})
  const [previewOpen, setPreviewOpen] = useState(false)

  /* ── Pre-populate state when editing ── */
  useEffect(() => {
    if (!editTocata) return
    setForm({
      nombre:      editTocata.nombre      ?? '',
      fecha:       editTocata.fecha       ?? '',
      hora:        (editTocata.hora       ?? '').slice(0, 5),
      ciudad:      editTocata.ciudad      ?? '',
      direccion:   editTocata.direccion   ?? '',
      descripcion: editTocata.descripcion ?? '',
    })
    if (editTocata.genero) setGeneros(editTocata.genero.split(', ').filter(Boolean))
    if (editTocata.afiche_url) setAfficheKey(editTocata.afiche_url)
    if (editTocata.contacto_email) {
      const { type, value } = parseContactField(editTocata.contacto_email)
      setContactType(type)
      setContactValue(value)
    }
    if (editTocata.edad_minima) setEdadMinima(editTocata.edad_minima)
    const tipos = Array.isArray(editTocata.tipos_entrada) ? editTocata.tipos_entrada : []
    if (tipos.length > 0) {
      setTipoAcceso('paid')
      setTiposEntrada(buildTiposEntradaMap(tipos))
    } else {
      setTipoAcceso('free')
    }
  }, [editTocata])

  useEffect(() => {
    if (existingAfficheUrl && !affichePreview) {
      setAffichePreview(existingAfficheUrl)
    }
  }, [existingAfficheUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── ticket type helpers ── */
  const toggleTipo = (tipo) => setTiposEntrada((prev) => toggleTipoReducer(prev, tipo))

  const setTipoPrecio = (tipo, raw) => {
    const digits = raw.replace(/\D/g, '')
    setTiposEntrada((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        precio:        digits,
        precioDisplay: digits ? Number(digits).toLocaleString('es-CL') : '',
      },
    }))
  }

  const setTipoCantidad = (tipo, val) => {
    setTiposEntrada((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], cantidad: val },
    }))
  }

  /* ── progress ── */
  const sec1Complete = Boolean(form.nombre.trim() && form.fecha && form.hora && form.ciudad.trim())
  const sec2Complete = Boolean(generos.length > 0 || affichePreview || form.descripcion.trim())
  const sec3Complete = Boolean(contactValue.trim() && tipoAcceso && edadMinima && hasCompleteAccess(tipoAcceso, tiposEntrada))

  /* ── afiche upload ── */
  const uploadAfiche = async (file) => {
    setAfficheLoading(true)
    try {
      const result = await fetchUploadedAfiche(file, token)
      if (result) { setAfficheKey(result.key); setAffichePreview(result.previewUrl) }
    } catch { /* silently ignore */ }
    finally { setAfficheLoading(false) }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    uploadAfiche(e.dataTransfer.files?.[0])
  }

  /* ── mutation ── */
  const mutation = useMutation({
    mutationFn: () => buildAndSubmitTocata({ token, isEditing, tocataId, contactType, contactValue, form, generos, afficheKey, edadMinima, tipoAcceso, tiposEntrada }),
    onSuccess: (data) => handleMutationSuccess(data, { isEditing, queryClient, user, navigate, tocataId }),
  })

  /* ── validation ── */
  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validateTocataForm(form, edadMinima, contactValue, tipoAcceso, tiposEntrada)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    mutation.mutate()
  }

  const currentContact = CONTACT_TYPES.find((c) => c.id === contactType)

  /* ════ render ════ */
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 pb-28">

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Page header ── */}
        <div className="mb-8">

          <button
            type="button"
            onClick={() => navigate(isEditing ? '/gestion' : '/tocatas')}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors mb-5"
          >
            <ChevronLeft size={16} />
            {isEditing ? 'Volver a Gestión' : 'Volver a Tocatas'}
          </button>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
              <Music2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">
                {isEditing ? 'Editar tocata' : 'Publicar tocata'}
              </h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                {isEditing ? 'Actualiza la información del evento' : 'Comparte tu evento con la comunidad Bandify'}
              </p>
            </div>
          </div>

          <ProgressBar sec1={sec1Complete} sec2={sec2Complete} sec3={sec3Complete} />
        </div>

        {/* ── Mobile preview toggle ── */}
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex items-center gap-2 text-zinc-500 hover:text-purple-400 text-xs font-semibold transition-colors px-3 py-2 rounded-xl border border-zinc-700 hover:border-purple-500/50 bg-zinc-800/60"
          >
            {previewOpen ? <EyeOff size={13} /> : <Eye size={13} />}
            {previewOpen ? 'Ocultar vista previa' : 'Ver vista previa del evento'}
          </button>

          {previewOpen && (
            <div className="mt-4 max-w-xs">
              <PreviewCard
                form={form}
                generos={generos}
                affichePreview={affichePreview}
                tipoAcceso={tipoAcceso}
                tiposEntrada={tiposEntrada}
                edadMinima={edadMinima}
              />
            </div>
          )}
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-8 items-start">

          {/* ════ LEFT: Form ════ */}
          <div className="flex flex-col gap-6">

            {/* §1 Información básica */}
            <SectionCard
              icon={CalendarDays}
              title="Información básica"
              hint="Datos principales que verán los asistentes"
            >
              {/* Nombre */}
              <Field label="Nombre del evento" htmlFor="nombre" required error={errors.nombre}>
                <Input
                  id="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Ej: Noche de Jazz Vol. 4"
                  autoComplete="off"
                  error={errors.nombre}
                />
              </Field>

              {/* Afiche — zona drag & drop */}
              <Field label="Afiche del evento" htmlFor="afiche-zone">
                <input
                  ref={afficheRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Subir afiche"
                  onChange={(e) => uploadAfiche(e.target.files[0])}
                />
                <div
                  id="afiche-zone"
                  role="button"
                  tabIndex={0}
                  aria-label="Zona para subir afiche"
                  onClick={() => !afficheLoading && afficheRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && afficheRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative w-full rounded-2xl border-2 border-dashed transition-all overflow-hidden cursor-pointer
                    ${isDragging
                      ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
                      : affichePreview
                      ? 'border-zinc-600 hover:border-purple-400/60'
                      : 'border-zinc-700 hover:border-purple-400/60 bg-zinc-800/60 hover:bg-zinc-800'}
                    ${affichePreview ? 'h-52' : 'h-36'}`}
                >
                  {affichePreview ? (
                    <>
                      <img src={affichePreview} alt="Preview afiche" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <ImagePlus size={20} className="text-white" />
                        <span className="text-white text-xs font-semibold">Cambiar imagen</span>
                      </div>
                      <button
                        type="button"
                        aria-label="Quitar afiche"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAffichePreview(null)
                          setAfficheKey(null)
                        }}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                      >
                        <X size={13} className="text-white" />
                      </button>
                    </>
                  ) : afficheLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2.5">
                      <Loader2 size={20} className="animate-spin text-purple-400" />
                      <span className="text-zinc-400 text-sm font-medium">Subiendo imagen...</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 text-zinc-600 select-none px-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-purple-500/20' : 'bg-zinc-700/60'}`}>
                        <ImagePlus size={20} className={isDragging ? 'text-purple-400' : 'text-zinc-500'} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm">
                          <span className="text-purple-400 font-semibold">Haz clic</span>
                          {' '}o arrastra una imagen aquí
                        </p>
                        <p className="text-zinc-600 text-xs mt-0.5">JPG, PNG, WEBP · Opcional · Recomendado: 1200×630 px</p>
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {/* Fecha + Hora */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha" htmlFor="fecha" required error={errors.fecha}>
                  <Input
                    id="fecha"
                    type="date"
                    value={form.fecha}
                    onChange={(e) => set('fecha', e.target.value)}
                    className="px-3"
                    error={errors.fecha}
                  />
                </Field>
                <Field label="Hora" htmlFor="hora" required error={errors.hora}>
                  <Input
                    id="hora"
                    type="time"
                    value={form.hora}
                    onChange={(e) => set('hora', e.target.value)}
                    className="px-3"
                    error={errors.hora}
                  />
                </Field>
              </div>

              {/* Ciudad */}
              <Field label="Ciudad" htmlFor="ciudad" required error={errors.ciudad}>
                <Input
                  id="ciudad"
                  type="text"
                  value={form.ciudad}
                  onChange={(e) => set('ciudad', e.target.value)}
                  placeholder="Ej: Santiago"
                  autoComplete="address-level2"
                  error={errors.ciudad}
                />
              </Field>

              {/* Dirección */}
              <Field label="Lugar / Dirección" htmlFor="direccion">
                <Input
                  id="direccion"
                  type="text"
                  value={form.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  placeholder="Ej: Club Chocolate, Av. Italia 1234"
                />
              </Field>
            </SectionCard>

            {/* §2 Género */}
            <SectionCard icon={Tag} title="Género musical" hint="Selecciona uno o varios géneros · Opcional">
              <div className="flex flex-wrap gap-2">
                {GENEROS.map((g) => {
                  const active = generos.includes(g)
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenero(g)}
                      aria-pressed={active}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-150 ${
                        active
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/25'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-purple-500/50 hover:text-zinc-200'
                      }`}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
              {generos.length > 0 && (
                <p className="text-zinc-500 text-xs">
                  Seleccionados: <span className="text-purple-400 font-medium">{generos.join(', ')}</span>
                </p>
              )}
            </SectionCard>

            {/* §3 Descripción */}
            <SectionCard icon={AlignLeft} title="Descripción" hint="Cuéntale a la comunidad sobre el evento · Opcional">
              <textarea
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Artistas que se presentan, ambiente del lugar, qué esperar..."
                rows={4}
                className="w-full px-4 py-3.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:border-zinc-600
                  text-zinc-100 text-sm placeholder:text-zinc-600
                  focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400/40
                  resize-none transition-all"
              />
            </SectionCard>

            {/* §4 Contacto */}
            <SectionCard icon={AtSign} title="Contacto" hint="Los asistentes usarán este dato para resolver dudas">

              <div className="flex gap-2">
                {CONTACT_TYPES.map((ct) => {
                  const Icon   = ct.icon
                  const active = contactType === ct.id
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => { setContactType(ct.id); setContactValue('') }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        active
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/20'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-purple-500/40 hover:text-zinc-200'
                      }`}
                    >
                      <Icon size={13} />
                      {ct.label}
                    </button>
                  )
                })}
              </div>

              <Field label={currentContact.label} htmlFor="contacto" required error={errors.contacto}>
                <div className={`flex items-center rounded-xl border transition-all overflow-hidden
                  focus-within:ring-2 focus-within:ring-purple-400/60 focus-within:border-purple-400/40
                  ${errors.contacto ? 'border-red-500/50 bg-red-500/8' : 'border-zinc-700 bg-zinc-800/80 hover:border-zinc-600'}`}
                >
                  {currentContact.prefix && (
                    <span className="pl-4 pr-1 text-zinc-400 font-semibold text-sm select-none flex-shrink-0">
                      {currentContact.prefix}
                    </span>
                  )}
                  <input
                    id="contacto"
                    type={contactType === 'email' ? 'email' : 'text'}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    placeholder={currentContact.placeholder}
                    autoComplete={contactType === 'email' ? 'email' : 'off'}
                    className={`flex-1 py-3.5 bg-transparent text-zinc-100 text-sm placeholder:text-zinc-600
                      focus:outline-none
                      ${currentContact.prefix ? 'pr-4' : 'px-4'}`}
                  />
                </div>
              </Field>
            </SectionCard>

            {/* §5 Edad mínima */}
            <SectionCard icon={Users2} title="Edad mínima" hint="Define quién puede asistir al evento">

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EDAD_MINIMA_OPTS.map((opt) => {
                  const active = edadMinima === opt.id
                  const styles = EDAD_STYLES[opt.id]
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEdadMinima(opt.id)}
                      aria-pressed={active}
                      className={`relative flex flex-col items-center gap-1 py-3.5 px-2 rounded-xl border-2 transition-all duration-200 ${
                        active
                          ? styles.active
                          : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500 hover:bg-zinc-800'
                      }`}
                    >
                      <span className={`text-sm font-black leading-none transition-colors ${
                        active ? styles.label : 'text-zinc-200'
                      }`}>
                        {opt.label}
                      </span>
                      <span className={`text-[10px] leading-none transition-colors ${
                        active ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>
                        {opt.desc}
                      </span>
                      {active && (
                        <div className={`absolute top-2 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center ${styles.check}`}>
                          <Check size={8} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {errors.edad && (
                <p role="alert" className="text-red-400 text-xs flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                  {errors.edad}
                </p>
              )}
            </SectionCard>

            {/* §6 Tipo de acceso */}
            <SectionCard icon={Ticket} title="Tipo de acceso" hint="¿El evento es gratuito o tiene venta de entradas?">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Gratuito */}
                <button
                  type="button"
                  onClick={() => { setTipoAcceso('free'); setTiposEntrada({}) }}
                  className={`relative group flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    tipoAcceso === 'free'
                      ? 'border-emerald-500/70 bg-emerald-500/10 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/20'
                      : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                    tipoAcceso === 'free' ? 'bg-emerald-500/15 scale-110' : 'bg-zinc-700/60'
                  }`}>
                    🎉
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm transition-colors ${tipoAcceso === 'free' ? 'text-emerald-300' : 'text-zinc-200'}`}>
                      Evento gratuito
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">Sin cobro de acceso</p>
                  </div>
                  {tipoAcceso === 'free' && (
                    <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* Pagado */}
                <button
                  type="button"
                  onClick={() => setTipoAcceso('paid')}
                  className={`relative group flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    tipoAcceso === 'paid'
                      ? 'border-purple-500/70 bg-purple-500/10 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/20'
                      : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                    tipoAcceso === 'paid' ? 'bg-purple-500/15 scale-110' : 'bg-zinc-700/60'
                  }`}>
                    🎟
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm transition-colors ${tipoAcceso === 'paid' ? 'text-purple-300' : 'text-zinc-200'}`}>
                      Venta de entradas
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">Define precio y stock por tipo</p>
                  </div>
                  {tipoAcceso === 'paid' && (
                    <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              </div>

              {errors.acceso && (
                <p role="alert" className="text-red-400 text-xs flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                  {errors.acceso}
                </p>
              )}

              {/* Ticket type selector — solo cuando es pagado */}
              {tipoAcceso === 'paid' && (
                <div className="flex flex-col gap-4 pt-4 border-t border-white/6">

                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#009EE3] flex-shrink-0" />
                    <p className="text-zinc-500 text-xs">
                      Pagos procesados de forma segura vía{' '}
                      <span className="text-[#009EE3] font-semibold">MercadoPago</span>
                    </p>
                  </div>

                  {/* Tipo chips */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2.5">
                      Tipos de entrada
                      <span className="text-purple-400 ml-0.5" aria-hidden>*</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TIPOS_ENTRADA_OPTS.map((tipo) => {
                        const active = tiposEntrada[tipo] !== undefined
                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => toggleTipo(tipo)}
                            aria-pressed={active}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                              active
                                ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/25'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-purple-500/50 hover:text-zinc-200'
                            }`}
                          >
                            {active && <Check size={11} strokeWidth={3} />}
                            {tipo}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {errors.tipos && (
                    <p role="alert" className="text-red-400 text-xs flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      {errors.tipos}
                    </p>
                  )}

                  {/* Expanded cards por tipo seleccionado */}
                  {TIPOS_ENTRADA_OPTS.filter((t) => tiposEntrada[t] !== undefined).map((tipo) => (
                    <div
                      key={tipo}
                      className="bg-zinc-900/70 border border-purple-500/20 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                            <Check size={8} className="text-white" strokeWidth={3} />
                          </div>
                          <span className="text-sm font-bold text-zinc-100">{tipo}</span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Quitar tipo ${tipo}`}
                          onClick={() => toggleTipo(tipo)}
                          className="w-6 h-6 rounded-full bg-zinc-700 hover:bg-red-500/60 flex items-center justify-center transition-colors group"
                        >
                          <X size={11} className="text-zinc-400 group-hover:text-white transition-colors" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Precio */}
                        <Field label="Precio (CLP)" required error={errors[`precio_${tipo}`]}>
                          <div className={`flex items-center rounded-xl border transition-all overflow-hidden
                            focus-within:ring-2 focus-within:ring-purple-400/60 focus-within:border-purple-400/40
                            ${errors[`precio_${tipo}`]
                              ? 'border-red-500/50 bg-red-500/8'
                              : 'border-zinc-700 bg-zinc-800/80 hover:border-zinc-600'}`}
                          >
                            <span className="pl-3 pr-1.5 text-zinc-400 font-bold text-sm select-none flex-shrink-0">$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tiposEntrada[tipo].precioDisplay}
                              onChange={(e) => setTipoPrecio(tipo, e.target.value)}
                              placeholder="5.000"
                              className="flex-1 py-3 min-w-0 bg-transparent text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none"
                            />
                          </div>
                        </Field>

                        {/* Cantidad */}
                        <Field label="Cantidad" required error={errors[`cantidad_${tipo}`]}>
                          <div className="relative">
                            <Users2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={tiposEntrada[tipo].cantidad}
                              onChange={(e) => setTipoCantidad(tipo, e.target.value)}
                              placeholder="100"
                              className={`w-full pl-8 pr-3 py-3 rounded-xl border text-zinc-100 text-sm placeholder:text-zinc-600
                                focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400/40 transition-all
                                ${errors[`cantidad_${tipo}`]
                                  ? 'border-red-500/50 bg-red-500/8'
                                  : 'border-zinc-700 bg-zinc-800/80 hover:border-zinc-600'}`}
                            />
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Error global */}
            {mutation.isError && (
              <div className="px-4 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
                <X size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm leading-relaxed">{mutation.error?.message}</p>
              </div>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={mutation.isPending || afficheLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.99] disabled:opacity-50
                text-white font-black py-4 rounded-2xl text-base transition-all
                flex items-center justify-center gap-2.5
                shadow-xl shadow-purple-500/25
                focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              {mutation.isPending ? (
                <><Loader2 size={18} className="animate-spin" /> {isEditing ? 'Guardando cambios...' : 'Publicando tocata...'}</>
              ) : isEditing ? (
                <><Save size={18} /> Guardar cambios</>
              ) : (
                <><Plus size={18} /> Publicar tocata</>
              )}
            </button>

            <p className="text-zinc-700 text-xs text-center">
              Los campos con <span className="text-purple-400/70">*</span> son obligatorios
            </p>

          </div>{/* /left column */}

          {/* ════ RIGHT: Sticky preview (desktop only) ════ */}
          <div className="hidden lg:block">
            <div className="sticky top-28">

              <div className="flex items-center gap-2 mb-3">
                <Eye size={12} className="text-zinc-500" />
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                  Vista previa
                </p>
              </div>

              <PreviewCard
                form={form}
                generos={generos}
                affichePreview={affichePreview}
                tipoAcceso={tipoAcceso}
                tiposEntrada={tiposEntrada}
                edadMinima={edadMinima}
              />

              <p className="text-zinc-700 text-[11px] text-center mt-3 leading-relaxed">
                Así aparecerá tu evento en el tablón de Tocatas
              </p>

              {/* Progress summary */}
              {(sec1Complete || sec3Complete) && (
                <div className="mt-4 p-3.5 bg-zinc-800/60 border border-white/6 rounded-2xl flex flex-col gap-2">
                  {[
                    { label: 'Nombre',        done: Boolean(form.nombre.trim()) },
                    { label: 'Fecha y hora',  done: Boolean(form.fecha && form.hora) },
                    { label: 'Ciudad',        done: Boolean(form.ciudad.trim()) },
                    { label: 'Edad mínima',   done: Boolean(edadMinima) },
                    { label: 'Contacto',      done: Boolean(contactValue.trim()) },
                    { label: 'Tipo de acceso',done: Boolean(tipoAcceso) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        item.done ? 'bg-purple-600' : 'bg-zinc-700 ring-1 ring-zinc-600'
                      }`}>
                        {item.done && <Check size={9} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-xs transition-colors ${item.done ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>{/* /grid */}
      </form>
    </div>
  )
}
