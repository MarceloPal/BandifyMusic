import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ArrowLeft, Sparkles, Music, CalendarDays } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'
import Footer from '../components/Footer'
import GooeyNav from '../components/GooeyNav'
import SoftAurora from '../components/SoftAurora'

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

// ── Nav items ─────────────────────────────────────────────────

const GOOEY_ITEMS = [
  { label: 'Noticias',      href: '#' },
  { label: 'Tocatas',       href: '#' },
  { label: 'Cómo funciona', href: '#' },
]

const VIEW_FROM_INDEX = ['noticias', 'tocatas', 'como']

// ── Página principal ──────────────────────────────────────────

export default function Landing() {
  const { user }        = useAuth()
  const [view, setView] = useState('home')

  const { data: proximasTocatas = [], isLoading: tocatasLoading } = useQuery({
    queryKey: ['tocatas-publicas'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tocatas/publicas?limite=6`)
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    enabled: view === 'tocatas',
  })

  const { data: noticiasData } = useQuery({
    queryKey: ['landing-noticias'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/noticias?q=música`)
      if (!res.ok) return { articles: [] }
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
    enabled: view === 'noticias',
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
              initialActiveIndex={0}
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
            <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-white/50 text-sm mb-8">
                <MapPin size={12} />
                Músico independiente, Santiago de Chile
              </div>

              <h1 className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-5">
                Encuentra tu<br />próximo sonido
              </h1>

              <p className="text-white/50 text-base max-w-xs mb-9 leading-relaxed">
                Tu música merece al colaborador indicado.<br />
                Déjanos encontrarlo por ti.
              </p>

              {user ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/8 border border-white/12 text-sm text-white/60">
                    <Sparkles size={13} className="text-purple-400" />
                    Hola de nuevo,{' '}
                    <span className="text-white font-bold">{user.nombre?.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <WhiteBtn to="/explore" className="px-7 py-3.5">Explorar músicos</WhiteBtn>
                    <Link
                      to="/profile"
                      className="px-7 py-3.5 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
                    >
                      Mi perfil
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <WhiteBtn to="/auth" className="px-7 py-3.5">Crear mi perfil</WhiteBtn>
                  <Link
                    to="/auth?mode=login"
                    className="px-7 py-3.5 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              )}

              <p className="mt-7 text-white/25 text-sm">+500 músicos independientes en Chile</p>
            </section>

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
          <section className="flex-1 px-8 py-14">
            <div className="max-w-5xl mx-auto">
              <BackButton onClick={() => setView('home')} />
              <h2 className="text-2xl font-bold text-white mb-7">
                Próximas Tocatas
              </h2>
              {tocatasLoading ? (
                <p className="text-white/40 text-sm">Cargando eventos...</p>
              ) : proximasTocatas.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-10 border border-white/8 flex flex-col items-center gap-3 text-center">
                  <CalendarDays size={28} className="text-white/30" />
                  <p className="text-white/70 font-semibold text-sm">Aún no hay tocatas publicadas</p>
                  <p className="text-white/40 text-xs">
                    Inicia sesión y sé el primero en publicar un evento.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {proximasTocatas.map((t) => <TocataPreviewCard key={t.id} tocata={t} />)}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ════ Vista: CÓMO FUNCIONA ════ */}
        {view === 'como' && (
          <section className="flex-1 px-8 py-14">
            <div className="max-w-5xl mx-auto">
              <BackButton onClick={() => setView('home')} />
              <h2 className="text-2xl font-bold text-white mb-7 text-center">Cómo funciona</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { num: '01', titulo: 'Descubre tu ADN Musical',    desc: 'Sube un audio (.mp3 o .wav) y deja que nuestra IA analice el corazón de tu sonido. Obtendrás un perfil único basado en tu ritmo y energía, sin tener que rellenar aburridos formularios.' },
                  { num: '02', titulo: 'Conecta con tu Banda Ideal', desc: 'Nuestro algoritmo te muestra músicos que realmente vibran en tu misma sintonía. Olvídate de las etiquetas; contacta directamente con colaboradores compatibles para empezar a crear.' },
                  { num: '03', titulo: 'Encuentra tu Próximo Escenario', desc: 'No solo creas música, también la vives. Explora tocatas, conciertos y eventos locales en Chile para tocar o descubrir nuevos sonidos. ¡La escena musical completa en un solo lugar!' },
                ].map((step) => (
                  <div key={step.num} className="bg-white/5 rounded-2xl p-6 border border-white/8">
                    <p className="text-5xl font-black text-white/8 mb-3">{step.num}</p>
                    <p className="text-white font-bold text-sm mb-2">{step.titulo}</p>
                    <p className="text-white/50 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <Footer onLogoClick={() => setView('home')} />
      </div>
    </div>
  )
}
