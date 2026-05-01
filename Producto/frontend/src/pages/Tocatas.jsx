import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, MapPin, Music2, Plus, X, Upload,
  Loader2, Mail, User, ChevronRight, ImagePlus, Trash2,
} from 'lucide-react'
import { useAuth }     from '../context/AuthContext'
import { API_URL }     from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'

/* ─── helpers ─── */

function formatFecha(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatFechaShort(isoDate) {
  if (!isoDate) return ''
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ─── sub-components ─── */

/** Card individual de tocata */
function TocataCard({ tocata, onClick }) {
  const { url: afficheUrl } = useImageUrl(tocata.afiche_url ?? null)

  return (
    <button
      onClick={() => onClick(tocata)}
      className="group relative overflow-hidden rounded-2xl border border-white/8 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left w-full bg-zinc-800"
    >
      {/* Afiche / placeholder area */}
      <div className="h-44 relative overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-700 flex-shrink-0">
        {afficheUrl ? (
          <img
            src={afficheUrl}
            alt={tocata.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
            <Music2 size={32} />
            <span className="text-xs font-medium">Sin afiche</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Genre pill on image */}
        {tocata.genero && (
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-zinc-200 text-xs font-semibold px-2.5 py-1 rounded-full border border-white/50">
              {tocata.genero}
            </span>
          </div>
        )}

        {/* Date on image */}
        <div className="absolute bottom-3 left-3">
          <span className="text-white text-xs font-bold drop-shadow">
            {formatFechaShort(tocata.fecha)}
          </span>
        </div>

        {/* Arrow hint */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={16} className="text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-zinc-100 font-bold text-base leading-tight truncate">{tocata.nombre}</h3>
        <div className="flex items-center gap-1.5 mt-1.5 text-zinc-400 text-xs">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate">
            {[tocata.direccion, tocata.ciudad].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-zinc-500 text-xs">
          <User size={11} className="flex-shrink-0" />
          <span className="truncate">{tocata.organizador_nombre}</span>
        </div>
      </div>
    </button>
  )
}

/* ── Detail Modal ── */
function TocataDetailModal({ tocata, onClose }) {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const { url: afficheUrl } = useImageUrl(tocata.afiche_url ?? null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isOrganizador = user?.id && tocata.organizador_id === user.id

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/tocatas/${tocata.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar la tocata')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.setQueryData(['tocatas'], (old = []) =>
        Array.isArray(old) ? old.filter((t) => t.id !== tocata.id) : []
      )
      queryClient.invalidateQueries({ queryKey: ['tocatas-publicas'] })
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Afiche */}
        <div className="h-56 relative flex-shrink-0 bg-gradient-to-br from-zinc-700 to-zinc-600">
          {afficheUrl ? (
            <img src={afficheUrl} alt={tocata.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <Music2 size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>

          {/* Genre pill */}
          {tocata.genero && (
            <div className="absolute top-3 left-3">
              <span className="bg-white/90 text-zinc-200 text-xs font-bold px-3 py-1 rounded-full">
                {tocata.genero}
              </span>
            </div>
          )}

          {/* Event name on image */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-white font-black text-xl leading-tight drop-shadow-lg">{tocata.nombre}</h2>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Date + City */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 text-zinc-200">
              <CalendarDays size={16} className="text-purple-500 flex-shrink-0" />
              <span className="font-semibold text-sm">{formatFecha(tocata.fecha)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-200">
              <MapPin size={16} className="text-purple-500 flex-shrink-0" />
              <span className="text-sm">
                {[tocata.direccion, tocata.ciudad].filter(Boolean).join(', ') || tocata.ciudad}
              </span>
            </div>
          </div>

          {/* Descripcion */}
          {tocata.descripcion && (
            <p className="text-zinc-400 text-sm leading-relaxed border-t border-white/8 pt-4">
              {tocata.descripcion}
            </p>
          )}

          {/* Organizador */}
          <div className="flex items-center gap-2.5 text-zinc-300 border-t border-white/8 pt-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Organizador</p>
              <p className="text-sm font-semibold text-zinc-100">{tocata.organizador_nombre}</p>
            </div>
          </div>

          {/* Contact CTA — solo si no soy el organizador */}
          {!isOrganizador && (tocata.contacto_email || tocata.organizador_email) && (
            <a
              href={`mailto:${tocata.contacto_email || tocata.organizador_email}?subject=Consulta sobre ${encodeURIComponent(tocata.nombre)}`}
              className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-purple-500 transition-colors"
            >
              <Mail size={16} />
              Contactar al organizador
            </a>
          )}

          {/* Eliminar — solo si soy el organizador */}
          {isOrganizador && (
            confirmingDelete ? (
              <div className="border-t border-white/8 pt-4 flex flex-col gap-2">
                <p className="text-zinc-300 text-sm font-semibold text-center">
                  ¿Eliminar esta tocata?
                </p>
                <p className="text-zinc-500 text-xs text-center mb-1">
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 bg-zinc-700 text-zinc-100 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-600 transition-colors disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deleteMutation.isPending ? (
                      <><Loader2 size={14} className="animate-spin" /> Eliminando...</>
                    ) : (
                      <>Sí, eliminar</>
                    )}
                  </button>
                </div>
                {deleteMutation.isError && (
                  <p className="text-red-400 text-xs text-center mt-1">
                    {deleteMutation.error?.message}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center justify-center gap-2 w-full bg-red-500/10 text-red-400 border border-red-500/30 font-semibold py-3 rounded-2xl text-sm hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={15} />
                Eliminar tocata
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Create Modal ── */
function CreateTocataModal({ onClose, onCreated }) {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const afficheInputRef = useRef(null)

  const [form, setForm] = useState({
    nombre: '', fecha: '', ciudad: '', direccion: '',
    descripcion: '', genero: '', contacto_email: '',
  })
  const [afficheKey, setAfficheKey]       = useState(null)
  const [affichePreview, setAffichePreview] = useState(null)
  const [afficheLoading, setAfficheLoading] = useState(false)
  const [errors, setErrors]               = useState({})

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  /* Afiche upload */
  const handleAfficheFile = async (file) => {
    if (!file) return
    setAfficheLoading(true)
    try {
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
      const urlRes = await fetch(`${API_URL}/images/upload-url?type=afiche&ext=${ext}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { uploadUrl, key } = await urlRes.json()
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      setAfficheKey(key)
      setAffichePreview(URL.createObjectURL(file))
    } catch {
      // silently ignore
    } finally {
      setAfficheLoading(false)
    }
  }

  /* Create mutation */
  const createMutation = useMutation({
    mutationFn: async () => {
      const body = { ...form, afiche_url: afficheKey || undefined }
      const res = await fetch(`${API_URL}/tocatas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al crear la tocata')
      }
      return res.json()
    },
    onSuccess: (data) => {
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
      onCreated(enriched)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!form.fecha)         errs.fecha  = 'La fecha es obligatoria'
    if (!form.ciudad.trim()) errs.ciudad = 'La ciudad es obligatoria'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    createMutation.mutate()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="font-bold text-zinc-100 text-lg">Publicar tocata</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Afiche upload */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-2">
              Afiche (opcional)
            </label>
            <input
              ref={afficheInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleAfficheFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => afficheInputRef.current?.click()}
              disabled={afficheLoading}
              className="relative w-full h-32 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-purple-400 transition-colors overflow-hidden flex items-center justify-center bg-zinc-800"
            >
              {affichePreview ? (
                <>
                  <img src={affichePreview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <ImagePlus size={22} className="text-white" />
                  </div>
                </>
              ) : afficheLoading ? (
                <Loader2 size={22} className="text-purple-400 animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <ImagePlus size={22} />
                  <span className="text-xs font-medium">Subir afiche del evento</span>
                </div>
              )}
            </button>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
              Nombre del evento *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Noche de Jazz Vol. 4"
              className={`w-full px-4 py-2.5 rounded-xl border text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                errors.nombre ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800'
              }`}
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
          </div>

          {/* Fecha + Ciudad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                  errors.fecha ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800'
                }`}
              />
              {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
                Ciudad *
              </label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => set('ciudad', e.target.value)}
                placeholder="Ej: Santiago"
                className={`w-full px-3 py-2.5 rounded-xl border text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                  errors.ciudad ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800'
                }`}
              />
              {errors.ciudad && <p className="text-red-500 text-xs mt-1">{errors.ciudad}</p>}
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
              Lugar / Dirección
            </label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => set('direccion', e.target.value)}
              placeholder="Ej: Club Chocolate, Av. Italia 1234"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>

          {/* Género */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
              Género musical
            </label>
            <input
              type="text"
              value={form.genero}
              onChange={(e) => set('genero', e.target.value)}
              placeholder="Ej: Jazz, Rock, Cumbia..."
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Cuéntanos sobre el evento..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Contacto */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">
              Email de contacto
            </label>
            <input
              type="email"
              value={form.contacto_email}
              onChange={(e) => set('contacto_email', e.target.value)}
              placeholder="contacto@ejemplo.com"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>

          {/* Error general */}
          {createMutation.isError && (
            <p className="text-red-500 text-sm px-1">{createMutation.error?.message}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={createMutation.isPending || afficheLoading}
            className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-purple-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
          >
            {createMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Publicando...</>
            ) : (
              'Publicar tocata'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── main page ─── */

export default function Tocatas() {
  const { token } = useAuth()
  const [selectedTocata, setSelectedTocata] = useState(null)
  const [showCreate, setShowCreate]         = useState(false)

  /* Fetch tocatas */
  const { data: tocatas = [], isLoading, isError } = useQuery({
    queryKey: ['tocatas'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tocatas`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!token,
  })

  const handleCreated = (tocata) => {
    setShowCreate(false)
    setSelectedTocata(tocata)
  }

  return (
    <div className="max-w-5xl mx-auto w-full">

      {/* Modals */}
      {selectedTocata && (
        <TocataDetailModal tocata={selectedTocata} onClose={() => setSelectedTocata(null)} />
      )}
      {showCreate && (
        <CreateTocataModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CalendarDays size={24} />
            Tocatas
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Eventos y presentaciones de la comunidad.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-purple-500 transition-colors flex-shrink-0 mt-1"
        >
          <Plus size={16} />
          Publicar
        </button>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm font-medium">Cargando eventos...</p>
        </div>
      ) : isError ? (
        <div className="bg-zinc-800 rounded-2xl p-8 border border-red-500/30 text-center">
          <p className="text-zinc-300 font-medium text-sm">No se pudieron cargar las tocatas</p>
          <p className="text-zinc-500 text-xs mt-1">Intenta recargar la página.</p>
        </div>
      ) : tocatas.length === 0 ? (
        <div className="bg-zinc-800 rounded-2xl p-10 border border-white/8 shadow-sm flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-700 flex items-center justify-center">
            <CalendarDays size={28} className="text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-zinc-200 font-bold text-base">Aún no hay tocatas publicadas</p>
            <p className="text-zinc-500 text-sm mt-1">Sé el primero en publicar un evento para la comunidad.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-500 transition-colors"
          >
            <Plus size={16} />
            Publicar tocata
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tocatas.map((t) => (
            <TocataCard key={t.id} tocata={t} onClick={setSelectedTocata} />
          ))}
        </div>
      )}
    </div>
  )
}
