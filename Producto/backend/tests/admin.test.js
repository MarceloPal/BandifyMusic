const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockClient = { query: jest.fn().mockResolvedValue({ rowCount: 1 }), release: jest.fn() };
jest.mock('../src/db/index', () => ({
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockClient)
}));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../src/utils/mailer', () => ({ sendAdnReadyEmail: jest.fn() }));

const pool = require('../src/db/index');
const app = require('../src/app');
const adminToken = jwt.sign({ id: 'adm-1', email: 'admin@b.cl', role: 'admin' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales Totales - Admin', () => {
  beforeEach(() => { 
    // Mock Suizo: filas genéricas para que todos los métodos pasen felices
    pool.query.mockResolvedValue({ 
      rows: [{ id: '1', count: '10', semana: '2026', cantidad: 5, titulo: 'T', descripcion: 'D', link: 'L', monto: 1000, estado: 'resuelto', role: 'admin' }], 
      rowCount: 1 
    }); 
  });

  test('GET /api/admin/stats', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/admin/usuarios', async () => {
    const res = await request(app).get('/api/admin/usuarios').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('PATCH /api/admin/usuarios/:id', async () => {
    const res = await request(app).patch('/api/admin/usuarios/1').set('Authorization', `Bearer ${adminToken}`).send({ role: 'admin' });
    expect(res.status).toBe(200);
  });

  test('GET /api/admin/tocatas', async () => {
    const res = await request(app).get('/api/admin/tocatas').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('DELETE /api/admin/tocatas/:id', async () => {
    const res = await request(app).delete('/api/admin/tocatas/1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('PATCH /api/admin/reportes/:id', async () => {
    const res = await request(app).patch('/api/admin/reportes/1').set('Authorization', `Bearer ${adminToken}`).send({ estado: 'resuelto' });
    expect(res.status).toBe(200);
  });

  test('POST /api/admin/notificaciones-masivas', async () => {
    const res = await request(app).post('/api/admin/notificaciones-masivas').set('Authorization', `Bearer ${adminToken}`).send({ titulo: 'T', descripcion: 'D' });
    expect(res.status).toBe(200);
  });

  test('GET /api/admin/notificaciones', async () => {
    const res = await request(app).get('/api/admin/notificaciones').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('DELETE /api/admin/notificaciones/:id', async () => {
    const res = await request(app).delete('/api/admin/notificaciones/1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/admin/ventas', async () => {
    const res = await request(app).get('/api/admin/ventas').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});