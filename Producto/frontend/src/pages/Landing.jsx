import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ArrowLeft, Sparkles, Music, CalendarDays, Mic2, Users2, Ticket, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'
import Footer      from '../components/Footer'
import GooeyNav    from '../components/GooeyNav'
import SoftAurora  from '../components/SoftAurora'
import TocatasBoard from '../components/TocatasBoard'

function formatFechaCorta(isoDate) {
  if (!isoDate) return ''
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Mock data ─────────────────────────────────────────────────


// ── Sub-componentes ───────────────────────────────────────────

function NoticiaCard({ noticia }) {
  return (
    <a
      href={noticia.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white/5 rounded-2xl overflow-hidden flex flex-col border border-white/8 hover:bg-white/8 hover:-translate-y-0.5 transition-all"
    >
      {noticia.urlToImage && (
        <img
          src={noticia.urlToImage}
          alt={noticia.title}
          className="w-full aspect-video object-cover"
          loading="lazy"
        />
      )}
      <div className="p-5 flex flex-col gap-2 flex-1">
        <span className="text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-400/20 px-2.5 py-1 rounded-full w-fit">
          {noticia.source?.name}
        </span>
        <h3 className="text-white font-bold text-sm leading-snug">{noticia.title}</h3>
        {noticia.description && (
          <p className="text-white/50 text-xs leading-relaxed flex-1">{noticia.description}</p>
        )}
        <p className="text-white/30 text-xs">
          {noticia.publishedAt
            ? new Date(noticia.publishedAt).toLocaleDateString('es-CL', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : ''}
        </p>
      </div>
    </a>
  )
}

function TocataPreviewCard({ tocata }) {
  const lugar = [tocata.direccion, tocata.ciudad].filter(Boolean).join(' · ')
  return (
    <div className="bg-white/5 rounded-2xl p-5 flex flex-col gap-3 border border-white/8 hover:bg-white/8 hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{formatFechaCorta(tocata.fecha)}</span>
        {tocata.genero && (
          <span className="text-xs font-bold text-white bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
            {tocata.genero}
          </span>
        )}
      </div>
      <h3 className="text-white font-bold text-sm">{tocata.nombre}</h3>
      {lugar && (
        <div className="flex items-center gap-1 text-white/50 text-xs">
          <MapPin size={11} />
          {lugar}
        </div>
      )}
      {tocata.organizador_nombre && (
        <p className="text-white/30 text-xs">Por {tocata.organizador_nombre}</p>
      )}
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-6"
    >
      <ArrowLeft size={14} />
      Inicio
    </button>
  )
}

// ── Botón blanco reutilizable (texto negro forzado) ────────────
// Se necesita style inline porque text-white del padre (text-white en <div>)
// puede ganar la especificidad en Tailwind v4 para elementos <a>.
const btnWhite = 'rounded-full font-semibold transition-colors'

function WhiteBtn({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`${btnWhite} ${className}`}
      style={{ backgroundColor: '#ffffff', color: '#000000' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e7e5e4' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff' }}
    >
      {children}
    </Link>
  )
}

// ── Cómo Funciona: stepper interactivo ───────────────────────

const STEPS = [
  {
    num: '01',
    icon: Mic2,
    color: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    titulo: 'Sube tu música',
    subtitulo: 'Nuestro algoritmo analiza tu sonido',
    desc: 'Sube un audio en formato .mp3 o .wav. Nuestra IA analiza el BPM, energía, timbre y estructura rítmica de tu música para crear un perfil único — tu ADN Musical.',
    puntos: ['Sin formularios aburridos', 'Análisis en segundos', 'Perfil 100% basado en tu sonido real'],
    preview: (
      <div className="bg-white/5 rounded-2xl p-5 border border-white/8 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"><Mic2 size={18} className="text-purple-400" /></div>
          <div><p className="text-white text-sm font-bold">demo_session.mp3</p><p className="text-white/40 text-xs">3:42 · 8.4 MB</p></div>
        </div>
        <div className="h-10 flex items-end gap-0.5">
          {[4,7,5,9,6,8,4,10,7,5,9,6,8,4,7,5,9,6,8,4,6,9,5,8].map((h, i) => (
            <div key={i} className="flex-1 bg-purple-400/60 rounded-full" style={{ height: `${h * 10}%` }} />
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['BPM: 128', 'Energía: Alta', 'Electrónica'].map(tag => (
            <span key={tag} className="text-xs bg-purple-500/15 border border-purple-400/20 text-purple-300 px-2.5 py-1 rounded-full">{tag}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '02',
    icon: Users2,
    color: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    titulo: 'Conecta con músicos',
    subtitulo: 'El algoritmo encuentra tu match musical',
    desc: 'Basado en tu ADN Musical, Bandify te muestra músicos que vibran en tu misma frecuencia. Filtra por instrumento, ciudad o género y contáctalos directamente desde la app.',
    puntos: ['Match por sonido, no por etiquetas', 'Chat directo sin intermediarios', 'Explora perfiles con demos reales'],
    preview: (
      <div className="flex flex-col gap-2.5">
        {[
          { nombre: 'Valentina M.', inst: 'Vocalista · Santiago', pct: 94 },
          { nombre: 'Rodrigo A.',   inst: 'Bajista · Valparaíso', pct: 87 },
          { nombre: 'Camila R.',    inst: 'Baterista · Santiago', pct: 82 },
        ].map((m) => (
          <div key={m.nombre} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-bold flex-shrink-0">{m.nombre[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{m.nombre}</p>
              <p className="text-white/40 text-xs">{m.inst}</p>
            </div>
            <span className="text-green-400 text-xs font-black flex-shrink-0">{m.pct}%</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '03',
    icon: Ticket,
    color: 'from-pink-500/20 to-pink-600/10',
    border: 'border-pink-500/30',
    iconColor: 'text-pink-400',
    titulo: 'Toca en vivo',
    subtitulo: 'Publica y descubre tocatas en Chile',
    desc: 'Explora eventos de la comunidad y grandes conciertos en un solo lugar. Publica tu propia tocata, vende entradas y haz crecer tu audiencia en la escena musical chilena.',
    puntos: ['Eventos de la comunidad + Ticketmaster', 'Vende entradas con MercadoPago', 'Mapa de eventos por ciudad'],
    preview: (
      <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/8">
        <div className="h-24 bg-gradient-to-br from-pink-900/40 to-purple-900/40 flex items-center justify-center">
          <Ticket size={32} className="text-pink-400/60" />
        </div>
        <div className="p-4 flex flex-col gap-2">
          <p className="text-white font-bold text-sm">Noche de Jazz Vol. 4</p>
          <p className="text-white/40 text-xs flex items-center gap-1"><CalendarDays size={11} /> Sáb 14 Jun · Club Chocolate, Santiago</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-pink-400 text-sm font-black">$5.000</span>
            <span className="text-xs bg-pink-500/15 border border-pink-400/20 text-pink-300 px-2.5 py-1 rounded-full">Jazz</span>
          </div>
        </div>
      </div>
    ),
  },
]

function ComoFunciona({ onBack }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <section className="flex-1 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <BackButton onClick={onBack} />

        <h2 className="text-2xl font-bold text-white mb-2 text-center">Cómo funciona</h2>
        <p className="text-white/40 text-sm text-center mb-10">Tres pasos para ser parte de la escena musical</p>

        {/* Barra de progreso */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className="flex-1 flex flex-col items-center gap-2 group">
              <div className={`w-full h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-purple-400' : 'bg-white/10'}`} />
              <span className={`text-xs font-semibold transition-colors ${i === step ? 'text-white' : 'text-white/30 group-hover:text-white/50'}`}>
                {s.num}
              </span>
            </button>
          ))}
        </div>

        {/* Contenido del paso */}
        <div className={`rounded-3xl border bg-gradient-to-br ${current.color} ${current.border} p-7 mb-6 transition-all duration-300`}>
          <div className="flex flex-col md:flex-row gap-8">

            {/* Info */}
            <div className="flex-1 flex flex-col gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 border ${current.border} flex items-center justify-center`}>
                <Icon size={22} className={current.iconColor} />
              </div>
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">{current.subtitulo}</p>
                <h3 className="text-white font-black text-xl mb-3">{current.titulo}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{current.desc}</p>
              </div>
              <ul className="flex flex-col gap-2 mt-2">
                {current.puntos.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-white/70 text-sm">
                    <Check size={14} className={current.iconColor} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Preview */}
            <div className="md:w-56 flex-shrink-0">
              {current.preview}
            </div>
          </div>
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors disabled:opacity-0 text-sm font-medium"
          >
            <ChevronLeft size={15} /> Anterior
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors text-sm font-semibold"
            >
              Siguiente <ChevronRight size={15} />
            </button>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
            >
              Crear mi perfil <ChevronRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Nav items ─────────────────────────────────────────────────

const GOOEY_ITEMS = [
  { label: 'Noticias',      href: '#' },
  { label: 'Tocatas',       href: '#' },
  { label: 'Cómo funciona', href: '#' },
]

const VIEW_FROM_INDEX = ['noticias', 'tocatas', 'como']

// ── Página principal ──────────────────────────────────────────

export default function Landing() {
  const { user, token } = useAuth()
  const navigate        = useNavigate()
  const [view, setView] = useState('home')

  const handleExploreClick = () => {
    if (user && token) {
      navigate('/explore')
    } else {
      navigate('/auth')
    }
  }

  const { data: noticiasData } = useQuery({
    queryKey: ['landing-noticias'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/noticias?q=música`)
      if (!res.ok) return { articles: [] }
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })
  const noticias = noticiasData?.articles ?? []

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ position: 'relative' }}>

      {/* ── Aurora: fondo fijo, capa inferior ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <SoftAurora
          speed={0.5}
          scale={1.4}
          brightness={1.1}
          color1="#c4b5fd"
          color2="#5227FF"
          noiseFrequency={2.5}
          noiseAmplitude={0.9}
          bandHeight={0.45}
          bandSpread={1.2}
          octaveDecay={0.15}
          layerOffset={0.4}
          colorSpeed={0.8}
          enableMouseInteraction
          mouseInfluence={0.2}
        />
      </div>

      {/* ── Todo el contenido sobre la aurora ── */}
      <div className="flex flex-col flex-1" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Navbar ── */}
        <nav
          className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 border-b border-white/10"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', '--gooey-bg': '#000000' }}
        >
          <Link to="/" onClick={() => setView('home')} className="font-black text-sm tracking-widest text-white hover:opacity-80 transition-opacity">
            BANDIFY
          </Link>

          <div className="hidden md:block">
            <GooeyNav
              items={GOOEY_ITEMS}
              particleCount={15}
              particleDistances={[90, 10]}
              particleR={100}
              initialActiveIndex={-1}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
              onItemClick={(index) => setView(VIEW_FROM_INDEX[index])}
            />
          </div>

          {user ? (
            <Link
              to="/profile"
              className="px-4 py-2 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Mi perfil
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth?mode=login"
                className="px-4 py-2 rounded-full text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Iniciar sesión
              </Link>
              <WhiteBtn to="/auth" className="px-4 py-2 text-sm">
                Registrarse
              </WhiteBtn>
            </div>
          )}
        </nav>

        {/* ════ Vista: HOME ════ */}
        {view === 'home' && (
          <>
            {/* Hero */}
            <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-10">

              {/* Nombre de la marca */}
              <h1
                className="text-7xl md:text-9xl font-black tracking-widest mb-4 select-none"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #818cf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  letterSpacing: '0.15em',
                }}
              >
                BANDIFY
              </h1>

              {/* Tagline */}
              <p className="text-white/50 text-sm font-semibold uppercase tracking-[0.3em] mb-10">
                La escena musical chilena
              </p>

              {/* Subtítulo */}
              <p className="text-white/45 text-base max-w-sm mb-10 leading-relaxed">
                Analiza tu ADN Musical con IA, conecta con músicos compatibles y encuentra tocatas en tu ciudad.
              </p>

              {/* CTAs */}
              <button
                onClick={handleExploreClick}
                className="px-7 py-3.5 rounded-full font-semibold transition-colors"
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e7e5e4' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff' }}
              >
                Explorar perfiles
              </button>
            </section>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 md:gap-16 px-6 pb-10">
              {[
                { valor: '+500', label: 'Músicos' },
                { valor: '+30',  label: 'Tocatas' },
                { valor: '5',    label: 'Ciudades' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-0.5">
                  <span className="text-white font-black text-2xl">{s.valor}</span>
                  <span className="text-white/35 text-xs font-medium">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Marquee géneros */}
            <div className="overflow-hidden py-4 border-t border-white/6 mb-2" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
              <div className="flex gap-3 animate-marquee whitespace-nowrap" style={{ animation: 'marquee 20s linear infinite' }}>
                {['Jazz', 'Rock', 'Cumbia', 'Indie', 'Electrónica', 'Hip-Hop', 'Reggaetón', 'Folk', 'Metal', 'Pop', 'Funk', 'Blues', 'Trap', 'Bossa Nova', 'Jazz', 'Rock', 'Cumbia', 'Indie', 'Electrónica', 'Hip-Hop', 'Reggaetón', 'Folk', 'Metal', 'Pop', 'Funk', 'Blues'].map((g, i) => (
                  <span key={i} className="px-4 py-1.5 rounded-full border border-white/10 text-white/35 text-xs font-medium bg-white/3 flex-shrink-0">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <style>{`
              @keyframes marquee {
                from { transform: translateX(0); }
                to   { transform: translateX(-50%); }
              }
            `}</style>
          </>
        )}

        {/* ════ Vista: NOTICIAS ════ */}
        {view === 'noticias' && (
          <section className="flex-1 px-8 py-14">
            <div className="max-w-5xl mx-auto">
              <BackButton onClick={() => setView('home')} />
              <h2 className="text-2xl font-bold text-white mb-7">
                Noticias para Músicos
              </h2>
              {!noticiasData ? (
                <p className="text-white/40 text-sm">Cargando noticias...</p>
              ) : noticias.length === 0 ? (
                <p className="text-white/40 text-sm">No hay noticias disponibles en este momento.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {noticias.map((n, i) => <NoticiaCard key={i} noticia={n} />)}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ════ Vista: TOCATAS ════ */}
        {view === 'tocatas' && (
          <section className="flex-1 overflow-x-hidden">
            <TocatasBoard isHome limit={6} onBack={() => setView('home')} />
          </section>
        )}

        {/* ════ Vista: CÓMO FUNCIONA ════ */}
        {view === 'como' && <ComoFunciona onBack={() => setView('home')} />}

        <Footer onLogoClick={() => setView('home')} />
      </div>
    </div>
  )
}
