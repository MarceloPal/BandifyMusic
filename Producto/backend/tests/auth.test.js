const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mockeamos bcrypt para asegurar que el Login recorra el Happy Path
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pass'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/db/index', () => ({ query: jest.fn() }));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

// Arreglo del .catch() retornando una Promesa válida
jest.mock('../src/utils/mailer', () => ({ 
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true) 
}));

const pool = require('../src/db/index');
const app = require('../src/app');

describe('Pruebas Reales - Auth Controller', () => {
  beforeEach(() => { 
    // Mock Suizo: siempre devuelve datos válidos para que las funciones no se rompan a la mitad
    pool.query.mockResolvedValue({ 
      rows: [{ id: '1', nombre: 'Test', email: 'test@b.cl', password_hash: 'hash', role: 'user', used: false, expires_at: new Date(Date.now() + 100000) }], 
      rowCount: 1 
    }); 
  });

  test('POST /auth/registro - Crea usuario', async () => {
    // Simulamos 2 fallos (no existe email, no existe username) y 1 éxito (insert)
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1', nombre: 't', email: 't@t.com', role: 'user' }] });

    const res = await request(app).post('/auth/registro').send({ nombre: 'tester', email: 't@t.com', password: 'pass' });
    expect(res.status).toBe(201);
  });

  test('POST /auth/login - Inicia sesión exitosamente', async () => {
    const res = await request(app).post('/auth/login').send({ identifier: 'test@b.cl', password: 'pass' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /auth/forgot-password - Genera token', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: 'test@b.cl' });
    expect(res.status).toBe(200);
  });

  test('POST /auth/reset-password - Cambia contraseña', async () => {
    const res = await request(app).post('/auth/reset-password').send({ token: 'abc', password: 'newpassword123' });
    expect(res.status).toBe(200);
  });
});