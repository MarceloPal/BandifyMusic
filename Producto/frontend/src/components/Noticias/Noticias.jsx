import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Newspaper, X, ExternalLink, Calendar, Globe } from 'lucide-react'
import { API_URL } from '../../utils/helpers'
import './Noticias.css'

const FILTROS = [
  { label: 'Música',      q: 'música'      },
  { label: 'Conciertos',  q: 'conciertos'  },
  { label: 'Álbumes',     q: 'álbumes'     },
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
  const [selectedArticle, setSelectedArticle] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey:           ['noticias', filtro],
    queryFn:            () => fetchNoticias(filtro),
    staleTime:          0,
    refetchOnWindowFocus: false,
  })

  const articles = data?.articles ?? []

  const closeModal = () => setSelectedArticle(null)

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
              <div
                key={i}
                role="button"
                tabIndex={0}
                className="noticia-card cursor-pointer"
                onClick={() => setSelectedArticle(article)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedArticle(article) }}
              >
                <div className="noticia-img-wrap">
                  {article.isLocal && (
                    <div className="local-badge">BANDIFY</div>
                  )}
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
              </div>
            ))}
      </div>

      {/* Modal Lector de Noticias */}
      {selectedArticle && (
        <div className="news-modal-overlay" onClick={closeModal} onKeyDown={(e) => e.key === 'Escape' && closeModal()} role="presentation">
          <div className="news-modal-content" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>
              <X size={24} />
            </button>
            
            <div className="modal-hero">
              <img src={selectedArticle.urlToImage} alt={selectedArticle.title} />
              <div className="modal-hero-overlay" />
              <div className="modal-header-info">
                <span className={`modal-tag ${selectedArticle.isLocal ? 'local' : ''}`}>
                  {selectedArticle.source?.name || 'Bandify'}
                </span>
                <h2 className="modal-title">{selectedArticle.title}</h2>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-meta">
                <div className="meta-item">
                  <Calendar size={14} />
                  <span>
                    {new Date(selectedArticle.publishedAt).toLocaleDateString('es-CL', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                </div>
                {!selectedArticle.isLocal && (
                  <div className="meta-item">
                    <Globe size={14} />
                    <span>Fuente externa</span>
                  </div>
                )}
              </div>

              <div className="modal-text-content">
                {selectedArticle.description.split('\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              <div className="modal-footer">
                {!selectedArticle.isLocal ? (
                  <a 
                    href={selectedArticle.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more-btn"
                  >
                    Leer noticia completa en la fuente
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <div className="bandify-signature">
                    <div className="signature-line" />
                    <p>Comunicado oficial de Bandify</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
