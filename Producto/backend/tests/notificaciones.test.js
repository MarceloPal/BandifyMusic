const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db/index', () => ({ query: jest.fn() }));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

const pool = require('../src/db/index');
const app = require('../src/app');

const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Notificaciones Controller', () => {
  beforeEach(() => { pool.query.mockReset(); });

  test('GET /notificaciones - Retorna feed combinado (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, contenido: 'msg', de_nombre: 'A' }] }); // mensajes
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, nombre: 'tocata', ciudad: 'X' }] }); // tocatas
    pool.query.mockResolvedValueOnce({ rows: [{ id: 3, nombre: 'demo' }] }); // demos
    pool.query.mockResolvedValueOnce({ rows: [{ id: 4, titulo: 'Aviso', tipo: 'sistema' }] }); // físicas

    const res = await request(app).get('/notificaciones').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('PATCH /notificaciones/leer - Marca todo como leído (200)', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });
    const res = await request(app).patch('/notificaciones/leer').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});