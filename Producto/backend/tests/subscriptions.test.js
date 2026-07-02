const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mockeamos la SDK de MercadoPago
jest.mock('mercadopago', () => {
  return {
    MercadoPagoConfig: jest.fn(),
    Preference: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockResolvedValue({ init_point: 'https://mp.com/checkout' })
    }))
  };
});
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

const app = require('../src/app');
const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Subscriptions Controller', () => {
  test('POST /api/subscriptions/checkout - Crea preferencia y retorna URL (200)', async () => {
    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.init_point).toBe('https://mp.com/checkout');
  });
});