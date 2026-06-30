const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db/index', () => ({ query: jest.fn() }));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../src/utils/mailer', () => ({ sendNewMessageEmail: jest.fn().mockResolvedValue(undefined) }));

const pool = require('../src/db/index');
const app = require('../src/app');

const token = jwt.sign({ id: 'user-1', nombre: 'User Uno' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Mensajes Controller', () => {
  beforeEach(() => { pool.query.mockReset(); });

  test('POST /mensajes - Crea el mensaje y gatilla el email (201)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ es_premium: true }] }); // Check premium
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'user-2' }] }); // El destinatario existe
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'msg-1', contenido: 'Hola' }] }); // Insert del mensaje
    pool.query.mockResolvedValueOnce({ rows: [{ nombre: 'User 2', email: 'test@b.cl' }] }); // Busca el mail para enviar
    
    const res = await request(app).post('/mensajes').set('Authorization', `Bearer ${token}`).send({ para_id: 'user-2', contenido: 'Hola' });
    expect(res.status).toBe(201);
  });

  test('POST /mensajes - Falla si intenta enviarse un mensaje a sí mismo (400)', async () => {
    const res = await request(app).post('/mensajes').set('Authorization', `Bearer ${token}`).send({ para_id: 'user-1', contenido: 'Hola' });
    expect(res.status).toBe(400);
  });

  test('PUT /mensajes/:id/leer - Marca el mensaje como leído (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'msg-1', para_id: 'user-1' }] }); // Valida que sea el receptor
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'msg-1', leido: true }] }); // Actualiza
    
    const res = await request(app).put('/mensajes/msg-1/leer').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('GET /mensajes/conversaciones - Devuelve conversaciones agrupadas (200)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ partner_id: 'user-2', last_mensaje: 'hola' }] });
    const res = await request(app).get('/mensajes/conversaciones').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});