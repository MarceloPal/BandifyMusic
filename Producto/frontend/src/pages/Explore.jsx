/**
 * Explorador de Colaboradores
 *
 * Al entrar, si el usuario ya tiene demo analizado, la búsqueda se lanza
 * automáticamente con los filtros pre-poblados desde su propio perfil:
 *   • Ciudad      → filtra client-side (texto libre)
 *   • Tags de género → filtra server-side (OR entre los tags activos)
 *
 * El orden lo determina el backend con un score de precisión:
 *   60 % similitud por tags + 40 % similitud por IA (audio).
 *
 * El usuario puede ver los chips activos y eliminarlos para ampliar la búsqueda.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Sparkles, Search, X, ChevronDown, ChevronUp, Filter, Tag,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL, getInitials } from '../utils/helpers'
import { useImageUrl } from '../hooks/useImageUrl'
import { OFICIOS, TAG_OPTIONS } from '../utils/audioHelpers'
import ProfileDrawer from '../components/ProfileDrawer'

const FETCH_LIMIT = 20

// Insensible a mayúsculas y tildes: "Santiago" ≡ "sántiago" ≡ "SANTIAGO"
function normalizeStr(s) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// ── Chip de filtro activo (con botón de cierre) ───────────────────────────────
function FilterChip({ label, onRemove, purple = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border select-none ${
        purple
          ? 'bg-purple-500/15 text-purple-200 border-purple-500/40'
          : 'bg-zinc-700 text-zinc-200 border-zinc-600'
      }`}
    >
      {label}
      <button
        onClick={onRemove}
        className="opacity-60 hover:opacity-100 transition-opacity"
        aria-label={`Quitar filtro ${label}`}
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </span>
  )
}

// ── Tarjeta de músico ─────────────────────────────────────────────────────────
function MusicianCard({ musico, rank, onClick }) {
  const [imageError, setImageError] = useState(false)
  const { url: photoUrl }           = useImageUrl(musico.foto_url ?? null)

  const oficio     = Array.isArray(musico.oficio)      ? musico.oficio      : []
  const user_tags  = Array.isArray(musico.user_tags)   ? musico.user_tags   : []
  const sharedTags = Array.isArray(musico.shared_tags) ? musico.shared_tags : []

  const matchReason = sharedTags.length > 0
    ? `Comparten ${sharedTags.slice(0, 2).join(' y ')}${sharedTags.length > 2 ? ' y más' : ''}`
    : 'Estética sonora similar'

  return (
    <button
      onClick={onClick}
      className="bg-zinc-800 rounded-2xl p-5 flex flex-col gap-3.5 border border-white/8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left w-full"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {photoUrl && !imageError ? (
            <img
              src={photoUrl}
              alt={musico.nombre}
              onError={() => setImageError(true)}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {getInitials(musico.nombre)}
            </div>
          )}
          <div>
            <p className="text-zinc-100 font-semibold text-sm leading-tight">{musico.nombre}</p>
            {musico.instrumento && (
              <p className="text-zinc-400 text-xs mt-0.5">{musico.instrumento}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full tabular-nums">
            {musico.compatibilidad}%
          </span>
          <span className="text-zinc-600 text-xs">#{rank}</span>
        </div>
      </div>

      {/* Bio breve */}
      {musico.bio && (
        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">{musico.bio}</p>
      )}

      {/* Chips de contexto */}
      <div className="flex flex-wrap gap-1.5">
        {musico.ciudad && (
          <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded-full border border-zinc-700">
            📍 {musico.ciudad}
          </span>
        )}
        {musico.experiencia != null && (
          <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded-full border border-zinc-700">
            {musico.experiencia}a exp.
          </span>
        )}
        {oficio.slice(0, 1).map((o) => (
          <span key={o} className="bg-purple-500/10 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-500/30">
            {o}
          </span>
        ))}
        {user_tags.slice(0, 2).map((t) => (
          <span key={t} className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded-full border border-zinc-700">
            {t}
          </span>
        ))}
      </div>

      {/* Badge de explicación del match */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-white/5">
        <p className="text-zinc-500 text-[11px] leading-tight">
          <span className="text-purple-400">✦</span>
          {' '}{matchReason}
        </p>
        <p className="text-purple-400 text-xs font-semibold shrink-0">Ver perfil →</p>
      </div>
    </button>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Explore() {
  const { token, user } = useAuth()

  // Filtros server-side: re-fetch al cambiar. Inicia con los tags propios del usuario.
  const [tagFiltros, setTagFiltros] = useState(
    () => (Array.isArray(user?.user_tags) ? user.user_tags : [])
  )

  // Filtros client-side: se aplican sobre los resultados ya cargados.
  const [ciudadFiltro, setCiudadFiltro] = useState(() => user?.ciudad || '')
  const [ciudadInput,  setCiudadInput]  = useState(() => user?.ciudad || '')
  const [oficioFiltro, setOficioFiltro] = useState('')
  const [searchText,   setSearchText]   = useState('')

  // Auto-busca si el usuario ya tiene demo analizado; si no, muestra el CTA.
  const [hasSearched,    setHasSearched]    = useState(() => !!user?.audio_vector)
  const [showFilters,    setShowFilters]    = useState(false)
  const [selectedMusico, setSelectedMusico] = useState(null)

  const tagsParam = tagFiltros.join(',')

  const { data: matches = [], isLoading, error, refetch } = useQuery({
    queryKey: ['matches', tagsParam, FETCH_LIMIT],
    queryFn: async () => {
      const qs = new URLSearchParams({ limite: String(FETCH_LIMIT) })
      if (tagsParam) qs.set('tags', tagsParam)
      const res  = await fetch(`${API_URL}/matching/buscar?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    enabled: hasSearched && !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const handleBuscar = () => {
    if (!hasSearched) setHasSearched(true)
    else refetch()
  }

  const premiumFilterAlert = () => {
    alert('Los filtros avanzados por género y ubicación son exclusivos del Plan Premium.');
  }

  const toggleTag = (tag) => {
    if (!user?.es_premium) {
      premiumFilterAlert()
      return
    }
    setTagFiltros((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleOficioChange = (e) => {
    if (!user?.es_premium) {
      setOficioFiltro('')
      premiumFilterAlert()
      return
    }
    setOficioFiltro(e.target.value)
  }

  const commitCiudad = () => {
    if (!user?.es_premium) {
      setCiudadInput('')
      setCiudadFiltro('')
      premiumFilterAlert()
      return
    }
    setCiudadFiltro(ciudadInput.trim())
  }

  const limpiarFiltros = () => {
    setTagFiltros([])
    setCiudadFiltro('')
    setCiudadInput('')
    setOficioFiltro('')
    setSearchText('')
  }

  // Buscador inteligente: detecta si el texto coincide con un género de TAG_OPTIONS
  const suggestedTag = useMemo(() => {
    const norm = normalizeStr(searchText)
    if (!norm || norm.length < 2) return null
    const match = TAG_OPTIONS.find((tag) => normalizeStr(tag).startsWith(norm))
    return match && !tagFiltros.includes(match) ? match : null
  }, [searchText, tagFiltros])

  const applyTagSuggestion = () => {
    if (!suggestedTag) return
    toggleTag(suggestedTag)
    setSearchText('')
  }

  const filtrados = useMemo(() => {
    const ciudadNorm = normalizeStr(ciudadFiltro)
    const searchNorm = normalizeStr(searchText)
    return matches.filter((m) => {
      const okCiudad = !ciudadNorm || normalizeStr(m.ciudad).includes(ciudadNorm)
      const okOficio = !oficioFiltro || (Array.isArray(m.oficio) && m.oficio.includes(oficioFiltro))
      const okNombre = !searchNorm  || normalizeStr(m.nombre).includes(searchNorm)
      return okCiudad && okOficio && okNombre
    })
  }, [matches, ciudadFiltro, oficioFiltro, searchText])

  const activeChips = [
    ciudadFiltro
      ? {
          key:      'ciudad',
          label:    `📍 ${ciudadFiltro}`,
          purple:   false,
          onRemove: () => { setCiudadFiltro(''); setCiudadInput('') },
        }
      : null,
    ...tagFiltros.map((tag) => ({
      key:      tag,
      label:    tag,
      purple:   true,
      onRemove: () => toggleTag(tag),
    })),
    oficioFiltro
      ? {
          key:      'oficio',
          label:    oficioFiltro,
          purple:   false,
          onRemove: () => setOficioFiltro(''),
        }
      : null,
    searchText.trim()
      ? {
          key:      'search',
          label:    `🔍 "${searchText.trim()}"`,
          purple:   false,
          onRemove: () => setSearchText(''),
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="relative">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Users size={24} className="text-purple-400" />
          Explorar Colaboradores
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          La IA combina similitud sonora y géneros compartidos para ordenar los músicos.
        </p>
      </div>

      {/* ── CTA: solo cuando el usuario no tiene demo analizado ── */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="bg-zinc-800 rounded-3xl p-10 text-center max-w-sm w-full border border-white/8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-5">
              <Sparkles size={28} className="text-purple-500" />
            </div>
            <h2 className="text-zinc-100 font-bold text-xl mb-2">
              ¿Quieres buscar tus colaboradores?
            </h2>
            <p className="text-zinc-500 text-sm mb-7 leading-relaxed">
              Nuestra IA combina similitud sonora y coincidencia de géneros
              para mostrarte los músicos más afines a tu estilo.
            </p>
            <button
              onClick={handleBuscar}
              className="w-full bg-purple-600 text-white font-semibold py-3.5 rounded-full text-sm hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
            >
              <Search size={15} />
              Descubrir músicos
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {hasSearched && isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-purple-400 animate-spin" />
          <p className="text-zinc-500 text-sm">Buscando colaboradores compatibles...</p>
        </div>
      )}

      {/* ── Error ── */}
      {hasSearched && error && !isLoading && (
        <div className="bg-zinc-800 rounded-2xl p-10 text-center max-w-md mx-auto border border-white/8 shadow-sm">
          <p className="text-zinc-400 text-sm mb-5">{error.message}</p>
          {error.message?.toLowerCase().includes('demo') && (
            <a
              href="/mi-adn"
              className="px-6 py-2.5 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-500 transition-colors"
            >
              Subir mi demo
            </a>
          )}
        </div>
      )}

      {/* ── Resultados ── */}
      {hasSearched && !isLoading && !error && (
        <>
          {/* ── Buscador inteligente ── */}
          <div className="mb-4">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Busca por nombre o escribe un género (ej: Jazz, Trap…)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyTagSuggestion()}
                className="w-full bg-zinc-800 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 shadow-sm"
              />
            </div>

            {suggestedTag && (
              <button
                onClick={applyTagSuggestion}
                className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-purple-200 bg-purple-500/15 border border-purple-500/40 px-3 py-1.5 rounded-full hover:bg-purple-500/25 transition-colors"
              >
                <Tag size={10} />
                Añadir «{suggestedTag}» como filtro de género
              </button>
            )}
          </div>

          {/* Chips de filtros activos */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-zinc-800/60 rounded-2xl border border-white/8">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wide shrink-0">
                Filtros activos:
              </span>
              {activeChips.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  purple={chip.purple}
                  onRemove={chip.onRemove}
                />
              ))}
              <button
                onClick={limpiarFiltros}
                className="ml-auto text-xs text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1"
              >
                <X size={10} />
                Limpiar todo
              </button>
            </div>
          )}

          {/* Barra de conteo + toggle de filtros */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-sm">
              <span className="font-semibold text-zinc-100">{filtrados.length}</span>
              {' '}músico{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
              {activeChips.length > 0 && (
                <span className="text-zinc-500"> · con filtros activos</span>
              )}
            </p>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <Filter size={11} />
              Filtros
              {showFilters ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {activeChips.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-black flex items-center justify-center">
                  {activeChips.length}
                </span>
              )}
            </button>
          </div>

          {/* Panel de filtros expandible */}
          {showFilters && (
            <div className="bg-zinc-800 rounded-2xl p-5 border border-white/8 shadow-sm mb-5 flex flex-col gap-5">

              {/* Ciudad (client-side) */}
              <div>
                <label className="block text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">
                  Ciudad
                </label>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ej: Santiago, Valparaíso..."
                    value={ciudadInput}
                    onChange={(e) => setCiudadInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && commitCiudad()}
                    onBlur={commitCiudad}
                    className="w-full bg-zinc-900 text-zinc-100 placeholder-zinc-500 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 border border-white/8"
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-1">Presiona Enter para aplicar</p>
              </div>

              {/* Rol / Oficio (client-side) */}
              <div>
                <label className="block text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">
                  Rol / Oficio
                </label>
                <select
                  value={oficioFiltro}
                  onChange={handleOficioChange}
                  className="w-full bg-zinc-900 text-zinc-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 border border-white/8"
                >
                  <option value="">Todos los roles</option>
                  {OFICIOS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Estilo musical (server-side: multi-select, re-fetch al cambiar) */}
              <div>
                <label className="block text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                  Estilo musical
                </label>
                <p className="text-zinc-500 text-xs mb-3">
                  Muestra músicos con al menos uno de los géneros seleccionados.
                  Los géneros activos también mejoran la precisión del score.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        tagFiltros.includes(tag)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Grid de resultados */}
          {filtrados.length === 0 ? (
            <div className="bg-zinc-800 rounded-2xl p-10 text-center border border-white/8 shadow-sm">
              <p className="text-zinc-400 text-sm mb-3">
                {activeChips.length > 0
                  ? 'Ningún músico coincide con los filtros activos.'
                  : 'Aún no hay músicos registrados con demo analizado.'}
              </p>
              {activeChips.length > 0 && (
                <button
                  onClick={limpiarFiltros}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-semibold underline underline-offset-2"
                >
                  Quitar todos los filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtrados.map((musico, i) => (
                <MusicianCard
                  key={musico.id}
                  musico={musico}
                  rank={i + 1}
                  onClick={() => setSelectedMusico(musico)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ProfileDrawer */}
      {selectedMusico && (
        <ProfileDrawer
          musico={selectedMusico}
          onClose={() => setSelectedMusico(null)}
        />
      )}
    </div>
  )
}
