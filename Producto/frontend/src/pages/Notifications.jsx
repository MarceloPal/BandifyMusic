import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, MessageCircle, Sparkles, CalendarDays, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'

/* ─── Mapping tipo → icono y color ─── */
const TYPE_STYLES = {
  mensaje: { icon: MessageCircle, color: 'text-blue-400',   bg: 'bg-blue-500/15' },
  tocata:  { icon: CalendarDays,  color: 'text-green-400',  bg: 'bg-green-500/15' },
  adn:     { icon: Sparkles,      color: 'text-purple-400', bg: 'bg-purple-500/15' },
}

/* ─── Tiempo relativo ─── */
function tiempoRelativo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)  return 'Hace un momento'
  if (mins < 60) return `Hace ${mins} min`
  if (hrs < 24)  return `Hace ${hrs} h`
  if (days < 7)  return `Hace ${days} día${days > 1 ? 's' : ''}`
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

export default function Notifications() {
  const { token }    = useAuth()
  const queryClient  = useQueryClient()

  const { data: notifs = [], isLoading, error } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/notificaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No se pudieron cargar las notificaciones')
      return res.json()
    },
    enabled: !!token,
    refetchInterval: 30_000,
  })

  const marcarLeidas = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/notificaciones/leer`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
    },
  })

  const sinLeer = notifs.filter((n) => !n.leida).length

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Bell size={24} />
            Notificaciones
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            {sinLeer > 0 ? `${sinLeer} notificación${sinLeer > 1 ? 'es' : ''} sin leer` : 'Todo al día ✓'}
          </p>
        </div>
        {sinLeer > 0 && (
          <button
            onClick={() => marcarLeidas.mutate()}
            disabled={marcarLeidas.isPending}
            className="text-xs text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-center">
          <p className="text-red-400 text-sm">{error.message}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && notifs.length === 0 && (
        <div className="bg-zinc-800 rounded-2xl p-10 border border-white/8 text-center">
          <Bell size={28} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 text-sm font-medium">No tienes notificaciones</p>
          <p className="text-zinc-500 text-xs mt-1">
            Aquí verás mensajes nuevos, tocatas cercanas y actualizaciones de tu ADN.
          </p>
        </div>
      )}

      {/* Lista */}
      {notifs.length > 0 && (
        <div className="flex flex-col gap-2">
          {notifs.map((n) => {
            const style = TYPE_STYLES[n.tipo] ?? TYPE_STYLES.adn
            const Icon  = style.icon
            return (
              <Link
                key={n.id}
                to={n.link || '#'}
                className={`bg-zinc-800 rounded-2xl p-5 flex items-start gap-4 border transition-all hover:bg-zinc-700/60 ${
                  n.leida ? 'border-white/8' : 'border-purple-500/40'
                }`}
              >
                <div className={`${style.bg} p-2.5 rounded-xl flex-shrink-0`}>
                  <Icon size={15} className={style.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.leida ? 'text-zinc-300' : 'text-white'}`}>
                      {n.titulo}
                    </p>
                    {!n.leida && (
                      <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{n.descripcion}</p>
                  <p className="text-zinc-500 text-xs mt-2">{tiempoRelativo(n.tiempo)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
