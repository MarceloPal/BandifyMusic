/**
 * ProfileDrawer — Panel lateral derecho que muestra el perfil completo
 * de un músico/colaborador seleccionado desde el Explorador.
 *
 * Incluye:
 *  • Avatar (foto o iniciales)
 *  • Bio, ciudad, experiencia, oficio, tags manuales
 *  • Reproductor de audio (demo desde S3 via URL firmada)
 *  • Botón "Conectar" → va a mensajes
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X, MapPin, Clock, Music, MessageCircle,
  Play, Pause, Volume2, Loader2, Tag, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL, getInitials } from '../utils/helpers'

export default function ProfileDrawer({ musico, onClose }) {
  const { token }  = useAuth()
  const navigate   = useNavigate()
  const audioRef   = useRef(null)

  const [isPlaying,  setIsPlaying]  = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [progress,   setProgress]   = useState(0)   // 0-100

  // Obtener URL firmada para reproducción cuando hay s3_key
  const { data: listenData, isLoading: isLoadingUrl } = useQuery({
    queryKey: ['listen-url', musico?.s3_key],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/audio/listen-url?key=${encodeURIComponent(musico.s3_key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No se pudo obtener la URL de reproducción')
      return res.json()
    },
    enabled: !!musico?.s3_key && !!token,
    staleTime: 50 * 60 * 1000, // 50 min (URL expira en 60)
  })

  // Sincronizar progreso del audio
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTimeUpdate = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100)
    }
    const onEnded = () => { setIsPlaying(false); setProgress(0) }
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('ended', onEnded)
    return () => { el.removeEventListener('timeupdate', onTimeUpdate); el.removeEventListener('ended', onEnded) }
  }, [listenData?.url])

  // Reset player when musico changes
  useEffect(() => {
    setIsPlaying(false); setProgress(0); setAudioReady(false)
  }, [musico?.id])

  const handlePlayPause = () => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) { el.pause(); setIsPlaying(false) }
    else           { el.play().then(() => setIsPlaying(true)).catch(() => {}) }
  }

  const handleSeek = (e) => {
    const el = audioRef.current
    if (!el || !el.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    el.currentTime = pct * el.duration
    setProgress(pct * 100)
  }

  if (!musico) return null

  const oficio    = Array.isArray(musico.oficio)    ? musico.oficio    : []
  const user_tags = Array.isArray(musico.user_tags) ? musico.user_tags : []

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 max-w-full bg-zinc-900 shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <p className="text-zinc-100 font-bold text-sm">Perfil de colaborador</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

          {/* Avatar + nombre + compatibilidad */}
          <div className="flex items-center gap-3">
            {musico.foto_url ? (
              <img
                src={musico.foto_url}
                alt={musico.nombre}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {getInitials(musico.nombre)}
              </div>
            )}
            <div>
              <p className="text-zinc-100 font-bold text-base leading-tight">{musico.nombre}</p>
              {musico.instrumento && (
                <p className="text-zinc-400 text-sm mt-0.5">{musico.instrumento}</p>
              )}
              {musico.compatibilidad != null && (
                <span className="inline-block mt-1 text-xs font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                  {musico.compatibilidad}% compatible
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {musico.bio && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Sobre mí</p>
              <p className="text-zinc-200 text-sm leading-relaxed">{musico.bio}</p>
            </div>
          )}

          {/* Detalles */}
          <div className="flex flex-col gap-2">
            {musico.ciudad && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <MapPin size={13} className="text-zinc-500 flex-shrink-0" />
                {musico.ciudad}
              </div>
            )}
            {musico.experiencia != null && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Clock size={13} className="text-zinc-500 flex-shrink-0" />
                {musico.experiencia} {musico.experiencia === 1 ? 'año' : 'años'} de experiencia
              </div>
            )}
          </div>

          {/* Oficio */}
          {oficio.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">Rol</p>
              <div className="flex flex-wrap gap-1.5">
                {oficio.map((o) => (
                  <span key={o} className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags / Géneros */}
          {user_tags.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">
                <Tag size={10} className="inline mr-1" />
                Estilos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {user_tags.map((t) => (
                  <span key={t} className="bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Redes sociales */}
          {(musico.instagram_url || musico.spotify_url || musico.discord_url) && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">
                <ExternalLink size={10} className="inline mr-1" />
                Redes sociales
              </p>
              <div className="flex flex-wrap gap-2">
                {musico.instagram_url && (
                  <a href={musico.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold hover:opacity-80 transition-opacity"
                    style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Instagram
                  </a>
                )}
                {musico.spotify_url && (
                  <a href={musico.spotify_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-[#1db954] hover:opacity-80 transition-opacity">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                    Spotify
                  </a>
                )}
                {musico.discord_url && (
                  <a href={musico.discord_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-[#5865f2] hover:opacity-80 transition-opacity">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.1 18.102.12 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    Discord
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Reproductor de demo */}
          {musico.s3_key && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">
                <Music size={10} className="inline mr-1" />
                Demo musical
              </p>

              {listenData?.url && (
                <audio
                  ref={audioRef}
                  src={listenData.url}
                  onCanPlay={() => setAudioReady(true)}
                  preload="metadata"
                />
              )}

              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  {/* Play / Pause */}
                  <button
                    onClick={handlePlayPause}
                    disabled={!audioReady || isLoadingUrl}
                    className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 transition-colors disabled:opacity-40 flex-shrink-0"
                  >
                    {isLoadingUrl
                      ? <Loader2 size={14} className="animate-spin" />
                      : isPlaying
                      ? <Pause size={14} />
                      : <Play  size={14} className="ml-0.5" />}
                  </button>

                  {/* Barra de progreso */}
                  <div className="flex-1">
                    <div
                      className="h-1.5 bg-zinc-700 rounded-full cursor-pointer"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">
                      {audioReady ? 'Demo' : 'Cargando...'}
                    </p>
                  </div>

                  <Volume2 size={13} className="text-zinc-500 flex-shrink-0" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer — Conectar */}
        <div className="px-5 py-4 border-t border-white/8">
          <button
            onClick={() => {
              navigate(`/messages?with=${musico.id}&nombre=${encodeURIComponent(musico.nombre)}`)
              onClose()
            }}
            className="w-full bg-purple-600 text-white font-semibold py-3 rounded-full text-sm hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle size={15} />
            Conectar
          </button>
        </div>
      </div>
    </>
  )
}
