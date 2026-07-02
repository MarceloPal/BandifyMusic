const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn().mockResolvedValue('https://s3.com/upload-url') }));
jest.mock('../src/utils/s3Client', () => ({}));
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

const app = require('../src/app');
const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET || 'test');

describe('Pruebas Reales - Images Controller', () => {
  test('GET /images/upload-url - Retorna URL presignada válida (200)', async () => {
    const res = await request(app).get('/images/upload-url?type=avatar&ext=jpg').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBe('https://s3.com/upload-url');
    expect(res.body.key).toMatch(/avatars\//);
  });

  test('GET /images/upload-url - Falla con tipo no autorizado (400)', async () => {
    const res = await request(app).get('/images/upload-url?type=hacker&ext=jpg').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test('GET /images/view-url - Retorna URL de lectura permitida (200)', async () => {
    const res = await request(app).get('/images/view-url?key=avatars/foto.jpg');
    expect(res.status).toBe(200);
  });
});