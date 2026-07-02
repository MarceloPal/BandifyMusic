import { useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

/* ─── Reproductor custom dark, alineado con el theme de Bandify. ─── */

function fmtTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function AudioPlayer({ src, audioRef: externalRef, onPlay, onPause, onEnded }) {
  const localRef = useRef(null)
  const audioRef = externalRef ?? localRef
  const [playing, setPlaying]     = useState(false)
  const [duration, setDuration]   = useState(0)
  const [current, setCurrent]     = useState(0)
  const [muted, setMuted]         = useState(false)
  const [prevSrc, setPrevSrc]     = useState(src)

  // Reset al cambiar la pista — patrón oficial recomendado en lugar de useEffect.
  // https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
  if (prevSrc !== src) {
    setPrevSrc(src)
    setPlaying(false)
    setCurrent(0)
  }

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  const handleTimeUpdate = () => {
    const el = audioRef.current
    if (!el) return
    setCurrent(el.currentTime)
  }

  const handleLoadedMeta = () => {
    const el = audioRef.current
    if (el) setDuration(el.duration)
  }

  const handleSeek = (e) => {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    el.currentTime = Math.max(0, Math.min(duration, pct * duration))
  }

  const toggleMute = () => {
    const el = audioRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Play/pause */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center flex-shrink-0 transition-colors shadow-md shadow-purple-900/30"
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        {playing
          ? <Pause size={16} fill="white" />
          : <Play  size={16} fill="white" className="ml-0.5" />}
      </button>

      {/* Progress + tiempos */}
      <div className="flex-1 min-w-0">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Progreso de reproducción"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          onClick={handleSeek}
          onKeyDown={(e) => {
            const el = audioRef.current
            if (!el || !duration) return
            if (e.key === 'ArrowRight') el.currentTime = Math.min(duration, el.currentTime + 5)
            if (e.key === 'ArrowLeft')  el.currentTime = Math.max(0, el.currentTime - 5)
          }}
          className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group"
        >
          <div
            className="absolute inset-y-0 left-0 bg-purple-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-zinc-500 tabular-nums font-medium">
          <span>{fmtTime(current)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Mute */}
      <button
        onClick={toggleMute}
        className="w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
        aria-label={muted ? 'Activar sonido' : 'Silenciar'}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      {/* <audio> oculto */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => { setPlaying(true);  onPlay?.() }}
        onPause={() => { setPlaying(false); onPause?.() }}
        onEnded={() => { setPlaying(false); onEnded?.() }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMeta}
        className="hidden"
      />
    </div>
  )
}
