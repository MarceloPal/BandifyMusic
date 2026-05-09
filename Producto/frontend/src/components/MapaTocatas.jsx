import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Calendar, MapPin, Ticket } from 'lucide-react'

// ─── CSS de Leaflet (obligatorio) ───────────────────────────────────────────
import 'leaflet/dist/leaflet.css'

// ─── FIX VITE: iconos de marcador rotos al hacer build ──────────────────────
// Vite no resuelve correctamente las URLs internas que Leaflet arma con
// require/new URL. Importamos los assets manualmente y sobreescribimos
// el prototipo del icono por defecto.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
})
// ────────────────────────────────────────────────────────────────────────────

// Centro por defecto: Plaza Baquedano, Santiago
const SANTIAGO_CENTER = [-33.4372, -70.6344]
const DEFAULT_ZOOM    = 12

// Mock temporal — se usa solo cuando no hay tocatas con coordenadas reales,
// para que el componente sea visible al copiar/pegar antes de wirear el
// backend con lat/lng reales.
const TOCATAS_MOCK = [
  {
    id: 'mock-1',
    nombre: 'Noche de Rock Latino',
    recinto: 'Bar Loreto',
    ciudad: 'Recoleta, Santiago',
    fecha: '2026-05-20',
    precio_min: 8000,
    genero: 'Rock',
    lat: -33.4275,
    lng: -70.6396,
  },
  {
    id: 'mock-2',
    nombre: 'Festival Indie Santiago',
    recinto: 'Centro Arte Alameda',
    ciudad: 'Providencia, Santiago',
    fecha: '2026-06-05',
    precio_min: 12000,
    genero: 'Indie',
    lat: -33.4470,
    lng: -70.6260,
  },
  {
    id: 'mock-3',
    nombre: 'Jazz Sessions',
    recinto: 'Thelonious Bar',
    ciudad: 'Bellavista, Santiago',
    fecha: '2026-05-28',
    precio_min: 6000,
    genero: 'Jazz',
    lat: -33.4324,
    lng: -70.6347,
  },
]

/**
 * Re-encuadra el mapa cuando el array de puntos cambia (filtro de género, etc.)
 */
function FitBoundsToMarkers({ points }) {
  const map = useMap()

  useMemo(() => {
    if (!points?.length) return
    if (points.length === 1) {
      map.setView(points[0], 14)
    } else {
      map.fitBounds(points, { padding: [40, 40] })
    }
  }, [points, map])

  return null
}

/**
 * Normaliza un evento (Ticketmaster) o tocata (comunidad) a la shape común
 * { lat, lng, ... } aceptando varias formas: lat/lng directos o coordenadas:{lat,lng}
 */
function normalize(item) {
  return {
    ...item,
    lat: item.lat ?? item.coordenadas?.lat ?? null,
    lng: item.lng ?? item.coordenadas?.lng ?? null,
  }
}

export default function MapaTocatas({ tocatas = [] }) {
  // Filtrar solo los que tengan coordenadas válidas
  const itemsConCoords = tocatas
    .map(normalize)
    .filter(t => t.lat != null && t.lng != null)

  // Fallback a mock si no hay datos reales con coords (modo demo)
  const items       = itemsConCoords.length > 0 ? itemsConCoords : TOCATAS_MOCK
  const usandoMock  = itemsConCoords.length === 0
  const points      = items.map(t => [t.lat, t.lng])

  return (
    // ⚠️ relative z-0 → crea un stacking context que CONTIENE los z-index altos
    // que Leaflet usa internamente (controles, popups van hasta z-1000).
    // Sin esto, el navbar sticky/fixed queda tapado por el mapa.
    <div className="relative z-0">

      {/* Banner de modo demo */}
      {usandoMock && (
        <div className="absolute top-3 left-3 z-[1000] bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[11px] font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
          Vista demo — los eventos reales aún no tienen coordenadas
        </div>
      )}

      <div className="h-[600px] w-full rounded-xl overflow-hidden border border-white/10">
        <MapContainer
          center={SANTIAGO_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* OpenStreetMap — gratis, sin API key */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBoundsToMarkers points={points} />

          {items.map((t) => (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>
                <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#18181b' }}>
                    {t.nombre}
                  </h3>

                  {(t.recinto || t.direccion) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', marginBottom: 4 }}>
                      <MapPin size={12} />
                      <span>
                        {t.recinto ?? t.direccion}
                        {t.ciudad ? ` · ${t.ciudad}` : ''}
                      </span>
                    </div>
                  )}

                  {t.fecha && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', marginBottom: 4 }}>
                      <Calendar size={12} />
                      <span>
                        {new Date(t.fecha + (t.fecha?.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {t.precio_min != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', marginBottom: 8 }}>
                      <Ticket size={12} />
                      <span>Desde ${Number(t.precio_min).toLocaleString('es-CL')}</span>
                    </div>
                  )}

                  {t.precio != null && t.precio_min == null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', marginBottom: 8 }}>
                      <Ticket size={12} />
                      <span>${Number(t.precio).toLocaleString('es-CL')}</span>
                    </div>
                  )}

                  {t.genero && t.genero !== 'Undefined' && (
                    <span style={{
                      display: 'inline-block',
                      background: '#7c3aed',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {t.genero}
                    </span>
                  )}

                  {t.url && (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        marginTop: 10,
                        background: '#7c3aed',
                        color: 'white',
                        textAlign: 'center',
                        padding: '7px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Ver entradas
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
