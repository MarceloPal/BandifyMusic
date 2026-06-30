const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock avanzado para soportar transacciones SQL (BEGIN, COMMIT)
const mockClient = { query: jest.fn(), release: jest.fn() };
jest.mock('../src/db/index', () => ({
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockClient)
}));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

const pool = require('../src/db/index');
const app = require('../src/app');

const token = jwt.sign({ id: 'user-1', email: 'test@bandify.cl' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Usuarios Controller', () => {
  beforeEach(() => { pool.query.mockReset(); mockClient.query.mockReset(); });

  test('GET /usuarios/perfil - Retorna el perfil completo parseado (200)', async () => {
    pool.query.mockResolvedValueOnce({ 
      rows: [{ id: 'user-1', nombre: 'Test', audio_vector: '[0.5, 0.8]', audio_metadata: '{"bpm": 120}' }] 
    });
    const res = await request(app).get('/usuarios/perfil').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.audio_vector)).toBe(true);
  });

  test('GET /usuarios/perfil - Falla si no existe (404)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/usuarios/perfil').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('GET /usuarios/publico/:username - Retorna perfil público sin datos sensibles (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'user-2', nombre: 'PublicUser' }] });
    const res = await request(app).get('/usuarios/publico/PublicUser');
    expect(res.status).toBe(200);
  });

  test('PUT /usuarios/perfil - Actualiza usuario y perfil correctamente (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', nombre: 'Nuevo Nombre' }] }); // Update Usuario
    pool.query.mockResolvedValueOnce({ rows: [] }); // Upsert Perfil
    
    const res = await request(app)
      .put('/usuarios/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nuevo Nombre', bio: 'Nueva biografía', user_tags: ['Rock'] });
      
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Nuevo Nombre');
  });

  test('PUT /usuarios/cambiar-password - Error por contraseña muy corta (400)', async () => {
    const res = await request(app)
      .put('/usuarios/cambiar-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ passwordActual: '12345678', passwordNueva: '123' });
    expect(res.status).toBe(400);
  });

  test('DELETE /usuarios/cuenta - Elimina cuenta en transacción y hace commit (200)', async () => {
    mockClient.query.mockResolvedValue({ rowCount: 1 });
    const res = await request(app).delete('/usuarios/cuenta').set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });
});