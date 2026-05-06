import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'
import { API_URL } from '../../utils/helpers'
import './Noticias.css'

const FILTROS = [
  { label: 'Música',      q: 'música'      },
  { label: 'Conciertos',  q: 'conciertos'  },
  { label: 'Álbumes',     q: 'álbumes'     },
  { label: 'Indie Chile', q: 'indie chile' },
]

async function fetchNoticias(q) {
  const res = await fetch(`${API_URL}/api/noticias?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error('Error cargando noticias')
  return res.json()
}

function SkeletonCard() {
  return (
    <div className="noticia-skeleton">
      <div className="skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line medium" />
      </div>
    </div>
  )
}

export default function Noticias() {
  const [filtro, setFiltro] = useState('música')

  const { data, isLoading, isError } = useQuery({
    queryKey:  ['noticias', filtro],
    queryFn:   () => fetchNoticias(filtro),
    staleTime: 5 * 60 * 1000,
  })

  const articles = data?.articles ?? []

  return (
    <div className="noticias-container">
      <div className="noticias-header">
        <div className="noticias-header-icon">
          <Newspaper size={20} />
        </div>
        <div>
          <h1 className="noticias-title">Noticias Musicales</h1>
          <p className="noticias-subtitle">Lo último del mundo de la música</p>
        </div>
      </div>

      <div className="noticias-filtros">
        {FILTROS.map(({ label, q }) => (
          <button
            key={q}
            className={`filtro-btn${filtro === q ? ' active' : ''}`}
            onClick={() => setFiltro(q)}
          >
            {label}
          </button>
        ))}
      </div>

      {isError && (
        <p className="noticias-error">
          No se pudieron cargar las noticias. Intenta de nuevo más tarde.
        </p>
      )}

      <div className="noticias-grid">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : articles.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="noticia-card"
              >
                <div className="noticia-img-wrap">
                  <img
                    src={article.urlToImage}
                    alt={article.title}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
                  />
                </div>
                <div className="noticia-body">
                  <span className="noticia-fuente">{article.source?.name}</span>
                  <h3 className="noticia-titulo">{article.title}</h3>
                  {article.description && (
                    <p className="noticia-desc">{article.description}</p>
                  )}
                  <span className="noticia-fecha">
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString('es-CL', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })
                      : ''}
                  </span>
                </div>
              </a>
            ))}
      </div>
    </div>
  )
}
