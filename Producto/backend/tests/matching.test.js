/**
 * UT-02: GET /matching/buscar
 * Valida que los resultados retornen en array ordenado de mayor a menor
 * por la propiedad `compatibilidad` (decreciente).
 *
 * Mocks:
 *   - ../src/db/index       → pool.query simulado (sin PostgreSQL real)
 *   - ../src/db/migrations  → silenciado (no ejecutar en tests)
 *   - ../src/utils/s3Client → silenciado
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

// ── Silenciar migrations para que no consuman mocks durante app.listen ────────
jest.mock('../src/db/migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/db/index', () => ({
  query: jest.fn(),
}));

jest.mock('../src/utils/mailer', () => ({
  sendAdnReadyEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/s3Client', () => ({}));

const pool = require('../src/db/index');
const app  = require('../src/app');

// Vector sintético de 27 dimensiones
const MOCK_VECTOR = Array.from({ length: 27 }, (_, i) => (i / 26).toFixed(6));
const VECTOR_STR  = `[${MOCK_VECTOR.join(',')}]`;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const USUARIO_ID = 'user-uuid-001';
const validToken = jwt.sign(
  { id: USUARIO_ID, email: 'test@bandify.cl', nombre: 'Tester' },
  JWT_SECRET
);

// Candidatos pre-ordenados de MAYOR a MENOR compatibilidad (como los devuelve la BD)
const CANDIDATOS_ORDENADOS = [
  { id: 'c2', nombre: 'Artista B', ciudad: 'Valparaíso', instrumento: 'Bajo',
    s3_key: 'demos/b.mp3', user_tags: ['Jazz'], oficio: ['Bajista'],
    experiencia: '3 años', bio: 'Bio B', foto_url: null,
    instagram_url: null, spotify_url: null, discord_url: null,
    card_settings: null, shared_tags: [], compatibilidad: '90.0' },
  { id: 'c4', nombre: 'Artista D', ciudad: 'Santiago', instrumento: 'Voz',
    s3_key: 'demos/d.mp3', user_tags: ['Pop'], oficio: ['Vocalista'],
    experiencia: '2 años', bio: 'Bio D', foto_url: null,
    instagram_url: null, spotify_url: null, discord_url: null,
    card_settings: null, shared_tags: [], compatibilidad: '80.1' },
  { id: 'c1', nombre: 'Artista A', ciudad: 'Santiago', instrumento: 'Guitarra',
    s3_key: 'demos/a.mp3', user_tags: ['Rock'], oficio: ['Guitarrista'],
    experiencia: '5 años', bio: 'Bio A', foto_url: null,
    instagram_url: null, spotify_url: null, discord_url: null,
    card_settings: null, shared_tags: [], compatibilidad: '72.5' },
  { id: 'c3', nombre: 'Artista C', ciudad: 'Concepción', instrumento: 'Batería',
    s3_key: 'demos/c.mp3', user_tags: ['Metal'], oficio: ['Baterista'],
    experiencia: '7 años', bio: 'Bio C', foto_url: null,
    instagram_url: null, spotify_url: null, discord_url: null,
    card_settings: null, shared_tags: [], compatibilidad: '55.3' },
];

// Helper: configura los 2 mocks que el controlador de matching necesita
function setupMatchingMocks(audioVector = VECTOR_STR, userTags = ['Rock', 'Jazz'], candidatos = CANDIDATOS_ORDENADOS) {
  pool.query.mockReset();
  pool.query
    .mockResolvedValueOnce({ rows: [{ audio_vector: audioVector, user_tags: userTags }] })
    .mockResolvedValueOnce({ rows: candidatos });
}

describe('UT-02 — GET /matching/buscar', () => {
  test('retorna 401 sin token', async () => {
    const res = await request(app).get('/matching/buscar');
    expect(res.status).toBe(401);
  });

  test('retorna un array con status 200', async () => {
    setupMatchingMocks();

    const res = await request(app)
      .get('/matching/buscar')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('array ordenado de mayor a menor compatibilidad (decreciente)', async () => {
    setupMatchingMocks();

    const res = await request(app)
      .get('/matching/buscar')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    const items = res.body;
    expect(items.length).toBeGreaterThan(1);

    for (let i = 0; i < items.length - 1; i++) {
      const curr = parseFloat(items[i].compatibilidad);
      const next = parseFloat(items[i + 1].compatibilidad);
      expect(curr).toBeGreaterThanOrEqual(next);
    }
  });

  test('el mayor porcentaje está primero (90.0)', async () => {
    setupMatchingMocks();

    const res = await request(app)
      .get('/matching/buscar')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(parseFloat(res.body[0].compatibilidad)).toBe(90.0);
  });

  test('cada resultado tiene la propiedad compatibilidad numérica', async () => {
    setupMatchingMocks();

    const res = await request(app)
      .get('/matching/buscar')
      .set('Authorization', `Bearer ${validToken}`);

    res.body.forEach((item) => {
      expect(item).toHaveProperty('compatibilidad');
      expect(isNaN(parseFloat(item.compatibilidad))).toBe(false);
    });
  });

  test('retorna 400 si el usuario no tiene audio_vector', async () => {
    pool.query.mockReset();
    pool.query.mockResolvedValueOnce({ rows: [{ audio_vector: null, user_tags: [] }] });

    const res = await request(app)
      .get('/matching/buscar')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('retorna 400 si el perfil no existe', async () => {
    pool.query.mockReset();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/matching/buscar')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
  });
});
