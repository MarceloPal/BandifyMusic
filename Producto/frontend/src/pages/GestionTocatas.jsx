import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, MapPin, Ticket, Loader2, Music,
  Eye, Pencil, XCircle, AlertTriangle, CheckCircle,
  Plus, ChevronLeft, Users,
} from 'lucide-react'
import { useAuth }     from '../context/AuthContext'
import { API_URL }     from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'

/* ─── Helpers ─── */

function formatFecha(isoDate) {
  if (!isoDate) return '—'
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/* ─── Badge de estado ─── */

function EstadoBadge({ estado }) {
  if (estado === 'cancelado') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
        <XCircle size={10} />
        Cancelado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
      <CheckCircle size={10} />
      Activo
    </span>
  )
}

/* ─── Resumen de tickets (se carga por demanda al expandir) ─── */

function TicketResumen({ tocataId, precio }) {
  const { token } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['tickets-resumen', tocataId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tocatas/${tocataId}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!tocataId && !!precio,
    staleTime: 2 * 60 * 1000,
  })

  if (!precio) return (
    <p className="text-zinc-600 text-xs italic">Evento de entrada liberada — sin venta de tickets.</p>
  )
  if (isLoading) return <Loader2 size={14} className="text-zinc-600 animate-spin" />
  if (!data) return null

  return (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <p className="text-white font-bold text-lg tabular-nums">{data.total_vendidas}</p>
        <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Entradas vendidas</p>
      </div>
      <div className="h-8 w-px bg-zinc-800" />
      <div className="text-center">
        <p className="text-purple-300 font-bold text-lg tabular-nums">
          ${Number(data.recaudacion_clp).toLocaleString('es-CL')}
        </p>
        <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Recaudado (CLP)</p>
      </div>
    </div>
  )
}

/* ─── Modal de confirmación de cancelación ─── */

function ConfirmCancelarModal({ tocata, onConfirm, onClose, isPending }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <h3 className="text-white font-bold text-base mb-1">¿Cancelar esta tocata?</h3>
        <p className="text-zinc-400 text-sm mb-1 font-semibold truncate">{tocata.nombre}</p>
        <p className="text-zinc-500 text-xs leading-relaxed mb-6">
          El evento no se eliminará, pero dejará de aparecer en el listado público. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm font-semibold rounded-xl transition-colors"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Sí, cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Card de tocata en gestión ─── */

function GestionCard({ tocata, onCancelar }) {
  const { url: afficheUrl } = useImageUrl(tocata.afiche_url ?? null)
  const [expanded, setExpanded] = useState(false)
  const cancelado = tocata.estado === 'cancelado'

  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${
      cancelado
        ? 'border-zinc-800 bg-zinc-900/40 opacity-70'
        : 'border-zinc-800 hover:border-zinc-700 bg-white/3'
    }`}>
      <div className="flex items-start gap-4 p-4">
        {/* Miniatura del afiche */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-900/40 to-zinc-900 flex items-center justify-center">
          {afficheUrl ? (
            <img src={afficheUrl} alt={tocata.nombre} className="w-full h-full object-cover" />
          ) : (
            <Music size={20} className="text-purple-700/50" />
          )}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-white font-bold text-sm truncate">{tocata.nombre}</p>
            <EstadoBadge estado={tocata.estado} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {tocata.fecha && (
              <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
                <CalendarDays size={11} className="text-purple-400 flex-shrink-0" />
                {formatFecha(tocata.fecha)}
                {tocata.hora && ` · ${tocata.hora.slice(0, 5)}`}
              </span>
            )}
            {tocata.ciudad && (
              <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
                <MapPin size={11} className="text-purple-400 flex-shrink-0" />
                {tocata.ciudad}
              </span>
            )}
            {tocata.precio != null && (
              <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
                <Ticket size={11} className="text-purple-400 flex-shrink-0" />
                ${Number(tocata.precio).toLocaleString('es-CL')} CLP
              </span>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
            >
              <Eye size={12} />
              {expanded ? 'Ocultar' : 'Ver detalle'}
            </button>

            {!cancelado && (
              <>
                <Link
                  to={`/tocatas/editar/${tocata.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Pencil size={12} />
                  Editar
                </Link>

                <button
                  onClick={() => onCancelar(tocata)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors"
                >
                  <XCircle size={12} />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Panel expandible: descripción + tickets */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 flex flex-col gap-4">
          {tocata.descripcion && (
            <p className="text-zinc-400 text-sm leading-relaxed">{tocata.descripcion}</p>
          )}
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Users size={10} />
              Entradas vendidas
            </p>
            <TicketResumen tocataId={tocata.id} precio={tocata.precio} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
    GestionTocatas — página principal
══════════════════════════════════════════════ */

export default function GestionTocatas() {
  const { user, token }  = useAuth()
  const navigate         = useNavigate()
  const queryClient      = useQueryClient()
  const [pendingCancel, setPendingCancel] = useState(null)

  const { data: tocatas = [], isLoading } = useQuery({
    queryKey: ['mis-tocatas', user?.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tocatas?organizador_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!user?.id && !!token,
    staleTime: 2 * 60 * 1000,
  })

  const cancelMutation = useMutation({
    mutationFn: async (tocataId) => {
      const res = await fetch(`${API_URL}/tocatas/${tocataId}/cancelar`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al cancelar')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-tocatas', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['tocatas'] })
      setPendingCancel(null)
    },
  })

  const activas    = tocatas.filter((t) => t.estado !== 'cancelado')
  const canceladas = tocatas.filter((t) => t.estado === 'cancelado')

  return (
    <div className="min-h-screen w-full bg-black pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-sm mb-3 transition-colors"
            >
              <ChevronLeft size={14} />
              Mi perfil
            </button>
            <h1 className="text-3xl font-black text-white tracking-tight">Gestión</h1>
            <p className="text-zinc-500 text-sm mt-1">Administra los eventos que has organizado.</p>
          </div>

          {user?.es_premium && (
            <Link
              to="/tocatas/publicar"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors flex-shrink-0 mt-8"
            >
              <Plus size={14} />
              Nueva tocata
            </Link>
          )}
        </div>

        {/* Estado: cargando */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-purple-400 animate-spin" />
          </div>
        )}

        {/* Estado: sin tocatas */}
        {!isLoading && tocatas.length === 0 && (
          <div className="bg-white/5 border border-zinc-800 rounded-2xl p-10 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Music size={20} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-zinc-300 font-bold text-sm mb-1">Aún no has organizado tocatas</p>
              <p className="text-zinc-600 text-xs max-w-xs leading-relaxed">
                Publica tu primer evento y aparecerá aquí para que puedas gestionarlo.
              </p>
            </div>
            {user?.es_premium ? (
              <Link
                to="/tocatas/publicar"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
              >
                Publicar tocata
              </Link>
            ) : (
              <Link
                to="/planes"
                className="px-5 py-2 border border-purple-500/60 text-purple-400 hover:bg-purple-500/10 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
              >
                Activar Plan Premium
              </Link>
            )}
          </div>
        )}

        {/* Tocatas activas */}
        {!isLoading && activas.length > 0 && (
          <section className="mb-8">
            <p className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest mb-3">
              Activas ({activas.length})
            </p>
            <div className="flex flex-col gap-3">
              {activas.map((t) => (
                <GestionCard key={t.id} tocata={t} onCancelar={setPendingCancel} />
              ))}
            </div>
          </section>
        )}

        {/* Tocatas canceladas */}
        {!isLoading && canceladas.length > 0 && (
          <section>
            <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest mb-3">
              Canceladas ({canceladas.length})
            </p>
            <div className="flex flex-col gap-3">
              {canceladas.map((t) => (
                <GestionCard key={t.id} tocata={t} onCancelar={setPendingCancel} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Modal confirmación cancelación */}
      {pendingCancel && (
        <ConfirmCancelarModal
          tocata={pendingCancel}
          onClose={() => setPendingCancel(null)}
          onConfirm={() => cancelMutation.mutate(pendingCancel.id)}
          isPending={cancelMutation.isPending}
        />
      )}
    </div>
  )
}
