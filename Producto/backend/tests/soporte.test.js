const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db/index', () => ({ query: jest.fn() }));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../src/utils/mailer', () => ({ sendSupportTicketEmail: jest.fn().mockResolvedValue(undefined) }));

const pool = require('../src/db/index');
const app = require('../src/app');

const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Soporte Controller', () => {
  beforeEach(() => { pool.query.mockReset(); });

  test('POST /api/soporte - Falla si faltan campos (400)', async () => {
    const res = await request(app)
      .post('/api/soporte')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'test@b.cl' }); // falta asunto y mensaje
      
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obligatorio/i);
  });

  test('POST /api/soporte - Crea ticket y notifica por correo (201)', async () => {
    pool.query.mockResolvedValueOnce({ 
      rows: [{ id: 1, email: 'test@b.cl', asunto: 'Ayuda', mensaje: 'Problema' }] 
    });

    const res = await request(app)
      .post('/api/soporte')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'test@b.cl', asunto: 'Ayuda', mensaje: 'Problema' });
      
    expect(res.status).toBe(201);
    expect(res.body.ticket.id).toBe(1);
  });
});