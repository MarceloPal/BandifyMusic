/**
 * UT-03: GET /audio/upload-url
 * Valida que la presigned URL de S3 se genera con expiración exacta de 300 s (5 min).
 *
 * Mocks:
 *   - @aws-sdk/s3-request-presigner → getSignedUrl capturado para verificar expiresIn
 *   - ../src/db/index               → pool.query simulado
 *   - ../src/db/migrations          → silenciado
 *   - ../src/utils/s3Client         → silenciado
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

// ── Capturamos el argumento expiresIn de getSignedUrl ────────────────────────
const mockGetSignedUrl = jest.fn().mockResolvedValue(
  'https://s3.amazonaws.com/bandify-bucket/demos/test.mp3?X-Amz-Expires=300&X-Amz-Signature=abc123'
);

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock('../src/utils/s3Client', () => ({}));

jest.mock('../src/db/index', () => ({
  query: jest.fn(),
}));

jest.mock('../src/db/migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/mailer', () => ({
  sendAdnReadyEmail: jest.fn().mockResolvedValue(undefined),
}));

const pool = require('../src/db/index');
const app  = require('../src/app');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const USUARIO_ID = 'user-uuid-002';
const validToken = jwt.sign(
  { id: USUARIO_ID, email: 'audio@bandify.cl', nombre: 'AudioTester' },
  JWT_SECRET
);

beforeEach(() => {
  mockGetSignedUrl.mockClear();
  pool.query.mockReset();
  // El controlador uploadUrl hace 1 query: SELECT es_premium FROM usuarios
  pool.query.mockResolvedValue({ rows: [{ es_premium: false }] });
});

describe('UT-03 — Presigned URL con expiración de 300 s', () => {
  test('llama a getSignedUrl con expiresIn exactamente igual a 300', async () => {
    const res = await request(app)
      .get('/audio/upload-url?ext=mp3')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);

    // El tercer argumento de getSignedUrl es { expiresIn: number }
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options).toMatchObject({ expiresIn: 300 });
  });

  test('la respuesta incluye uploadUrl y s3Key', async () => {
    const res = await request(app)
      .get('/audio/upload-url?ext=mp3')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('s3Key');
    expect(typeof res.body.uploadUrl).toBe('string');
    expect(res.body.s3Key).toMatch(/^demos\//);
  });

  test('rechaza extensión no permitida con 400', async () => {
    const res = await request(app)
      .get('/audio/upload-url?ext=exe')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('retorna 401 sin token', async () => {
    const res = await request(app).get('/audio/upload-url?ext=mp3');
    expect(res.status).toBe(401);
  });

  test('la URL generada contiene el parámetro de expiración en el mock', async () => {
    const res = await request(app)
      .get('/audio/upload-url?ext=wav')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toContain('X-Amz-Expires=300');
  });

  test('getSignedUrl NO es llamado cuando la extensión es inválida', async () => {
    await request(app)
      .get('/audio/upload-url?ext=docx')
      .set('Authorization', `Bearer ${validToken}`);

    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });
});
