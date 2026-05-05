import { Link } from 'react-router-dom'

const NAV_COLUMNS = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Explorar',       to: '/explore' },
      { label: 'Tocatas',        to: '/' },
      { label: 'Mi ADN Musical', to: '/mi-adn' },
    ],
  },
  {
    title: 'Comunidad',
    links: [
      { label: 'Sobre nosotros', to: '/' },
      { label: 'Soporte',        to: '/' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de servicio',   to: '/' },
      { label: 'Política de privacidad', to: '/' },
    ],
  },
  {
    title: 'Académico',
    links: [
      { label: 'Repositorio', href: 'https://github.com/MarceloPal/BandifyMusic' },
    ],
  },
]

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Footer({ onLogoClick }) {
  return (
    <footer className="bg-zinc-950 border-t border-white/8 flex-shrink-0">

      {/* ── Cuerpo principal ── */}
      <div className="max-w-6xl mx-auto px-8 py-12 flex flex-col md:flex-row md:items-start gap-10">

        {/* Logo + copyright */}
        <div className="flex flex-col gap-3 flex-shrink-0 md:self-center">
          <Link
            to="/"
            onClick={onLogoClick}
            className="font-black text-white tracking-widest text-sm hover:opacity-70 transition-opacity"
          >
            BANDIFY
          </Link>
          <p className="text-white/20 text-xs">Bandify © 2026</p>
        </div>

        {/* Separador vertical */}
        <div className="hidden md:block w-px self-stretch bg-white/10 mx-4" />

        {/* Columnas de navegación */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-8 flex-1">
          {NAV_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-purple-400 text-xs font-semibold tracking-wide uppercase mb-3">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 text-xs hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-white/40 text-xs hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Barra inferior ── */}
      <div className="border-t border-white/6 max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
        <span className="text-white/30 text-xs tracking-wide">ES 🇨🇱</span>

        <a
          href="https://www.instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-white/30 hover:text-white transition-colors"
        >
          <InstagramIcon />
        </a>
      </div>

    </footer>
  )
}
