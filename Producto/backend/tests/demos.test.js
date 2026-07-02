const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db/index', () => ({ query: jest.fn() }));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

const pool = require('../src/db/index');
const app = require('../src/app');

const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Demos Controller', () => {
  beforeEach(() => { pool.query.mockReset(); });

  test('GET /demos - Lista demos del usuario (200)', async () => {
    pool.query.mockResolvedValueOnce({ 
      rows: [{ id: 'demo-1', nombre: 'Demo 1', audio_vector: '[0.1, 0.2]' }] 
    });
    const res = await request(app).get('/demos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body[0].audio_vector)).toBe(true);
  });

  test('PUT /demos/:id - Actualiza el cover_url (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'demo-1' }] }); // Verifica que el demo le pertenece
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'demo-1', cover_url: 'keys3.jpg' }] }); // Actualiza
    
    const res = await request(app).put('/demos/demo-1').set('Authorization', `Bearer ${token}`).send({ cover_url: 'keys3.jpg' });
    expect(res.status).toBe(200);
  });

  test('DELETE /demos/:id - Realiza soft-delete correctamente (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'demo-1' }] }); // Verifica propiedad
    pool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE activo = false
    
    const res = await request(app).delete('/demos/demo-1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});