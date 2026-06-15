/**
 * IT-01: Flujo completo Backend ↔ IA Service
 * Simula el ciclo: POST /audio/analyze → GET /audio/jobs/:jobId
 *
 * Valida que:
 *   1. El job se crea con status 'processing'.
 *   2. Cuando el IA Service devuelve { status: 'done', vector: [...] },
 *      GET /audio/jobs/:jobId actualiza la BD y retorna { status: 'done' }
 *      con un vector no nulo persistido en pool.query.
 *
 * Mocks:
 *   - ../src/db/index      → pool.query capturado
 *   - ../src/db/migrations → silenciado (no ejecutar en tests)
 *   - fetch global         → respuestas del IA Service mockeadas
 *   - @aws-sdk/*           → silenciados
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../src/db/migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/db/index', () => ({
  query: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-s3.com/presigned'),
}));

jest.mock('../src/utils/s3Client', () => ({}));

jest.mock('../src/utils/mailer', () => ({
  sendAdnReadyEmail: jest.fn().mockResolvedValue(undefined),
}));

const pool = require('../src/db/index');
const app  = require('../src/app');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const USUARIO_ID = 'user-uuid-003';
const JOB_ID     = 'job-uuid-abc-123';
const IA_JOB_ID  = 'ia-job-uuid-xyz-456';
const DEMO_ID    = 'demo-uuid-789';
const S3_KEY     = 'demos/user-uuid-003.mp3';

const MOCK_VECTOR = Array.from({ length: 27 }, (_, i) => parseFloat((i * 0.04).toFixed(4)));

const validToken = jwt.sign(
  { id: USUARIO_ID, email: 'integration@bandify.cl', nombre: 'IntTester' },
  JWT_SECRET
);

function mockIaOk(payload) {
  return { ok: true, json: jest.fn().mockResolvedValue(payload) };
}

beforeEach(() => {
  pool.query.mockReset();
  mockFetch.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /audio/analyze → crea job en processing
// ─────────────────────────────────────────────────────────────────────────────

describe('IT-01-A — POST /audio/analyze → crea job en processing', () => {
  function setupAnalyzeMocks() {
    // audioController.analyze llama a pool.query en este orden:
    // 1+2: Promise.all([COUNT demos, SELECT es_premium])
    // 3:   INSERT demos
    // 4:   INSERT jobs
    // 5:   UPDATE jobs SET ia_job_id
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })        // COUNT demos (Promise.all)
      .mockResolvedValueOnce({ rows: [{ es_premium: false }] }) // es_premium (Promise.all)
      .mockResolvedValueOnce({ rows: [{ id: DEMO_ID }] })       // INSERT demos
      .mockResolvedValueOnce({ rows: [{ id: JOB_ID }] })        // INSERT jobs
      .mockResolvedValueOnce({ rows: [] });                      // UPDATE jobs SET ia_job_id

    // IA Service acepta el job
    mockFetch.mockResolvedValueOnce(mockIaOk({ jobId: IA_JOB_ID }));
  }

  test('retorna { status: processing } y un jobId', async () => {
    setupAnalyzeMocks();

    const res = await request(app)
      .post('/audio/analyze')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ s3Key: S3_KEY, nombre: 'Demo de integración' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'processing' });
    expect(res.body).toHaveProperty('jobId');
  });

  test('el jobId retornado es una cadena no vacía', async () => {
    setupAnalyzeMocks();

    const res = await request(app)
      .post('/audio/analyze')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ s3Key: S3_KEY });

    expect(res.status).toBe(200);
    expect(typeof res.body.jobId).toBe('string');
    expect(res.body.jobId.length).toBeGreaterThan(0);
  });

  test('retorna 400 si no se proporciona s3Key', async () => {
    const res = await request(app)
      .post('/audio/analyze')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /audio/jobs/:jobId → transiciona a done con vector no nulo
// ─────────────────────────────────────────────────────────────────────────────

describe('IT-01-B — GET /audio/jobs/:jobId → transiciona a done con vector no nulo', () => {
  function jobRow(overrides = {}) {
    return {
      id:         JOB_ID,
      usuario_id: USUARIO_ID,
      s3_key:     S3_KEY,
      status:     'processing',
      ia_job_id:  IA_JOB_ID,
      demo_id:    DEMO_ID,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  function setupDoneMocks(iaDonePayload) {
    pool.query
      .mockResolvedValueOnce({ rows: [jobRow()] })   // SELECT job
      .mockResolvedValueOnce({ rows: [] })            // INSERT/UPDATE perfiles
      .mockResolvedValueOnce({ rows: [] })            // UPDATE demos
      .mockResolvedValueOnce({ rows: [] })            // UPDATE jobs SET status='done'
      .mockResolvedValueOnce({                        // SELECT nombre/email (mailer fire-and-forget)
        rows: [{ nombre: 'IntTester', email: 'int@bandify.cl' }],
      });

    mockFetch.mockResolvedValueOnce(mockIaOk(iaDonePayload));
  }

  test('retorna status done cuando el IA Service reporta done', async () => {
    setupDoneMocks({
      status:     'done',
      vector:     MOCK_VECTOR,
      mp3_s3_key: S3_KEY,
      metadata:   { tempo_bpm: 120, energy_rms: 0.05 },
    });

    const res = await request(app)
      .get(`/audio/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  test('el vector persistido en BD tiene 27 dimensiones y valores numéricos', async () => {
    setupDoneMocks({
      status:     'done',
      vector:     MOCK_VECTOR,
      mp3_s3_key: S3_KEY,
      metadata:   null,
    });

    await request(app)
      .get(`/audio/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${validToken}`);

    // La 2ª llamada a pool.query es el INSERT/UPDATE de perfiles con el vector
    const perfilCall = pool.query.mock.calls[1];
    expect(perfilCall).toBeDefined();

    // El vector se pasa como JSON string en $2
    const vectorArg = perfilCall[1][1];
    const parsed    = JSON.parse(vectorArg);

    expect(parsed).not.toBeNull();
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(27);
    parsed.forEach((v) => {
      expect(typeof v).toBe('number');
      expect(isNaN(v)).toBe(false);
    });
  });

  test('job aún en processing retorna status processing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [jobRow()] });
    // IA Service responde processing
    mockFetch.mockResolvedValueOnce(mockIaOk({ status: 'processing' }));

    const res = await request(app)
      .get(`/audio/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processing');
  });

  test('retorna 403 si el job pertenece a otro usuario', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [jobRow({ usuario_id: 'otro-user-id' })],
    });

    const res = await request(app)
      .get(`/audio/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(403);
  });

  test('retorna 404 si el job no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/audio/jobs/${JOB_ID}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
  });
});
