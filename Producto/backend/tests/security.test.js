/**
 * ST-01: Seguridad — Control de acceso entre usuarios
 *
 * Valida que un usuario autenticado con JWT válido NO puede acceder a
 * recursos que pertenecen a un ID de usuario diferente.
 *
 * Mocks:
 *   - ../src/db/index      → pool.query capturado
 *   - ../src/db/migrations → silenciado
 *   - fetch                → IA Service silenciado
 *   - @aws-sdk/*           → silenciados
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

global.fetch = jest.fn();

jest.mock('../src/db/migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/db/index', () => ({
  query: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock.s3.com/url'),
}));

jest.mock('../src/utils/s3Client', () => ({}));

jest.mock('../src/utils/mailer', () => ({
  sendAdnReadyEmail: jest.fn().mockResolvedValue(undefined),
}));

const pool = require('../src/db/index');
const app  = require('../src/app');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const USER_A_ID  = 'user-a-uuid';
const USER_B_ID  = 'user-b-uuid';
const JOB_B_ID   = 'job-b-uuid';

const tokenA = jwt.sign({ id: USER_A_ID, email: 'a@bandify.cl', nombre: 'User A' }, JWT_SECRET);
const tokenB = jwt.sign({ id: USER_B_ID, email: 'b@bandify.cl', nombre: 'User B' }, JWT_SECRET);
const expiredToken = jwt.sign(
  { id: USER_A_ID, email: 'a@bandify.cl', nombre: 'User A' },
  JWT_SECRET,
  { expiresIn: -1 }
);

function jobRowOf(ownerId) {
  return {
    id:         JOB_B_ID,
    usuario_id: ownerId,
    s3_key:     'demos/b.mp3',
    status:     'done',
    ia_job_id:  null,
    demo_id:    null,
    created_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  pool.query.mockReset();
  global.fetch.mockReset();
});

describe('ST-01 — Control de acceso entre usuarios', () => {
  test('usuario A recibe 403 al intentar acceder a un job de usuario B', async () => {
    // Job pertenece a B — petición viene de A
    pool.query.mockResolvedValueOnce({ rows: [jobRowOf(USER_B_ID)] });

    const res = await request(app)
      .get(`/audio/jobs/${JOB_B_ID}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('usuario B puede acceder a su propio job (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [jobRowOf(USER_B_ID)] });

    const res = await request(app)
      .get(`/audio/jobs/${JOB_B_ID}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  test('token expirado recibe 401 en cualquier ruta protegida', async () => {
    const res = await request(app)
      .get(`/audio/jobs/${JOB_B_ID}`)
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('petición sin token recibe 401', async () => {
    const res = await request(app).get(`/audio/jobs/${JOB_B_ID}`);
    expect(res.status).toBe(401);
  });

  test('token con firma alterada recibe 401', async () => {
    const tamperedToken = tokenA.slice(0, -5) + 'XXXXX';

    const res = await request(app)
      .get(`/audio/jobs/${JOB_B_ID}`)
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
  });

  test('usuario A no puede acceder a matching sin su propio vector de audio (400)', async () => {
    // Perfil sin audio_vector → matching controller devuelve 400
    pool.query.mockResolvedValueOnce({ rows: [{ audio_vector: null, user_tags: [] }] });

    const res = await request(app)
      .get('/matching/buscar')
      .set('Authorization', `Bearer ${tokenA}`);

    // 400 = sin demo analizado; no puede ver datos de matching de nadie
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('usuario sin token no puede usar el endpoint de análisis de audio', async () => {
    const res = await request(app)
      .post('/audio/analyze')
      .send({ s3Key: 'demos/fake.mp3' });

    expect(res.status).toBe(401);
  });

  test('usuario A obtiene 404 si el job de B no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/audio/jobs/no-existe-id')
      .set('Authorization', `Bearer ${tokenA}`);

    // 404 porque no existe, no 200 ni 403
    expect(res.status).toBe(404);
  });
});
