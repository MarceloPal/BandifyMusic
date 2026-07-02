/**
 * Mensajes — separación entre Solicitudes y Contactos establecidos.
 *
 * • Solicitudes: alguien te escribió, tú aún no has respondido (yo_respondi = false).
 * • Mensajes:    conversaciones bidireccionales (yo_respondi = true).
 *
 * Usa el endpoint GET /mensajes/conversaciones que devuelve la lista unificada
 * con el flag yo_respondi.
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Send, MessageCircle, Inbox } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useImageUrl } from '../hooks/useImageUrl'
import { API_URL, getInitials } from '../utils/helpers'
import UserLink from '../components/UserLink'

function formatTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  return `${d}d`
}

export default function Messages() {
  const { token, user } = useAuth()
  const [searchParams]  = useSearchParams()

  const [selectedUser, setSelectedUser] = useState(() => {
    const withId     = searchParams.get('with')
    const withNombre = searchParams.get('nombre')
    return withId ? { id: withId, nombre: withNombre || 'Usuario' } : null
  })

  const [tab,        setTab]        = useState('mensajes') // 'mensajes' | 'solicitudes'
  const [newMessage, setNewMessage] = useState('')
  const queryClient = useQueryClient()
  const { url: selectedUserPhotoUrl } = useImageUrl(selectedUser?.foto_url ?? null)

  // ── Lista unificada de conversaciones ─────────────────────────────────────
  const { data: conversaciones = [] } = useQuery({
    queryKey: ['conversaciones'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/mensajes/conversaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    enabled: !!token,
    refetchInterval: 10_000,
  })

  // Split por tipo
  const contactos    = conversaciones.filter((c) => c.yo_respondi)
  const solicitudes  = conversaciones.filter((c) => !c.yo_respondi)
  const listaActiva  = tab === 'mensajes' ? contactos : solicitudes

  // ── Hilo de conversación ──────────────────────────────────────────────────
  const { data: messages = [] } = useQuery({
    queryKey: ['conversation', selectedUser?.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/mensajes/conversacion/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    enabled: !!selectedUser,
    refetchInterval: 3_000,
  })

  // ── Envío ─────────────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: async (contenido) => {
      const res = await fetch(`${API_URL}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ para_id: selectedUser.id, contenido }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedUser?.id] })
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
    },
  })

  const handleSend = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    sendMutation.mutate(newMessage.trim())
  }

  // Mensajes sin leer en la conversación activa (recibidos por el usuario actual)
  const sinLeerEnConv = messages.filter(
    (m) => !m.leido && m.para_id === user?.id
  ).length

  // Marca como leídos cuando: se abre la conversación O llegan nuevos mensajes sin leer
  useEffect(() => {
    if (!selectedUser?.id || !token || sinLeerEnConv === 0) return
    fetch(`${API_URL}/notificaciones/leer`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
    }).catch(() => {})
  }, [selectedUser?.id, sinLeerEnConv]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectConv = (conv) => {
    setSelectedUser({
      id: conv.partner_id,
      nombre: conv.partner_nombre,
      foto_url: conv.partner_foto_url,
    })
    if (!conv.yo_respondi) setTab('mensajes')
  }

  return (
    <div className="flex flex-1 bg-zinc-900 overflow-hidden border-t border-white/8">

      {/* ── Panel izquierdo: lista de conversaciones ── */}
      <div className="w-72 flex-shrink-0 border-r border-white/8 flex flex-col">

        {/* Tabs */}
        <div className="flex border-b border-white/8">
          <TabBtn
            active={tab === 'mensajes'}
            onClick={() => setTab('mensajes')}
            label="Mensajes"
            icon={<MessageCircle size={13} />}
            badge={contactos.filter((c) => c.sin_leer > 0).length}
          />
          <TabBtn
            active={tab === 'solicitudes'}
            onClick={() => setTab('solicitudes')}
            label="Solicitudes"
            icon={<Inbox size={13} />}
            badge={solicitudes.length}
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {listaActiva.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-zinc-500 text-sm leading-relaxed">
                {tab === 'mensajes'
                  ? 'Aún no tienes conversaciones. Conecta con alguien desde Explorar.'
                  : 'No tienes solicitudes de mensaje pendientes.'}
              </p>
            </div>
          )}

          {listaActiva.map((conv) => (
            <ConversationButton
              key={conv.partner_id}
              conv={conv}
              isSelected={selectedUser?.id === conv.partner_id}
              onSelect={() => handleSelectConv(conv)}
            />
          ))}
        </div>
      </div>

      {/* ── Área de conversación ── */}
      <div className="flex-1 flex flex-col">
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageCircle size={32} className="text-zinc-600" />
            <p className="text-zinc-500 text-sm">Selecciona una conversación</p>
          </div>
        ) : (
          <>
            {/* Header conversación */}
            <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-3 bg-zinc-800">
              {selectedUserPhotoUrl ? (
                <img
                  src={selectedUserPhotoUrl}
                  alt={selectedUser.nombre}
                  className="w-8 h-8 rounded-full object-cover bg-zinc-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-bold">
                  {getInitials(selectedUser.nombre)}
                </div>
              )}
              <UserLink username={selectedUser.nombre} className="text-white font-semibold text-sm">
                {selectedUser.nombre}
              </UserLink>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
              {messages.length === 0 && (
                <p className="text-zinc-500 text-sm text-center mt-10">
                  Inicia la conversación con {selectedUser.nombre}
                </p>
              )}
              {messages.map((msg) => {
                const isMine = msg.de_id === user?.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-100'
                      }`}
                    >
                      {msg.contenido}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input de envío */}
            <form onSubmit={handleSend} className="px-5 py-3.5 border-t border-white/8 flex gap-2.5 bg-zinc-800">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-zinc-700 text-white placeholder-zinc-500 rounded-full px-5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <button
                type="submit"
                disabled={sendMutation.isPending || !newMessage.trim()}
                className="bg-purple-600 text-white p-2.5 rounded-full hover:bg-purple-500 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function ConversationButton({ conv, isSelected, onSelect }) {
  const { url: photoUrl } = useImageUrl(conv.partner_foto_url ?? null)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors border-b border-white/6 ${
        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <div className="relative flex-shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={conv.partner_nombre}
            className="w-9 h-9 rounded-full object-cover bg-zinc-700"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-bold">
            {getInitials(conv.partner_nombre)}
          </div>
        )}
        {conv.sin_leer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full text-white text-xs flex items-center justify-center font-bold leading-none">
            {conv.sin_leer > 9 ? '9+' : conv.sin_leer}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <UserLink username={conv.partner_nombre} className={`text-sm truncate ${conv.sin_leer > 0 ? 'text-white font-semibold' : 'text-zinc-300 font-medium'}`}>
            {conv.partner_nombre}
          </UserLink>
          <span className="text-zinc-500 text-xs flex-shrink-0">
            {formatTime(conv.last_at)}
          </span>
        </div>
        <p className="text-zinc-500 text-xs truncate mt-0.5">
          {conv.last_mensaje || '...'}
        </p>
      </div>
    </button>
  )
}

function TabBtn({ active, onClick, label, icon, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold border-b-2 transition-colors ${
        active
          ? 'border-purple-400 text-white'
          : 'border-transparent text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon}
      {label}
      {badge > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold leading-none ${
          active ? 'bg-purple-500 text-white' : 'bg-zinc-700 text-zinc-400'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}
