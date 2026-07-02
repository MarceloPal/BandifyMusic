const request = require('supertest');
const app = require('../src/app');

// Mockeamos fetch para no llamar a Ticketmaster en cada prueba
global.fetch = jest.fn();
jest.mock('../src/db/migrations', () => ({ runMigrations: jest.fn().mockResolvedValue(undefined) }));

describe('Pruebas Reales - Eventos Controller (Ticketmaster)', () => {
  beforeEach(() => { global.fetch.mockReset(); });

  test('GET /api/eventos - Retorna eventos mapeados correctamente (200)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({
        page: { totalElements: 1, totalPages: 1, number: 0 },
        _embedded: { events: [{ id: '1', name: 'Concierto Test', dates: { start: { localDate: '2026-10-10' } } }] }
      })
    });

    const res = await request(app).get('/api/eventos?ciudad=Santiago');
    expect(res.status).toBe(200);
    expect(res.body.eventos[0].nombre).toBe('Concierto Test');
  });

  test('GET /api/eventos - Maneja el error si la API externa falla (500/etc)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false, status: 500, json: async () => ({ fault: { faultstring: 'API Error' } })
    });

    const res = await request(app).get('/api/eventos');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('API Error');
  });
});