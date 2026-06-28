import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, MapPin, Music2, Plus, X,
  Loader2, User, ChevronLeft, ChevronRight, Trash2,
  Ticket, Clock, Users, ArrowRight,
  LayoutGrid, Map as MapIcon, Sparkles, Search,
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

// Sub-componente para obtener la URL presignada del afiche de cada slide.
// Necesita ser un componente propio para poder llamar useImageUrl como hook.
function SlideBackground({ tocata }) {
  const { url } = useImageUrl(tocata?.afiche_url ?? null)
  if (url) {
    return (
      <img
        src={url}
        alt={tocata.nombre}
        className="w-full h-full object-cover transition-opacity duration-500"
      />
    )
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-950 via-zinc-900 to-black flex items-center justify-center">
      <Music2 size={48} className="text-purple-800/60" />
    </div>
  )
}

function HeroSlider({ tocatas }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)

  const slides = tocatas.slice(0, 5)
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

  const lugar = ev.direccion || ev.ciudad || null
  const precio = ev.precio != null ? Number(ev.precio) : null

  return (
    <div className="relative w-full overflow-hidden select-none" style={{ height: 'clamp(420px, 60vh, 700px)' }}>
      <div className="absolute inset-0">
        <SlideBackground key={ev.id} tocata={ev} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
      </div>

      <div className="absolute top-4 left-5">
        <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Users size={9} />
          Comunidad
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-7 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          {ev.genero && (
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-full">
              {ev.genero}
            </span>
          )}
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
          {lugar && (
            <span className="flex items-center gap-1.5 truncate max-w-xs">
              <MapPin size={13} className="text-purple-400 flex-shrink-0" />
              {lugar}
            </span>
          )}
        </div>

        {precio != null && (
          <p className="text-purple-300 text-sm font-bold">
            {precio === 0 ? 'Entrada liberada' : `Desde $${precio.toLocaleString('es-CL')}`}
          </p>
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
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        className="bg-zinc-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
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

/* ══════════════════════════════════════════════
    TocatasBoard — componente exportado
══════════════════════════════════════════════ */

/* ─── Géneros para chips de filtro ─── */
const FILTER_GENRES = [
  'Rock', 'Pop', 'Electrónica', 'Indie', 'Urbano',
  'Metal', 'Jazz', 'Folk', 'Cantautor', 'Cumbia',
]

export default function TocatasBoard({ isHome = false, limit = 6, onBack = null }) {
  const { token, user }                     = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams]     = useSearchParams()
  const [selectedTocata, setSelectedTocata] = useState(null)
  const [vistaPrincipal, setVistaPrincipal] = useState('carrusel')
  const [pagoStatus, setPagoStatus]         = useState(() => searchParams.get('pago') || null)

  /* ── Filtros ── */
  const [filtroGenero,   setFiltroGenero]   = useState(null)
  const [filtroArtista,  setFiltroArtista]  = useState('')
  const [artistaInput,   setArtistaInput]   = useState('')

  /* Debounce del input de artista */
  useEffect(() => {
    const t = setTimeout(() => setFiltroArtista(artistaInput.trim()), 400)
    return () => clearTimeout(t)
  }, [artistaInput])

  useEffect(() => {
    if (!pagoStatus) return
    const t = setTimeout(() => {
      setPagoStatus(null)
      setSearchParams((p) => { p.delete('pago'); return p })
    }, 5000)
    return () => clearTimeout(t)
  }, [pagoStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: tocatas = [], isLoading } = useQuery({
    queryKey: isHome
      ? ['tocatas-publicas', limit]
      : ['tocatas', filtroGenero, filtroArtista],
    queryFn: async () => {
      if (isHome) {
        const res = await fetch(`${API_URL}/tocatas/publicas?limite=${limit}`)
        if (!res.ok) return []
        return res.json()
      }
      const params = new URLSearchParams()
      if (filtroGenero)   params.set('genero',             filtroGenero)
      if (filtroArtista)  params.set('organizador_nombre', filtroArtista)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_URL}/tocatas?${params}`, { headers })
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 3 * 60 * 1000,
  })

  const navigateToPublicar = () =>
    user?.es_premium ? navigate('/tocatas/publicar') : navigate('/planes')

  const gridItems = isHome ? tocatas.slice(0, limit) : tocatas
  const hasMore   = isHome && tocatas.length > limit
  const hayFiltros = Boolean(filtroGenero || filtroArtista)

  return (
    <div className="w-full pb-16">

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

      {/* Hero Slider — ancho completo, sin restricción de contenedor */}
      {tocatas.length > 0 && !isLoading && (
        <div className="w-full mb-8">
          <HeroSlider tocatas={tocatas} />
        </div>
      )}

      {/* Contenido principal — max-w-7xl para aprovechar el ancho full-bleed */}
      <div className="max-w-7xl mx-auto px-6 py-2">

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
            Eventos de la comunidad, organizados por músicos como tú.
          </p>
        </div>

        {!isHome && (
          <button
            onClick={navigateToPublicar}
            className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-purple-500 transition-colors flex-shrink-0 mt-1"
          >
            <Plus size={16} />
            Publicar
          </button>
        )}
      </div>

      {/* Filtros — solo en vista completa */}
      {!isHome && (
        <div className="flex flex-col gap-3 mb-6">

          {/* Búsqueda por artista/organizador */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={artistaInput}
              onChange={(e) => setArtistaInput(e.target.value)}
              placeholder="Buscar por organizador o artista..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 text-zinc-100 text-sm placeholder:text-zinc-500
                focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/40 transition-all"
            />
            {artistaInput && (
              <button
                onClick={() => setArtistaInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Chips de género + toggle de vista */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
              <button
                onClick={() => setFiltroGenero(null)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filtroGenero === null
                    ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/25'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-purple-500/50 hover:text-zinc-200'
                }`}
              >
                Todo
              </button>
              {FILTER_GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setFiltroGenero(filtroGenero === g ? null : g)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filtroGenero === g
                      ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/25'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-purple-500/50 hover:text-zinc-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {tocatas.length > 0 && (
              <div className="flex flex-shrink-0 bg-zinc-800 border border-white/8 rounded-xl p-1">
                <button
                  onClick={() => setVistaPrincipal('carrusel')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    vistaPrincipal === 'carrusel' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <LayoutGrid size={13} />
                  Cuadrícula
                </button>
                <button
                  onClick={() => setVistaPrincipal('mapa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    vistaPrincipal === 'mapa' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <MapIcon size={13} />
                  Mapa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm font-medium">Cargando tocatas...</p>
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
            <p className="text-zinc-200 font-bold text-base">
              {hayFiltros ? 'Sin resultados para estos filtros' : 'No hay tocatas disponibles'}
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              {hayFiltros ? 'Prueba con otro género o busca otro organizador.' : 'Sé el primero en publicar una tocata.'}
            </p>
          </div>
          {!isHome && !hayFiltros && (
            <button
              onClick={navigateToPublicar}
              className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-500 transition-colors"
            >
              <Plus size={16} />
              Publicar tocata
            </button>
          )}
          {hayFiltros && (
            <button
              onClick={() => { setFiltroGenero(null); setArtistaInput('') }}
              className="flex items-center gap-2 border border-zinc-600 text-zinc-300 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-700 transition-colors"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Grid de tocatas */}
      {!isLoading && (isHome || vistaPrincipal === 'carrusel') && gridItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {gridItems.map((tocata) => (
              <TocataCard key={tocata.id} tocata={tocata} onClick={setSelectedTocata} />
            ))}
          </div>

          {/* Ver todos */}
          {hasMore && (
            <div className="mt-8 text-center">
              <Link
                to="/tocatas"
                className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-white/8 text-zinc-200 font-semibold px-6 py-3 rounded-full text-sm transition-colors"
              >
                Ver todas las tocatas
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </>
      )}

      </div>{/* /max-w-7xl */}
    </div>
  )
}
