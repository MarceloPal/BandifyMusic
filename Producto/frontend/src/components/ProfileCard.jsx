/**
 * ProfileCard — Tarjeta holográfica con efecto tilt 3D.
 *
 * Basado en React Bits ProfileCard con extensiones Bandify:
 *  • CARD_THEMES: Aurora (default), Sunset, Neón, Medianoche, Fuego, Menta
 *  • CARD_PATTERNS: Notas Musicales (default), Estrellas, Rayos, Ondas, Kaomojis, Líneas
 *  • cardSettings prop: { theme, pattern } — si no se pasa, usa Aurora + Notas
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import './ProfileCard.css'

// ── Helpers ────────────────────────────────────────────────────────────────
const enc = (svg) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// ── Themes ─────────────────────────────────────────────────────────────────
export const CARD_THEMES = {
  Aurora: {
    label: 'Aurora',
    innerGradient: 'linear-gradient(145deg,#3b1f6e8c 0%,#7c3aed44 50%,#4f46e544 100%)',
    behindGlowColor: 'rgba(124,58,237,0.65)',
    pillars: [
      'hsl(270,100%,73%)','hsl(240,100%,73%)','hsl(200,100%,75%)',
      'hsl(280,100%,73%)','hsl(220,100%,73%)','hsl(260,100%,73%)',
    ],
  },
  Sunset: {
    label: 'Sunset',
    innerGradient: 'linear-gradient(145deg,#7c2d1280 0%,#dc262680 50%,#ec489980 100%)',
    behindGlowColor: 'rgba(220,38,38,0.65)',
    pillars: [
      'hsl(20,100%,73%)','hsl(0,100%,73%)','hsl(330,100%,73%)',
      'hsl(350,100%,73%)','hsl(10,100%,73%)','hsl(340,100%,73%)',
    ],
  },
  Neón: {
    label: 'Neón',
    innerGradient: 'linear-gradient(145deg,#06272780 0%,#0891b280 50%,#22c55e44 100%)',
    behindGlowColor: 'rgba(8,145,178,0.65)',
    pillars: [
      'hsl(175,100%,60%)','hsl(160,100%,65%)','hsl(190,100%,65%)',
      'hsl(145,100%,65%)','hsl(180,100%,70%)','hsl(155,100%,70%)',
    ],
  },
  Medianoche: {
    label: 'Medianoche',
    innerGradient: 'linear-gradient(145deg,#0f172a90 0%,#1e1b4b80 50%,#1e293b80 100%)',
    behindGlowColor: 'rgba(30,27,75,0.85)',
    pillars: [
      'hsl(230,60%,60%)','hsl(250,60%,55%)','hsl(240,70%,55%)',
      'hsl(220,60%,60%)','hsl(260,60%,55%)','hsl(235,65%,58%)',
    ],
  },
  Fuego: {
    label: 'Fuego',
    innerGradient: 'linear-gradient(145deg,#7c150780 0%,#ea580c80 50%,#dc262680 100%)',
    behindGlowColor: 'rgba(234,88,12,0.7)',
    pillars: [
      'hsl(15,100%,60%)','hsl(5,100%,60%)','hsl(25,100%,65%)',
      'hsl(40,100%,65%)','hsl(0,100%,60%)','hsl(30,100%,65%)',
    ],
  },
  Menta: {
    label: 'Menta',
    innerGradient: 'linear-gradient(145deg,#06402a80 0%,#15803d80 50%,#0d948680 100%)',
    behindGlowColor: 'rgba(21,128,61,0.65)',
    pillars: [
      'hsl(145,80%,55%)','hsl(160,80%,55%)','hsl(130,80%,55%)',
      'hsl(175,80%,60%)','hsl(140,80%,60%)','hsl(165,80%,60%)',
    ],
  },
}

// ── Patterns ───────────────────────────────────────────────────────────────
export const CARD_PATTERNS = {
  'Notas Musicales': enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <text x="4" y="42" font-size="34" font-family="serif" fill="white">♩</text>
      <text x="46" y="68" font-size="26" font-family="serif" fill="white">♪</text>
      <text x="50" y="30" font-size="20" font-family="serif" fill="white">♫</text>
      <text x="8"  y="74" font-size="17" font-family="serif" fill="white">♬</text>
    </svg>`
  ),
  Estrellas: enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <polygon points="40,6 45,26 65,26 50,38 56,58 40,46 24,58 30,38 15,26 35,26" fill="white"/>
      <polygon points="70,4 72,11 79,11 74,16 76,23 70,18 64,23 66,16 61,11 68,11" fill="white" opacity=".65"/>
      <polygon points="13,52 15,58 21,58 17,63 19,69 13,65 7,69 9,63 4,58 10,58" fill="white" opacity=".45"/>
    </svg>`
  ),
  Rayos: enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <polygon points="33,2 19,40 30,40 15,78 44,32 29,32 42,2" fill="white"/>
      <polygon points="65,10 57,35 64,35 53,70 74,30 63,30 70,10" fill="white" opacity=".5"/>
    </svg>`
  ),
  Ondas: enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60">
      <path d="M0 18 C22 4,28 4,50 18 S78 32,100 18" stroke="white" stroke-width="3.5" fill="none"/>
      <path d="M0 38 C22 24,28 24,50 38 S78 52,100 38" stroke="white" stroke-width="2.5" fill="none" opacity=".6"/>
      <path d="M0 54 C22 40,28 40,50 54 S78 68,100 54" stroke="white" stroke-width="1.5" fill="none" opacity=".3"/>
    </svg>`
  ),
  Kaomojis: enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <circle cx="21" cy="21" r="13" fill="white" opacity=".9"/>
      <circle cx="17" cy="18" r="2.5" fill="#000" opacity=".55"/>
      <circle cx="25" cy="18" r="2.5" fill="#000" opacity=".55"/>
      <path d="M15 25 Q21 30 27 25" stroke="#000" stroke-width="1.5" fill="none" opacity=".55"/>
      <circle cx="62" cy="58" r="10" fill="white" opacity=".7"/>
      <line x1="58" y1="55" x2="66" y2="55" stroke="#000" stroke-width="2" opacity=".5"/>
      <path d="M57 62 Q62 67 67 62" stroke="#000" stroke-width="1.5" fill="none" opacity=".5"/>
    </svg>`
  ),
  Líneas: enc(
    `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <line x1="0"  y1="0"  x2="60"  y2="60" stroke="white" stroke-width="2.5"/>
      <line x1="20" y1="0"  x2="80"  y2="60" stroke="white" stroke-width="1.5" opacity=".6"/>
      <line x1="-20" y1="0" x2="40"  y2="60" stroke="white" stroke-width="1.5" opacity=".6"/>
      <line x1="40" y1="0"  x2="100" y2="60" stroke="white" stroke-width="1"   opacity=".35"/>
      <line x1="-40" y1="0" x2="20"  y2="60" stroke="white" stroke-width="1"   opacity=".35"/>
    </svg>`
  ),
}

// ── Defaults ───────────────────────────────────────────────────────────────
export const DEFAULT_THEME   = 'Aurora'
export const DEFAULT_PATTERN = 'Notas Musicales'

// ── Internal helpers ───────────────────────────────────────────────────────
const clamp  = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max)
const round  = (v, p = 3) => parseFloat(v.toFixed(p))
const adjust = (v, fMin, fMax, tMin, tMax) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin))

const ANIM = {
  INITIAL_DURATION: 1200,
  INIT_X: 70,
  INIT_Y: 60,
  BETA_OFFSET: 20,
  ENTER_MS: 180,
}

// ── Component ──────────────────────────────────────────────────────────────
function ProfileCardComponent({
  /* data */
  name        = 'Músico',
  title       = 'Artista',
  handle      = '',
  status      = 'Activo',
  avatarUrl   = '',
  contactText = 'Conectar',
  onContactClick,
  showUserInfo = true,
  /* appearance */
  cardSettings,           // { theme, pattern }
  /* tilt */
  enableTilt       = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  className = '',
}) {
  // Resolve theme + pattern from cardSettings (fallback to defaults)
  const themeName   = cardSettings?.theme   || DEFAULT_THEME
  const patternName = cardSettings?.pattern || DEFAULT_PATTERN

  const theme   = CARD_THEMES[themeName]   || CARD_THEMES[DEFAULT_THEME]
  const iconUrl = CARD_PATTERNS[patternName] || CARD_PATTERNS[DEFAULT_PATTERN]

  const wrapRef  = useRef(null)
  const shellRef = useRef(null)
  const enterTimerRef = useRef(null)
  const leaveRafRef   = useRef(null)

  // Tilt engine (stable across renders)
  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null
    let rafId = null, running = false, lastTs = 0
    let curX = 0, curY = 0, tgtX = 0, tgtY = 0
    const DEFAULT_TAU = 0.14, INITIAL_TAU = 0.6
    let initialUntil = 0

    const setVars = (x, y) => {
      const shell = shellRef.current
      const wrap  = wrapRef.current
      if (!shell || !wrap) return
      const W = shell.clientWidth  || 1
      const H = shell.clientHeight || 1
      const px = clamp((100 / W) * x)
      const py = clamp((100 / H) * y)
      const cx = px - 50, cy = py - 50
      const props = {
        '--pointer-x': `${px}%`,
        '--pointer-y': `${py}%`,
        '--background-x': `${adjust(px, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(py, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(py - 50, px - 50) / 50, 0, 1)}`,
        '--pointer-from-top':    `${py / 100}`,
        '--pointer-from-left':   `${px / 100}`,
        '--rotate-x':  `${round(-(cx / 5))}deg`,
        '--rotate-y':  `${round(cy / 4)}deg`,
      }
      for (const [k, v] of Object.entries(props)) wrap.style.setProperty(k, v)
    }

    const step = (ts) => {
      if (!running) return
      if (!lastTs) lastTs = ts
      const dt = (ts - lastTs) / 1000
      lastTs = ts
      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU
      const k = 1 - Math.exp(-dt / tau)
      curX += (tgtX - curX) * k
      curY += (tgtY - curY) * k
      setVars(curX, curY)
      if (Math.abs(tgtX - curX) > 0.05 || Math.abs(tgtY - curY) > 0.05 || document.hasFocus()) {
        rafId = requestAnimationFrame(step)
      } else {
        running = false; lastTs = 0
        if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      }
    }

    const start = () => {
      if (running) return
      running = true; lastTs = 0; rafId = requestAnimationFrame(step)
    }

    return {
      setImmediate(x, y) { curX = x; curY = y; setVars(curX, curY) },
      setTarget(x, y)    { tgtX = x; tgtY = y; start() },
      toCenter()         {
        const s = shellRef.current
        if (s) this.setTarget(s.clientWidth / 2, s.clientHeight / 2)
      },
      beginInitial(ms)   { initialUntil = performance.now() + ms; start() },
      getCurrent()       { return { x: curX, y: curY, tx: tgtX, ty: tgtY } },
      cancel()           {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = null; running = false; lastTs = 0
      },
    }
  }, [enableTilt])

  const getOffsets = (evt, el) => {
    const r = el.getBoundingClientRect()
    return { x: evt.clientX - r.left, y: evt.clientY - r.top }
  }

  const handlePointerMove  = useCallback((e) => {
    const s = shellRef.current
    if (!s || !tiltEngine) return
    const { x, y } = getOffsets(e, s)
    tiltEngine.setTarget(x, y)
  }, [tiltEngine])

  const handlePointerEnter = useCallback((e) => {
    const s = shellRef.current
    if (!s || !tiltEngine) return
    s.classList.add('active', 'entering')
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
    enterTimerRef.current = setTimeout(() => s.classList.remove('entering'), ANIM.ENTER_MS)
    const { x, y } = getOffsets(e, s)
    tiltEngine.setTarget(x, y)
  }, [tiltEngine])

  const handlePointerLeave = useCallback(() => {
    const s = shellRef.current
    if (!s || !tiltEngine) return
    tiltEngine.toCenter()
    const check = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent()
      if (Math.hypot(tx - x, ty - y) < 0.6) {
        s.classList.remove('active')
        leaveRafRef.current = null
      } else {
        leaveRafRef.current = requestAnimationFrame(check)
      }
    }
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current)
    leaveRafRef.current = requestAnimationFrame(check)
  }, [tiltEngine])

  const handleDeviceOrientation = useCallback((e) => {
    const s = shellRef.current
    if (!s || !tiltEngine) return
    const { beta, gamma } = e
    if (beta == null || gamma == null) return
    const x = clamp(s.clientWidth  / 2 + gamma * mobileTiltSensitivity, 0, s.clientWidth)
    const y = clamp(s.clientHeight / 2 + (beta - ANIM.BETA_OFFSET) * mobileTiltSensitivity, 0, s.clientHeight)
    tiltEngine.setTarget(x, y)
  }, [tiltEngine, mobileTiltSensitivity])

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return
    const s = shellRef.current
    if (!s) return

    s.addEventListener('pointerenter', handlePointerEnter)
    s.addEventListener('pointermove',  handlePointerMove)
    s.addEventListener('pointerleave', handlePointerLeave)

    const onCLick = () => {
      if (!enableMobileTilt || location.protocol !== 'https:') return
      const ME = window.DeviceMotionEvent
      if (ME && typeof ME.requestPermission === 'function') {
        ME.requestPermission()
          .then((st) => { if (st === 'granted') window.addEventListener('deviceorientation', handleDeviceOrientation) })
          .catch(() => {})
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation)
      }
    }
    s.addEventListener('click', onCLick)

    // Initial animation
    const initX = (s.clientWidth || 0) - ANIM.INIT_X
    tiltEngine.setImmediate(initX, ANIM.INIT_Y)
    tiltEngine.toCenter()
    tiltEngine.beginInitial(ANIM.INITIAL_DURATION)

    return () => {
      s.removeEventListener('pointerenter', handlePointerEnter)
      s.removeEventListener('pointermove',  handlePointerMove)
      s.removeEventListener('pointerleave', handlePointerLeave)
      s.removeEventListener('click', onCLick)
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current)
      if (leaveRafRef.current)   cancelAnimationFrame(leaveRafRef.current)
      tiltEngine.cancel()
      s.classList.remove('entering')
    }
  }, [enableTilt, enableMobileTilt, tiltEngine, handlePointerMove, handlePointerEnter, handlePointerLeave, handleDeviceOrientation])

  // CSS vars for this card instance
  const cardStyle = useMemo(() => ({
    '--icon':             iconUrl ? `url(${iconUrl})` : 'none',
    '--inner-gradient':   theme.innerGradient,
    '--behind-glow-color': theme.behindGlowColor,
    '--behind-glow-size': '50%',
    '--sunpillar-clr-1':  theme.pillars[0],
    '--sunpillar-clr-2':  theme.pillars[1],
    '--sunpillar-clr-3':  theme.pillars[2],
    '--sunpillar-clr-4':  theme.pillars[3],
    '--sunpillar-clr-5':  theme.pillars[4],
    '--sunpillar-clr-6':  theme.pillars[5],
  }), [iconUrl, theme])

  const handleContact = useCallback(() => onContactClick?.(), [onContactClick])

  return (
    <div ref={wrapRef} className={`pc-card-wrapper ${className}`.trim()} style={cardStyle}>
      <div className="pc-behind" />
      <div ref={shellRef} className="pc-card-shell">
        <section className="pc-card">
          <div className="pc-inside">
            <div className="pc-shine" />
            <div className="pc-glare" />

            {/* Avatar layer */}
            <div className="pc-content pc-avatar-content">
              {avatarUrl ? (
                <img
                  className="avatar"
                  src={avatarUrl}
                  alt={name}
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="pc-initials-avatar">
                  {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}

              {showUserInfo && (
                <div className="pc-user-info">
                  <div className="pc-user-details">
                    <div className="pc-user-text">
                      <div className="pc-handle">{handle || `@${name.toLowerCase().replace(/\s+/g, '')}`}</div>
                      <div className="pc-status">{status}</div>
                    </div>
                  </div>
                  <button
                    className="pc-contact-btn"
                    onClick={handleContact}
                    type="button"
                    style={{ pointerEvents: 'auto' }}
                  >
                    {contactText}
                  </button>
                </div>
              )}
            </div>

            {/* Name/title layer */}
            <div className="pc-content">
              <div className="pc-details">
                <h3>{name}</h3>
                <p>{title}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

const ProfileCard = React.memo(ProfileCardComponent)
export default ProfileCard
