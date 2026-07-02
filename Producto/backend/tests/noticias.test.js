const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db/index', () => ({ query: jest.fn() }));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));
global.fetch = jest.fn();

const pool = require('../src/db/index');
const app = require('../src/app');

const adminToken = jwt.sign({ id: 'admin-1', role: 'admin' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Noticias Controller', () => {
  beforeEach(() => { pool.query.mockReset(); global.fetch.mockReset(); });

  test('GET /api/noticias - Retorna noticias locales y externas (200)', async () => {
    pool.query.mockResolvedValueOnce({ 
      rows: [{ id: 1, title: 'Local', description: 'Test', source_name: 'Bandify' }] 
    });
    // Forzamos error en GNews para probar que no rompe la API
    global.fetch.mockRejectedValueOnce(new Error('GNews fail'));

    const res = await request(app).get('/api/noticias');
    expect(res.status).toBe(200);
    expect(res.body.articles[0].isLocal).toBe(true);
  });

  test('POST /api/noticias - Admin puede crear noticia (201)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, titulo: 'Nueva' }] });

    const res = await request(app)
      .post('/api/noticias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ titulo: 'Nueva', contenido: 'Contenido' });

    expect(res.status).toBe(201);
  });

  test('DELETE /api/noticias/:id - Admin puede eliminar noticia (200)', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).delete('/api/noticias/1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});