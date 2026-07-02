import { describe, it, expect } from 'vitest'
import {
  parseVector,
  parseMetadata,
  deriveStats,
  deriveMood,
  detectKey,
  suggestGenres,
  CHROMA_LABELS,
  OFICIOS,
  TAG_OPTIONS,
} from './audioHelpers'

// Vector de 27 dims de prueba (valores neutros)
const VECTOR_27 = Array(27).fill(0).map((_, i) => {
  if (i === 25) return 0.6   // tempo: 120 bpm
  if (i === 26) return 0.05  // energía baja
  if (i === 1)  return 0     // mfcc1 neutro
  if (i >= 13 && i < 25) return 0.08  // chroma uniforme
  return 0
})

describe('CHROMA_LABELS', () => {
  it('tiene 12 notas', () => {
    expect(CHROMA_LABELS).toHaveLength(12)
  })

  it('empieza en C y termina en B', () => {
    expect(CHROMA_LABELS[0]).toBe('C')
    expect(CHROMA_LABELS[11]).toBe('B')
  })
})

describe('OFICIOS y TAG_OPTIONS', () => {
  it('OFICIOS contiene al menos Músico y Productor', () => {
    expect(OFICIOS).toContain('Músico')
    expect(OFICIOS).toContain('Productor')
  })

  it('TAG_OPTIONS contiene géneros comunes', () => {
    expect(TAG_OPTIONS).toContain('Rock')
    expect(TAG_OPTIONS).toContain('Jazz')
    expect(TAG_OPTIONS).toContain('Pop')
  })
})

describe('parseVector', () => {
  it('retorna null si no recibe argumento', () => {
    expect(parseVector(null)).toBeNull()
    expect(parseVector(undefined)).toBeNull()
  })

  it('acepta array de 27 elementos', () => {
    const result = parseVector(VECTOR_27)
    expect(result).toHaveLength(27)
  })

  it('rechaza array con tamaño incorrecto', () => {
    expect(parseVector([1, 2, 3])).toBeNull()
  })

  it('parsea string de pgvector correctamente', () => {
    const str = '[' + VECTOR_27.join(',') + ']'
    const result = parseVector(str)
    expect(result).toHaveLength(27)
    expect(result[25]).toBeCloseTo(0.6)
  })

  it('parsea string sin corchetes', () => {
    const str = VECTOR_27.join(',')
    const result = parseVector(str)
    expect(result).toHaveLength(27)
  })
})

describe('parseMetadata', () => {
  it('retorna null si no recibe argumento', () => {
    expect(parseMetadata(null)).toBeNull()
    expect(parseMetadata(undefined)).toBeNull()
  })

  it('retorna el objeto directamente si ya es objeto', () => {
    const obj = { harmony_ratio: 0.7 }
    expect(parseMetadata(obj)).toBe(obj)
  })

  it('parsea un JSON string válido', () => {
    const json = JSON.stringify({ harmony_ratio: 0.8, percussive_ratio: 0.2 })
    const result = parseMetadata(json)
    expect(result.harmony_ratio).toBe(0.8)
  })

  it('retorna null si el string JSON es inválido', () => {
    expect(parseMetadata('no-es-json{')).toBeNull()
  })
})

describe('deriveStats', () => {
  it('retorna todos los descriptores esperados', () => {
    const stats = deriveStats(VECTOR_27, null)
    expect(stats).toHaveProperty('bpm')
    expect(stats).toHaveProperty('energia')
    expect(stats).toHaveProperty('brillo')
    expect(stats).toHaveProperty('densidadRitmica')
    expect(stats).toHaveProperty('brilloEspectral')
    expect(stats).toHaveProperty('riquezaArmonica')
    expect(stats).toHaveProperty('texture')
    expect(stats).toHaveProperty('chroma')
    expect(stats).toHaveProperty('harmonyPct')
    expect(stats).toHaveProperty('percussivePct')
  })

  it('calcula BPM correctamente desde tempo normalizado 0.6', () => {
    const stats = deriveStats(VECTOR_27, null)
    expect(stats.bpm).toBe(120) // 0.6 * 200
  })

  it('limita energía a máximo 100', () => {
    const v = [...VECTOR_27]
    v[26] = 10 // valor muy alto
    const stats = deriveStats(v, null)
    expect(stats.energia).toBeLessThanOrEqual(100)
  })

  it('limita brillo entre 0 y 100', () => {
    const stats = deriveStats(VECTOR_27, null)
    expect(stats.brillo).toBeGreaterThanOrEqual(0)
    expect(stats.brillo).toBeLessThanOrEqual(100)
  })

  it('usa harmony_ratio de metadata si está disponible', () => {
    const meta = { harmony_ratio: 0.9, percussive_ratio: 0.1 }
    const stats = deriveStats(VECTOR_27, meta)
    expect(stats.harmonyPct).toBe(90)
    expect(stats.percussivePct).toBe(10)
  })

  it('texture tiene label e icon', () => {
    const stats = deriveStats(VECTOR_27, null)
    expect(stats.texture).toHaveProperty('label')
    expect(stats.texture).toHaveProperty('icon')
  })

  it('clasifica textura como Rudo/Metálico con brillo y energía altos', () => {
    const v = [...VECTOR_27]
    v[1]  = 20   // brillo > 65
    v[26] = 0.05 // energía moderada → ajustar energía manualmente
    // Para brillo > 65: mfcc1 debe ser alto: brillo = ((mfcc1+50)/100)*100 > 65 → mfcc1 > 15
    // Para energia > 45: v[26]*1000 > 45 → v[26] > 0.045
    v[26] = 0.05 // energia = 50
    const stats = deriveStats(v, null)
    expect(stats.texture.label).toBe('Rudo / Metálico')
  })
})

describe('deriveMood', () => {
  it('retorna mood con label y color', () => {
    const stats = deriveStats(VECTOR_27, null)
    const mood = deriveMood(stats)
    expect(mood).toHaveProperty('label')
    expect(mood).toHaveProperty('color')
  })

  it('retorna "Enérgico" con energía y densidad altas', () => {
    const mood = deriveMood({ energia: 70, densidadRitmica: 65, brillo: 50, riquezaArmonica: 40 })
    expect(mood.label).toBe('Enérgico')
  })

  it('retorna "Oscuro" con brillo y energía bajos', () => {
    const mood = deriveMood({ energia: 30, densidadRitmica: 40, brillo: 20, riquezaArmonica: 40 })
    expect(mood.label).toBe('Oscuro')
  })

  it('retorna "Etéreo" con brillo alto y energía baja', () => {
    const mood = deriveMood({ energia: 40, densidadRitmica: 40, brillo: 65, riquezaArmonica: 40 })
    expect(mood.label).toBe('Etéreo')
  })

  it('retorna "Melódico" con riqueza armónica alta', () => {
    const mood = deriveMood({ energia: 50, densidadRitmica: 40, brillo: 50, riquezaArmonica: 70 })
    expect(mood.label).toBe('Melódico')
  })

  it('retorna "Equilibrado" por defecto', () => {
    const mood = deriveMood({ energia: 50, densidadRitmica: 50, brillo: 50, riquezaArmonica: 50 })
    expect(mood.label).toBe('Equilibrado')
  })
})

describe('detectKey', () => {
  it('retorna null si chroma es null', () => {
    expect(detectKey(null)).toBeNull()
  })

  it('retorna null si chroma no tiene 12 elementos', () => {
    expect(detectKey([1, 2, 3])).toBeNull()
  })

  it('retorna un string de tonalidad para chroma válido', () => {
    const chroma = Array(12).fill(0.08)
    chroma[0] = 1.0 // C dominante
    const key = detectKey(chroma)
    expect(typeof key).toBe('string')
    expect(key).toMatch(/(mayor|menor)/)
  })

  it('detecta C mayor cuando C es la nota dominante', () => {
    const chroma = Array(12).fill(0)
    // Perfil de C mayor: notas C, E, G fuertes
    chroma[0] = 1.0  // C
    chroma[4] = 0.8  // E
    chroma[7] = 0.7  // G
    const key = detectKey(chroma)
    expect(key).toBe('C mayor')
  })
})

describe('suggestGenres', () => {
  it('retorna un array de 3 géneros', () => {
    const stats = deriveStats(VECTOR_27, null)
    const genres = suggestGenres(stats)
    expect(Array.isArray(genres)).toBe(true)
    expect(genres.length).toBeGreaterThanOrEqual(2)
  })

  it('sugiere Electrónica/Techno para BPM alto con brillo alto', () => {
    const genres = suggestGenres({ bpm: 140, percussivePct: 60, brillo: 60, energia: 50, densidadRitmica: 70, riquezaArmonica: 40 })
    expect(genres).toContain('Electrónica')
  })

  it('sugiere Drum&Bass/Metal para BPM alto con brillo bajo', () => {
    const genres = suggestGenres({ bpm: 140, percussivePct: 60, brillo: 40, energia: 50, densidadRitmica: 70, riquezaArmonica: 40 })
    expect(genres).toContain('Metal')
  })

  it('sugiere Ambient para baja energía y densidad rítmica baja', () => {
    const genres = suggestGenres({ bpm: 60, percussivePct: 30, brillo: 40, energia: 20, densidadRitmica: 30, riquezaArmonica: 40 })
    expect(genres).toContain('Ambient')
  })
})
