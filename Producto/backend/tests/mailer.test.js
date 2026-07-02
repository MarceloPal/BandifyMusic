// Configuramos el entorno ANTES de importar el módulo
process.env.EMAIL_USER = 'test@b.cl';
process.env.BREVO_API_KEY = 'apikey';

const mailer = require('../src/utils/mailer');
global.fetch = jest.fn();

describe('Pruebas Reales - Utilidad de Correo', () => {
  beforeEach(() => {
    global.fetch.mockReset();
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ messageId: '123' }) });
  });

  test('Envía correo de ADN', async () => {
    await mailer.sendAdnReadyEmail({ to: 'a@a.com', nombre: 'A' });
    expect(fetch).toHaveBeenCalled();
  });

  test('Envía correo de Nuevo Mensaje', async () => {
    await mailer.sendNewMessageEmail({ to: 'a@a.com', nombre: 'A', de_nombre: 'B', preview: 'hola' });
    expect(fetch).toHaveBeenCalled();
  });

  test('Envía correo de Password', async () => {
    await mailer.sendPasswordResetEmail({ to: 'a@a.com', nombre: 'A', resetUrl: 'http' });
    expect(fetch).toHaveBeenCalled();
  });

  test('Envía correo de Soporte', async () => {
    await mailer.sendSupportTicketEmail({ to: 'a@a.com', nombre: 'A', asunto: 'A', mensaje: 'M', ticketId: 1 });
    expect(fetch).toHaveBeenCalled();
  });
});