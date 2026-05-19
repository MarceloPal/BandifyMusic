/**
 * Helpers compartidos para visualización del vector de audio (27 dims).
 *
 * Layout del vector:
 *   [0-12]  MFCCs
 *   [13-24] Chroma STFT (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
 *   [25]    Tempo normalizado (/ 200)
 *   [26]    Energía RMS
 *
 * CAMBIO v3: El género ya NO se calcula automáticamente.
 * La identidad artística es manual (user_tags, oficio).
 * En su lugar se exponen tres DESCRIPTORES TÉCNICOS:
 *   • Densidad Rítmica    — BPM + presencia percusiva
 *   • Brillo Espectral    — espectro de altas frecuencias (MFCC[1])
 *   • Riqueza Armónica    — contenido melódico/armónico (HPSS + Chroma)
 */

export const CHROMA_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Parsea el vector pgvector (string o array) a float[] de 27. */
export function parseVector(raw) {
  if (!raw) return null
  const v = Array.isArray(raw)
    ? raw
    : String(raw).replace(/[[\]]/g, '').split(',').map(Number)
  return v.length === 27 ? v : null
}

/** Parsea audio_metadata (JSONB o string JSON) a objeto. */
export function parseMetadata(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return null }
}

/**
 * Deriva las métricas visuales a partir del vector y la metadata del servidor.
 *
 * Retorna descriptores técnicos en lugar de género.
 */
export function deriveStats(v, meta) {
  // ── Parámetros base ──────────────────────────────────────────────────────
  const bpm       = Math.round(v[25] * 200)
  const energiaRaw = v[26]
  const energia   = Math.min(100, Math.round(energiaRaw * 1000))
  const mfcc1     = v[1]
  const brillo    = Math.min(100, Math.max(0, Math.round(((mfcc1 + 50) / 100) * 100)))
  const chroma    = v.slice(13, 25)
  const chromaAvg = chroma.reduce((a, b) => a + b, 0) / 12

  const harmonyPct = meta?.harmony_ratio != null
    ? Math.round(meta.harmony_ratio * 100)
    : Math.round(chromaAvg * 100)
  const percussivePct = meta?.percussive_ratio != null
    ? Math.round(meta.percussive_ratio * 100)
    : 100 - harmonyPct

  // ── Tres descriptores técnicos ───────────────────────────────────────────
  // Densidad Rítmica: cuánta "pulso" hay en el audio (BPM + presencia percusiva)
  const bpmNorm        = Math.min(100, Math.round(bpm / 2))   // BPM 0-200 → 0-100
  const densidadRitmica = Math.round(bpmNorm * 0.55 + percussivePct * 0.45)

  // Brillo Espectral: ya calculado como `brillo` (MFCC[1])
  const brilloEspectral = brillo

  // Riqueza Armónica: armonía HPSS + diversidad Chroma
  const chromaDiversidad = Math.min(100, Math.round(chromaAvg * 200))
  const riquezaArmonica  = Math.round(harmonyPct * 0.65 + chromaDiversidad * 0.35)

  // ── Textura (sigue siendo calculada en cliente) ──────────────────────────
  const texture = classifyTexture(brillo, energia)

  return {
    bpm, energia, brillo, chroma, chromaAvg,
    harmonyPct, percussivePct,
    densidadRitmica,
    brilloEspectral,
    riquezaArmonica,
    texture,
  }
}

function classifyTexture(brillo, energia) {
  if (brillo > 65 && energia > 45) return { label: 'Rudo / Metálico',     icon: 'Zap'      }
  if (brillo < 35 && energia < 30) return { label: 'Suave / Acústico',    icon: 'Wind'     }
  if (brillo > 52 && energia < 35) return { label: 'Brillante / Aireado', icon: 'Sparkles' }
  return                           { label: 'Equilibrado',                 icon: 'Activity' }
}

/* ─── Resumen visual (mood + tonalidad + géneros) ──────────────────────── */

/** Mood / atmósfera en una sola palabra con color. */
export function deriveMood(stats) {
  const { energia, brillo, densidadRitmica, riquezaArmonica } = stats
  if (energia > 65 && densidadRitmica > 60) return { label: 'Enérgico',    color: '#f97316' }
  if (brillo < 35 && energia < 40)          return { label: 'Oscuro',      color: '#6366f1' }
  if (brillo > 60 && energia < 45)          return { label: 'Etéreo',      color: '#06b6d4' }
  if (riquezaArmonica > 65)                 return { label: 'Melódico',    color: '#a855f7' }
  if (densidadRitmica > 70)                 return { label: 'Pulsante',    color: '#ef4444' }
  if (energia < 30 && densidadRitmica < 40) return { label: 'Calmado',     color: '#22c55e' }
  return                                          { label: 'Equilibrado', color: '#7c3aed' }
}

/** Detecta la tonalidad usando los perfiles de Krumhansl-Schmuckler. */
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

export function detectKey(chroma) {
  if (!chroma || chroma.length !== 12) return null
  let best = { score: -Infinity, label: null }
  for (let i = 0; i < 12; i++) {
    let maj = 0, min = 0
    for (let j = 0; j < 12; j++) {
      const idx = (j + i) % 12
      maj += chroma[idx] * KS_MAJOR[j]
      min += chroma[idx] * KS_MINOR[j]
    }
    if (maj > best.score) best = { score: maj, label: `${CHROMA_LABELS[i]} mayor` }
    if (min > best.score) best = { score: min, label: `${CHROMA_LABELS[i]} menor` }
  }
  return best.label
}

/** Sugiere 2-3 géneros según los descriptores. */
export function suggestGenres(stats) {
  const { bpm, energia, brillo, densidadRitmica, riquezaArmonica, percussivePct } = stats
  if (bpm > 130 && percussivePct > 55) {
    return brillo > 55 ? ['Electrónica', 'Techno', 'House'] : ['Drum & Bass', 'Metal', 'Punk']
  }
  if (energia > 60 && brillo < 45)                  return ['Hip-Hop', 'Trap', 'Rock alternativo']
  if (riquezaArmonica > 60 && densidadRitmica < 50) return ['Indie', 'Folk', 'Jazz']
  if (energia < 35 && densidadRitmica < 40)         return ['Ambient', 'Lo-fi', 'Cinemático']
  if (brillo > 60 && energia > 45)                  return ['Pop', 'Synthwave', 'Indie pop']
  if (bpm > 100)                                    return ['Pop', 'Indie', 'Alternativo']
  return                                                   ['Acústico', 'Folk', 'Cinemático']
}

// ── Constantes compartidas ────────────────────────────────────────────────────

/** Roles disponibles para el campo "oficio". */
export const OFICIOS = [
  'Músico', 'Productor', 'DJ', 'Técnico de Sonido',
  'Compositor', 'Cantante', 'Arreglista', 'Ingeniero de Mezcla',
  'Banda / Agrupación', 'Beatmaker', 'Remixer', 'Baterista',
  'Guitarrista', 'Bajista', 'Tecladista', 'Vocalista',
  'Otro',
]

/**
 * Etiquetas de estilo/género disponibles para "user_tags".
 * El frontend impone un límite de selección (MAX_TAGS) en los formularios
 * para mantener la calidad del matching musical.
 */
export const TAG_OPTIONS = [
  // ── Géneros principales ──
  'Rock', 'Pop', 'Jazz', 'Electrónica', 'Metal', 'Hip-Hop',
  'Indie', 'Clásica', 'Blues', 'Funk', 'R&B', 'Folclore', 'Alternativo',
  // ── Urbano / Latino ──
  'Urbano', 'Trap Latino', 'Neo-Perreo', 'Reggaetón', 'Cumbia', 'Latina',
  'Reggaetón Alternativo', 'Trap Soul',
  // ── Rock / Punk variantes ──
  'Punk', 'Ska', 'Reggae', 'Dream Pop', 'Metalcore', 'Nu Metal',
  'Post-Punk', 'Math Rock', 'Indie Shoegaze',
  // ── Electrónica ──
  'House', 'Drum & Bass', 'Jungle', 'Ambient', 'Synthwave',
  'Lo-fi Beats', 'Techno Progresivo', 'Dubstep', 'EDM',
  // ── Cantautor / Soul ──
  'Cantautor', 'Trova', 'Neo-Soul',
]

/** Máximo de tags que un usuario puede seleccionar (calidad del matching). */
export const MAX_TAGS = 5

/**
 * Ciudades/regiones principales de Chile.
 * Lista cerrada para evitar typos en DB y facilitar matching por ciudad.
 * Orden geográfico aproximado de norte a sur.
 */
export const CIUDADES_CHILE = [
  'Arica', 'Iquique', 'Antofagasta', 'Copiapó',
  'La Serena', 'Coquimbo', 'Valparaíso', 'Viña del Mar',
  'Santiago', 'Rancagua', 'Talca', 'Chillán',
  'Concepción', 'Temuco', 'Valdivia', 'Osorno',
  'Puerto Montt', 'Castro', 'Coyhaique', 'Punta Arenas',
]
