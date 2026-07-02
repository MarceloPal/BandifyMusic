const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Preference: jest.fn().mockImplementation(() => ({ create: jest.fn().mockResolvedValue({ init_point: 'url' }) }))
}));
jest.mock('../src/utils/geocoder', () => ({ getCoordinates: jest.fn().mockResolvedValue({ lat: -33, lng: -70 }) }));
jest.mock('../src/db/index', () => ({ query: jest.fn() }));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

const pool = require('../src/db/index');
const app = require('../src/app');
const token = jwt.sign({ id: 'org-1' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales Totales - Tocatas', () => {
  beforeEach(() => { 
    // Mock Suizo
    pool.query.mockResolvedValue({ 
      rows: [{ id: '1', organizador_id: 'org-1', estado: 'activo', es_premium: true, precio: 1000, cantidad_disponible: 100, total_vendidas: 10, recaudacion_clp: 10000 }], 
      rowCount: 1 
    }); 
  });

  test('GET /tocatas', async () => {
    const res = await request(app).get('/tocatas?ciudad=Stgo').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('POST /tocatas', async () => {
    const res = await request(app).post('/tocatas').set('Authorization', `Bearer ${token}`).send({
      nombre: 'N', fecha: '2026-01-01', ciudad: 'C', edad_minima: '+18'
    });
    expect(res.status).toBe(201);
  });

  test('GET /tocatas/:id', async () => {
    const res = await request(app).get('/tocatas/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('PATCH /tocatas/:id', async () => {
    const res = await request(app).patch('/tocatas/1').set('Authorization', `Bearer ${token}`).send({ nombre: 'Mod' });
    expect(res.status).toBe(200);
  });

  test('PATCH /tocatas/:id/cancelar', async () => {
    const res = await request(app).patch('/tocatas/1/cancelar').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('GET /tocatas/:id/tickets', async () => {
    const res = await request(app).get('/tocatas/1/tickets').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('DELETE /tocatas/:id', async () => {
    const res = await request(app).delete('/tocatas/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('POST /tocatas/:id/checkout', async () => {
    const res = await request(app).post('/tocatas/1/checkout').set('Authorization', `Bearer ${token}`).send({ cantidad: 2 });
    expect(res.status).toBe(200);
  });
});