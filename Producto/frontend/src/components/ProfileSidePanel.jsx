/**
 * ProfileSidePanel — Panel lateral holográfico que reemplaza al ProfileDrawer.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  [X]  Perfil de colaborador                          │
 *   ├─────────────────┬────────────────────────────────────┤
 *   │                 │  Bio / detalles / redes / demo     │
 *   │  ProfileCard    │  (scrollable)                      │
 *   │  holográfica    │                                    │
 *   │                 │  [💬 Conectar]                     │
 *   └─────────────────┴────────────────────────────────────┘
 *
 * En mobile (< lg) la tarjeta va arriba y la info abajo (stacked).
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X, MapPin, Clock, Music, MessageCircle,
  Play, Pause, Volume2, Loader2, ExternalLink,
} from 'lucide-react'
import { useAuth }    from '../context/AuthContext'
import { API_URL }    from '../utils/helpers'
import ProfileCard    from './ProfileCard'

export default function ProfileSidePanel({ musico, onClose }) {
  const { token }  = useAuth()
  const navigate   = useNavigate()
  const audioRef   = useRef(null)

  const [isPlaying,  setIsPlaying]  = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [buffered,   setBuffered]   = useState(0)

  // Signed URL for S3 audio
  const { data: listenData, isLoading: isLoadingUrl } = useQuery({
    queryKey: ['listen-url', musico?.s3_key],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/audio/listen-url?key=${encodeURIComponent(musico.s3_key)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('No se pudo obtener la URL')
      return res.json()
    },
    enabled:   !!musico?.s3_key && !!token,
    staleTime: 50 * 60 * 1000,
  })

  // Audio progress & buffer
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime     = () => { if (el.duration) setProgress((el.currentTime / el.duration) * 100) }
    const onProgress = () => {
      if (!el.duration || !el.buffered.length) return
      setBuffered((el.buffered.end(el.buffered.length - 1) / el.duration) * 100)
    }
    const onEnded = () => { setIsPlaying(false); setProgress(0) }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('progress',   onProgress)
    el.addEventListener('ended',      onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('progress',   onProgress)
      el.removeEventListener('ended',      onEnded)
    }
  }, [listenData?.url])

  useEffect(() => {
    setIsPlaying(false); setProgress(0); setAudioReady(false); setBuffered(0)
  }, [musico?.id])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePlayPause = () => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) { el.pause(); setIsPlaying(false) }
    else           { el.play().then(() => setIsPlaying(true)).catch(() => {}) }
  }

  const handleSeek = (e) => {
    const el = audioRef.current
    if (!el || !el.duration) return
    const r   = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - r.left) / r.width
    el.currentTime = pct * el.duration
    setProgress(pct * 100)
  }

  if (!musico) return null

  const oficio    = Array.isArray(musico.oficio)    ? musico.oficio    : []
  const user_tags = Array.isArray(musico.user_tags) ? musico.user_tags : []

  // Build ProfileCard props
  const cardTitle   = oficio.length > 0 ? oficio.slice(0, 2).join(' · ') : 'Músico'
  const cardHandle  = musico.ciudad ? `📍 ${musico.ciudad}` : ''
  const cardStatus  = musico.compatibilidad != null ? `${musico.compatibilidad}% compatible` : 'Colaborador'
  const cardSettings = musico.card_settings || null  // from DB: { theme, pattern }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(680px, 100vw)',
          background: 'rgba(10,10,18,0.92)',
          backdropFilter: 'blur(32px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-12px 0 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-wide">Perfil de colaborador</span>
            {musico.compatibilidad != null && (
              <span className="text-xs font-bold bg-purple-600 text-white px-2.5 py-0.5 rounded-full">
                {musico.compatibilidad}% compatible
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent' }}
            aria-label="Cerrar panel"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body — card + info side by side (lg) or stacked (sm) */}
        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

          {/* ── Left: ProfileCard ── */}
          <div className="flex-shrink-0 flex items-start justify-center p-6 lg:pt-8 lg:pb-6 lg:pl-6 lg:pr-4">
            <ProfileCard
              name={musico.nombre}
              title={cardTitle}
              handle={cardHandle}
              status={cardStatus}
              avatarUrl={musico.foto_url || ''}
              contactText="Conectar"
              onContactClick={() => {
                navigate(`/messages?with=${musico.id}&nombre=${encodeURIComponent(musico.nombre)}`)
                onClose()
              }}
              showUserInfo={true}
              cardSettings={cardSettings}
              enableTilt={true}
              enableMobileTilt={false}
            />
          </div>

          {/* ── Right: Info scroll ── */}
          <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5 min-w-0">

            {/* Name row */}
            <div>
              <p className="text-white font-bold text-xl leading-tight">{musico.nombre}</p>
              {musico.ciudad && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>{musico.ciudad}</span>
                </div>
              )}
            </div>

            {/* Rol */}
            {oficio.length > 0 && (
              <div>
                <SectionLabel>ROL</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {oficio.map((o) => (
                    <span key={o} className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', borderColor: 'rgba(139,92,246,0.3)' }}>
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Estilos */}
            {user_tags.length > 0 && (
              <div>
                <SectionLabel>ESTILOS</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {user_tags.map((t) => (
                    <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experiencia */}
            {musico.experiencia != null && (
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>
                  {musico.experiencia} {musico.experiencia === 1 ? 'año' : 'años'} de experiencia
                </span>
              </div>
            )}

            {/* Bio */}
            {musico.bio && (
              <div>
                <SectionLabel>BIO</SectionLabel>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                  {musico.bio}
                </p>
              </div>
            )}

            {/* Redes sociales */}
            {(musico.instagram_url || musico.spotify_url || musico.discord_url) && (
              <div>
                <SectionLabel><ExternalLink size={9} className="inline mr-1" />REDES</SectionLabel>
                <div className="flex flex-wrap gap-2 mt-2">
                  {musico.instagram_url && (
                    <SocialLink href={musico.instagram_url} bg="linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)">
                      <IgSvg /> Instagram
                    </SocialLink>
                  )}
                  {musico.spotify_url && (
                    <SocialLink href={musico.spotify_url} bg="#1db954">
                      <SpSvg /> Spotify
                    </SocialLink>
                  )}
                  {musico.discord_url && (
                    <SocialLink href={musico.discord_url} bg="#5865f2">
                      <DiSvg /> Discord
                    </SocialLink>
                  )}
                </div>
              </div>
            )}

            {/* Demo musical */}
            {musico.s3_key && (
              <div>
                <SectionLabel><Music size={9} className="inline mr-1" />DEMO MUSICAL</SectionLabel>
                {listenData?.url && (
                  <audio ref={audioRef} src={listenData.url} onCanPlay={() => setAudioReady(true)} preload="auto" />
                )}
                <div className="mt-2 rounded-2xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={handlePlayPause}
                    disabled={!audioReady || isLoadingUrl}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                  >
                    {isLoadingUrl
                      ? <Loader2 size={14} className="animate-spin" style={{ color: '#000' }} />
                      : isPlaying
                      ? <Pause size={14} style={{ color: '#000' }} />
                      : <Play  size={14} style={{ color: '#000', marginLeft: '2px' }} />}
                  </button>
                  <div className="flex-1">
                    <div
                      className="h-1.5 rounded-full cursor-pointer relative overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                      onClick={handleSeek}
                    >
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${buffered}%`, background: 'rgba(255,255,255,0.25)' }} />
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{ width: `${progress}%`, background: 'rgba(255,255,255,0.85)' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '5px' }}>
                      {isLoadingUrl ? 'Obteniendo URL…' : audioReady ? 'Demo' : 'Cargando…'}
                    </p>
                  </div>
                  <Volume2 size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />
          </div>
        </div>

        {/* Footer — Conectar */}
        <div className="flex-shrink-0 px-5 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => {
              navigate(`/messages?with=${musico.id}&nombre=${encodeURIComponent(musico.nombre)}`)
              onClose()
            }}
            className="w-full font-bold py-3.5 rounded-full text-sm transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(124,58,237,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <MessageCircle size={15} />
            Conectar
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Shared sub-components ────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {children}
    </p>
  )
}

function SocialLink({ href, bg, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold transition-opacity hover:opacity-80"
      style={{ background: bg }}>
      {children}
    </a>
  )
}

function IgSvg() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
}
function SpSvg() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
}
function DiSvg() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.1 18.102.12 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
}
