import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, MapPin, Music2, Plus, X,
  Loader2, User, ChevronLeft, ChevronRight, ImagePlus, Trash2,
  Ticket, ExternalLink, Clock, Users, ArrowRight,
  LayoutGrid, Map as MapIcon, Sparkles
} from 'lucide-react'
import { useAuth }     from '../context/AuthContext'
import { API_URL }     from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'
import MapaTocatas     from './MapaTocatas'

/* ─── helpers ─── */

function formatFecha(isoDate) {
  if (!isoDate) return 'Fecha por confirmar'
  const d = new Date(isoDate + 'T00:00:00')
  if (isNaN(d.getTime())) return 'Fecha por confirmar'
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatFechaShort(isoDate) {
  if (!isoDate) return 'Por confirmar'
  const d = new Date(isoDate + 'T00:00:00')
  if (isNaN(d.getTime())) return 'Por confirmar'
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ─── Hero Slider ─── */

function HeroSlider({ eventos }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)

  const slides = eventos.slice(0, 5)
  const len = slides.length

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    if (len < 2) return
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % len), 5000)
  }, [len])

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [startTimer])

  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current >= len) setCurrent(0)
  }, [len, current])

  const goTo = (idx) => {
    setCurrent((idx + len) % len)
    startTimer()
  }

  if (!slides.length) return null
  const ev = slides[current] ?? slides[0]
  if (!ev) return null

  return (
    <div className="relative w-full overflow-hidden select-none" style={{ height: 'clamp(420px, 60vh, 700px)' }}>
      <div className="absolute inset-0">
        {ev.imagen ? (
          <img
            key={ev.id}
            src={ev.imagen}
            alt={ev.nombre}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Music2 size={48} className="text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-7 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-full">
            {ev.genero && ev.genero !== 'Undefined' ? ev.genero : 'Música en vivo'}
          </span>
          {ev.ciudad && (
            <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
              <MapPin size={9} />
              {ev.ciudad}
            </span>
          )}
        </div>

        <h2 className="text-white font-black text-2xl leading-tight max-w-lg line-clamp-2 drop-shadow-lg">
          {ev.nombre}
        </h2>

        <div className="flex items-center gap-4 text-zinc-300 text-sm">
          {ev.fecha && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} className="text-purple-400" />
              {formatFechaShort(ev.fecha)}
              {ev.hora && ` · ${ev.hora.slice(0, 5)}`}
            </span>
          )}
          {ev.recinto && (
            <span className="flex items-center gap-1.5 truncate max-w-xs">
              <MapPin size={13} className="text-purple-400 flex-shrink-0" />
              {ev.recinto}
            </span>
          )}
        </div>

        {ev.precio_min != null && (
          <p className="text-purple-300 text-sm font-bold">
            Desde ${Number(ev.precio_min).toLocaleString('es-CL')}
          </p>
        )}

        {ev.url && (
          <a
            href={ev.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors self-start"
          >
            <Ticket size={13} />
            Ver entradas
          </a>
        )}
      </div>

      {len > 1 && (
        <>
          <button
            onClick={() => goTo(current - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => goTo(current + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {len > 1 && (
        <div className="absolute bottom-4 right-6 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              稳定={i}
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-2 bg-purple-400' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── TocataCard ─── */

function TocataCard({ tocata, onClick }) {
  const { url: afficheUrl } = useImageUrl(tocata.afiche_url ?? null)

  return (
    <button
      onClick={() => onClick(tocata)}
      className="group relative overflow-hidden rounded-2xl border border-white/8 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left w-full bg-zinc-800 flex flex-col"
    >
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="bg-zinc-900/80 backdrop-blur-sm text-purple-300 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-purple-500/30">
            <Users size={9} />
            Comunidad
          </span>
        </div>
        {tocata.genero && (
          <div className="absolute top-3 right-3">
            <span className="bg-white/90 backdrop-blur-sm text-zinc-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {tocata.genero}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <span className="text-white text-xs font-bold drop-shadow">{formatFechaShort(tocata.fecha)}</span>
        </div>
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={16} className="text-white" />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="text-zinc-100 font-bold text-base leading-tight truncate">{tocata.nombre}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-zinc-400 text-xs">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate">{[tocata.direccion, tocata.ciudad].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-zinc-500 text-xs">
          <User size={11} className="flex-shrink-0" />
          <span className="truncate">{tocata.organizador_nombre}</span>
        </div>
      </div>
    </button>
  )
}

/* ─── EventoCard ─── */

function EventoCard({ evento }) {
  const precioLabel = evento.precio_min != null
    ? `Desde $${Number(evento.precio_min).toLocaleString('es-CL')}`
    : null

  return (
    <a
      href={evento.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-2xl border border-white/8 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left w-full bg-zinc-800 flex flex-col"
    >
      <div className="h-44 relative overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-700 flex-shrink-0">
        {evento.imagen ? (
          <img
            src={evento.imagen}
            alt={evento.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
            <Music2 size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="bg-black/70 backdrop-blur-sm text-zinc-300 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
            <Ticket size={9} />
            Ticketmaster
          </span>
        </div>
        {evento.genero && evento.genero !== 'Undefined' && (
          <div className="absolute top-3 right-3">
            <span className="bg-white/90 backdrop-blur-sm text-zinc-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {evento.genero}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <span className="text-white text-xs font-bold drop-shadow">{formatFechaShort(evento.fecha)}</span>
        </div>
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={14} className="text-white" />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="text-zinc-100 font-bold text-base leading-tight line-clamp-2">{evento.nombre}</h3>
        {evento.artistas?.length > 0 && (
          <p className="text-zinc-400 text-xs truncate">{evento.artistas.join(' · ')}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1 text-zinc-400 text-xs">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate">{[evento.recinto, evento.ciudad].filter(Boolean).join(' · ')}</span>
        </div>
        {evento.hora && (
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
            <Clock size={11} className="flex-shrink-0" />
            <span>{evento.hora.slice(0, 5)}</span>
          </div>
        )}
        {precioLabel && (
          <p className="text-purple-400 text-xs font-semibold mt-auto pt-2">{precioLabel}</p>
        )}
      </div>
    </a>
  )
}

/* ── TocataDetailModal ── */

function TocataDetailModal({ tocata, onClose }) {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const { url: afficheUrl } = useImageUrl(tocata.afiche_url ?? null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [cantidad, setCantidad]                 = useState(1)
  const [checkoutLoading, setCheckoutLoading]   = useState(false)
  const [checkoutError, setCheckoutError]       = useState('')

  const isOrganizador = user?.id && tocata.organizador_id === user.id
  const tieneEntradas = tocata.precio != null && Number(tocata.precio) > 0

  const handleComprar = async () => {
    setCheckoutError('')
    setCheckoutLoading(true)
    try {
      const res = await fetch(`${API_URL}/tocatas/${tocata.id}/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ cantidad }),
      })
      const data = await res.json()
      if (!res.ok) { setCheckoutError(data.error || 'Error al generar el pago'); return }
      window.open(data.init_point, '_blank', 'noopener,noreferrer')
    } catch {
      setCheckoutError('No se pudo conectar con el servidor.')
    } finally {
      setCheckoutLoading(false)
    }
  }

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
        <div className="h-56 relative flex-shrink-0 bg-gradient-to-br from-zinc-700 to-zinc-600">
          {afficheUrl ? (
            <img src={afficheUrl} alt={tocata.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <Music2 size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors">
            <X size={16} className="text-white" />
          </button>
          {tocata.genero && (
            <div className="absolute top-3 left-3">
              <span className="bg-white/90 text-zinc-700 text-xs font-bold px-3 py-1 rounded-full">{tocata.genero}</span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-white font-black text-xl leading-tight drop-shadow-lg">{tocata.nombre}</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 text-zinc-200">
              <CalendarDays size={16} className="text-purple-500 flex-shrink-0" />
              <span className="font-semibold text-sm">{formatFecha(tocata.fecha)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-200">
              <MapPin size={16} className="text-purple-500 flex-shrink-0" />
              <span className="text-sm">{[tocata.direccion, tocata.ciudad].filter(Boolean).join(', ') || tocata.ciudad}</span>
            </div>
          </div>

          {tocata.descripcion && (
            <p className="text-zinc-400 text-sm leading-relaxed border-t border-white/8 pt-4">{tocata.descripcion}</p>
          )}

          <div className="flex items-center gap-2.5 text-zinc-300 border-t border-white/8 pt-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Organizador</p>
              <p className="text-sm font-semibold text-zinc-100">{tocata.organizador_nombre}</p>
            </div>
          </div>

          {!isOrganizador && tieneEntradas && (
            <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Precio por entrada</p>
                  <p className="text-white font-black text-xl">${Number(tocata.precio).toLocaleString('es-CL')}</p>
                  {tocata.cantidad_disponible != null && (
                    <p className="text-zinc-500 text-xs">{tocata.cantidad_disponible} disponibles</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-full bg-zinc-700 text-white font-bold text-lg flex items-center justify-center hover:bg-zinc-600 transition-colors"
                  >−</button>
                  <span className="text-white font-bold text-base w-5 text-center">{cantidad}</span>
                  <button
                    onClick={() => setCantidad((c) => tocata.cantidad_disponible != null ? Math.min(tocata.cantidad_disponible, c + 1) : c + 1)}
                    className="w-8 h-8 rounded-full bg-zinc-700 text-white font-bold text-lg flex items-center justify-center hover:bg-zinc-600 transition-colors"
                  >+</button>
                </div>
              </div>
              <div className="flex items-center justify-between text-zinc-400 text-sm px-1">
                <span>Total</span>
                <span className="text-white font-semibold">${(Number(tocata.precio) * cantidad).toLocaleString('es-CL')}</span>
              </div>
              {checkoutError && <p className="text-red-400 text-xs text-center">{checkoutError}</p>}
              <button
                onClick={handleComprar}
                disabled={checkoutLoading}
                className="flex items-center justify-center gap-2 w-full bg-[#009EE3] hover:bg-[#0087c5] disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors"
              >
                {checkoutLoading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                {checkoutLoading ? 'Redirigiendo...' : 'Pagar con MercadoPago'}
              </button>
            </div>
          )}

          {!isOrganizador && !tieneEntradas && (
            <a href={`/messages?with=${tocata.organizador_id}&nombre=${encodeURIComponent(tocata.organizador_nombre)}`} className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-purple-500 transition-colors">
              Contactar organizador
            </a>
          )}

          {isOrganizador && (
            confirmingDelete ? (
              <div className="border-t border-white/8 pt-4 flex flex-col gap-2">
                <p className="text-zinc-300 text-sm font-semibold text-center">¿Eliminar esta tocata?</p>
                <p className="text-zinc-500 text-xs text-center mb-1">Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmingDelete(false)} disabled={deleteMutation.isPending} className="flex-1 bg-zinc-700 text-zinc-100 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-600 transition-colors disabled:opacity-60">Cancelar</button>
                  <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {deleteMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
                  </button>
                </div>
                {deleteMutation.isError && <p className="text-red-400 text-xs text-center mt-1">{deleteMutation.error?.message}</p>}
              </div>
            ) : (
              <button onClick={() => setConfirmingDelete(true)} className="flex items-center justify-center gap-2 w-full bg-red-500/10 text-red-400 border border-red-500/30 font-semibold py-3 rounded-2xl text-sm hover:bg-red-500/20 transition-colors">
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

/* ── CreateTocataModal ── */

function CreateTocataModal({ onClose, onCreated }) {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const afficheInputRef = useRef(null)

  const [form, setForm] = useState({
    nombre: '', fecha: '', ciudad: '', direccion: '',
    descripcion: '', genero: '', contacto_email: '',
    precio: '', cantidad_disponible: '',
  })
  const [afficheKey, setAfficheKey]         = useState(null)
  const [affichePreview, setAffichePreview] = useState(null)
  const [afficheLoading, setAfficheLoading] = useState(false)
  const [errors, setErrors]                 = useState({})

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

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
    } catch { /* silently ignore */ } finally {
      setAfficheLoading(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        afiche_url:          afficheKey || undefined,
        precio:              form.precio              ? Number(form.precio)              : undefined,
        cantidad_disponible: form.cantidad_disponible ? parseInt(form.cantidad_disponible) : undefined,
      }
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
      const enriched = { ...data, organizador_id: user?.id, organizador_nombre: user?.nombre, organizador_email: user?.email }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-zinc-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="font-bold text-zinc-100 text-lg">Publicar tocata</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-2">Afiche (opcional)</label>
            <input ref={afficheInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleAfficheFile(e.target.files[0])} />
            <button type="button" onClick={() => afficheInputRef.current?.click()} disabled={afficheLoading} className="relative w-full h-32 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-purple-400 transition-colors overflow-hidden flex items-center justify-center bg-zinc-800">
              {affichePreview ? (
                <><img src={affichePreview} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><ImagePlus size={22} className="text-white" /></div></>
              ) : afficheLoading ? (
                <Loader2 size={22} className="text-purple-400 animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500"><ImagePlus size={22} /><span className="text-xs font-medium">Subir afiche del evento</span></div>
              )}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Nombre del evento *</label>
            <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Noche de Jazz Vol. 4" className={`w-full px-4 py-2.5 rounded-xl border text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${errors.nombre ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800'}`} />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Fecha *</label>
              <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${errors.fecha ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800'}`} />
              {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Ciudad *</label>
              <input type="text" value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} placeholder="Ej: Santiago" className={`w-full px-3 py-2.5 rounded-xl border text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${errors.ciudad ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800'}`} />
              {errors.ciudad && <p className="text-red-500 text-xs mt-1">{errors.ciudad}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Lugar / Dirección</label>
            <input type="text" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Ej: Club Chocolate, Av. Italia 1234" className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Género musical</label>
            <input type="text" value={form.genero} onChange={(e) => set('genero', e.target.value)} placeholder="Ej: Jazz, Rock, Cumbia..." className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Cuéntanos sobre el evento..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Email de contacto</label>
            <input type="email" value={form.contacto_email} onChange={(e) => set('contacto_email', e.target.value)} placeholder="contacto@ejemplo.com" className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>

          {/* Venta de entradas */}
          <div className="border-t border-white/8 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Venta de entradas (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1.5">Precio por entrada (CLP)</label>
                <input
                  type="number" min="0" step="100"
                  value={form.precio}
                  onChange={(e) => set('precio', e.target.value)}
                  placeholder="Ej: 5000"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1.5">Entradas disponibles</label>
                <input
                  type="number" min="1" step="1"
                  value={form.cantidad_disponible}
                  onChange={(e) => set('cantidad_disponible', e.target.value)}
                  placeholder="Ej: 100"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
            </div>
            {form.precio && (
              <p className="text-zinc-500 text-xs mt-2">Los pagos se procesarán vía MercadoPago.</p>
            )}
          </div>

          {createMutation.isError && <p className="text-red-500 text-sm px-1">{createMutation.error?.message}</p>}

          <button type="submit" disabled={createMutation.isPending || afficheLoading} className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-purple-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
            {createMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Publicando...</> : 'Publicar tocata'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Tabs ─── */

const TABS = [
  { id: 'todo',            label: 'Todo' },
  { id: 'comunidad',       label: 'Comunidad' },
  { id: 'grandes-eventos', label: 'Grandes Eventos' },
]

/* ══════════════════════════════════════════════
    TocatasBoard — componente exportado
══════════════════════════════════════════════ */

export default function TocatasBoard({ isHome = false, limit = 6, onBack = null }) {
  const { token, user }                     = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams]     = useSearchParams()
  const [selectedTocata, setSelectedTocata] = useState(null)
  const [showCreate, setShowCreate]         = useState(false)
  const [filtroActivo, setFiltroActivo]     = useState('todo')
  const [vistaPrincipal, setVistaPrincipal] = useState('carrusel') // 'carrusel' | 'mapa'
  const [pagoStatus, setPagoStatus]         = useState(() => searchParams.get('pago') || null)

  useEffect(() => {
    if (!pagoStatus) return
    const t = setTimeout(() => {
      setPagoStatus(null)
      setSearchParams((p) => { p.delete('pago'); return p })
    }, 5000)
    return () => clearTimeout(t)
  }, [pagoStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: tocatas = [], isLoading: tocatasLoading } = useQuery({
    queryKey: isHome ? ['tocatas-publicas', limit] : ['tocatas'],
    queryFn: async () => {
      const url = isHome
        ? `${API_URL}/tocatas/publicas?limite=${limit}`
        : `${API_URL}/tocatas`
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(url, { headers })
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 3 * 60 * 1000,
  })

  const { data: tmData, isLoading: tmLoading } = useQuery({
    queryKey: ['eventos-ticketmaster'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/eventos?limite=20`)
      if (!res.ok) return { eventos: [] }
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })
  const eventos = tmData?.eventos ?? []

  const handleCreated = (tocata) => {
    setShowCreate(false)
    setSelectedTocata(tocata)
  }

  const isLoading = tocatasLoading || tmLoading

  const allItems = (() => {
    if (filtroActivo === 'comunidad')       return tocatas.map((t) => ({ ...t, _source: 'comunidad' }))
    if (filtroActivo === 'grandes-eventos') return eventos.map((e) => ({ ...e, _source: 'ticketmaster' }))
    return [
      ...tocatas.map((t) => ({ ...t, _source: 'comunidad' })),
      ...eventos.map((e) => ({ ...e, _source: 'ticketmaster' })),
    ]
  })()

  const gridItems  = isHome ? allItems.slice(0, limit) : allItems
  const hasMore    = isHome && allItems.length > limit

  return (
    <div className="w-full">

      {/* Banner de estado de pago */}
      {pagoStatus && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl border flex items-center gap-2 ${
          pagoStatus === 'exitoso'
            ? 'bg-green-500/15 border-green-500/30 text-green-300'
            : pagoStatus === 'error'
            ? 'bg-red-500/15 border-red-500/30 text-red-300'
            : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
        }`}>
          {pagoStatus === 'exitoso' && '¡Pago exitoso! Revisa tu email para la confirmación.'}
          {pagoStatus === 'error'   && 'El pago no se pudo completar. Intenta de nuevo.'}
          {pagoStatus === 'pendiente' && 'Pago pendiente de confirmación.'}
        </div>
      )}

      {/* Modals */}
      {selectedTocata && (
        <TocataDetailModal tocata={selectedTocata} onClose={() => setSelectedTocata(null)} />
      )}
      {showCreate && (
        <CreateTocataModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {/* Hero Slider */}
      {eventos.length > 0 && !isLoading && (
        <div
          className="mb-8"
          style={{
            width: '100vw',
            position: 'relative',
            left: '50%',
            marginLeft: '-50vw',
            marginTop: '-2rem',
          }}
        >
          <HeroSlider eventos={eventos} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-sm mb-3 transition-colors">
              <ChevronLeft size={14} />
              Inicio
            </button>
          )}
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CalendarDays size={24} />
            Tocatas
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Eventos de la comunidad y grandes conciertos en un solo lugar.
          </p>
        </div>

        {!isHome && (
          <button
            onClick={() => {
              if (user?.es_premium) {
                setShowCreate(true)
              } else {
                navigate('/planes')
              }
            }}
            className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-purple-500 transition-colors flex-shrink-0 mt-1"
          >
            <Plus size={16} />
            Publicar
          </button>
        )}
      </div>

      {/* Filtros + Toggle */}
      {!isHome && (
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFiltroActivo(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  filtroActivo === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-white/8'
                }`}
              >
                {tab.label}
                {tab.id === 'comunidad' && tocatas.length > 0 && (
                  <span className={`ml-1.5 text-xs font-bold ${filtroActivo === tab.id ? 'text-purple-200' : 'text-zinc-500'}`}>
                    {tocatas.length}
                  </span>
                )}
                {tab.id === 'grandes-eventos' && eventos.length > 0 && (
                  <span className={`ml-1.5 text-xs font-bold ${filtroActivo === tab.id ? 'text-purple-200' : 'text-zinc-500'}`}>
                    {eventos.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {(tocatas.length > 0 || eventos.length > 0) && (
            <div className="flex bg-zinc-800 border border-white/8 rounded-xl p-1">
              <button
                onClick={() => setVistaPrincipal('carrusel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  vistaPrincipal === 'carrusel'
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid size={13} />
                Cuadrícula
              </button>
              <button
                onClick={() => setVistaPrincipal('mapa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  vistaPrincipal === 'mapa'
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <MapIcon size={13} />
                Mapa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm font-medium">Cargando eventos...</p>
        </div>
      )}

      {/* Vista MAPA */}
      {!isLoading && !isHome && vistaPrincipal === 'mapa' && (
        <MapaTocatas tocatas={gridItems} />
      )}

      {/* Empty State */}
      {!isLoading && (isHome || vistaPrincipal === 'carrusel') && gridItems.length === 0 && (
        <div className="bg-zinc-800 rounded-2xl p-10 border border-white/8 shadow-sm flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-700 flex items-center justify-center">
            <CalendarDays size={28} className="text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-zinc-200 font-bold text-base">No hay eventos disponibles</p>
            <p className="text-zinc-500 text-sm mt-1">Intenta más tarde o sé el primero en publicar.</p>
          </div>
          {!isHome && (
            <button
              onClick={() => {
                if (user?.es_premium) {
                  setShowCreate(true)
                } else {
                  navigate('/planes')
                }
              }}
              className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-500 transition-colors"
            >
              <Plus size={16} />
              Publicar tocata
            </button>
          )}
        </div>
      )}

      {/* Vista GRILLA / CUADRÍCULA + Backlog Roadmap Card */}
      {!isLoading && (isHome || vistaPrincipal === 'carrusel') && gridItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
            {/* Contenedor de las Tarjetas Reales (Ocupa 3 de 4 columnas en pantallas grandes) */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {gridItems.map((item) =>
                item._source === 'comunidad' ? (
                  <TocataCard key={`t-${item.id}`} tocata={item} onClick={setSelectedTocata} />
                ) : (
                  <EventoCard key={`e-${item.id}`} evento={item} />
                )
              )}
            </div>

            {/* Tarjeta del Roadmap del Backlog (Ocupa 1 columna a la derecha) */}
            <div className="bg-gradient-to-br from-zinc-900 to-purple-950/30 border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden shadow-xl md:sticky md:top-24">
              <span className="absolute top-3 right-3 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                Versión 2.0
              </span>
              <h3 className="text-white text-base font-black mb-1.5 mt-2">
                ¿Buscas escenarios donde tocar?
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                Estamos diseñando el módulo de postulación automatizada. Podrás enviar tu ADN Musical directo a personas que busquen músicos para sus eventos y agendar fechas con un clic.
              </p>
            </div>
          </div>

          {/* Ver todos */}
          {hasMore && (
            <div className="mt-8 text-center">
              <Link
                to="/tocatas"
                className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-white/8 text-zinc-200 font-semibold px-6 py-3 rounded-full text-sm transition-colors"
              >
                Ver todos los eventos
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}