const { getCoordinates } = require('../src/utils/geocoder');
global.fetch = jest.fn();

describe('Pruebas Reales - Utilidad Geocoder (Mapas)', () => {
  beforeEach(() => { global.fetch.mockReset(); });

  test('Retorna coordenadas válidas desde OpenStreetMap', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ([{ lat: '-33.4', lon: '-70.6' }]) });
    const res = await getCoordinates('Santiago');
    expect(res.lat).toBe(-33.4);
    expect(res.lng).toBe(-70.6);
  });

  test('Retorna null si se envía un texto vacío', async () => {
    const res = await getCoordinates('');
    expect(res.lat).toBeNull();
  });

  test('Maneja errores de red sin romper la app', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    const res = await getCoordinates('Santiago');
    expect(res.lat).toBeNull();
  });
});