/**
 * Mailer — Envío de correos transaccionales con Resend.
 *
 * Variables de entorno requeridas:
 *   RESEND_API_KEY  — clave de API de Resend
 *   RESEND_FROM     — dirección de envío (ej: "Bandify <noreply@bandify.cl>")
 *   FRONTEND_URL    — URL del frontend (para links en los emails)
 *
 * Funciones exportadas:
 *   sendAdnReadyEmail      — ADN listo tras análisis Hi-Fi
 *   sendNewMessageEmail    — aviso de mensaje nuevo
 *   sendPasswordResetEmail — enlace para restablecer contraseña
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.RESEND_FROM     || 'Bandify <noreply@bandify.cl>';
const APP_URL = process.env.FRONTEND_URL    || 'https://bandify.cl';

/* ─── Helpers de layout ────────────────────────────────────────────────────── */

function wrapHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">

        <!-- Logo strip -->
        <tr>
          <td style="background:#09090b;padding:20px 32px;">
            <span style="color:#fff;font-weight:900;font-size:14px;letter-spacing:4px;">BANDIFY</span>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          ${bodyHtml}
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e7e5e4;background:#fafaf9;">
            <p style="margin:0;font-size:11px;color:#a8a29e;text-align:center;">
              © ${new Date().getFullYear()} Bandify · Red de músicos independientes<br/>
              <a href="${APP_URL}" style="color:#a8a29e;">bandify.cl</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btnHtml(href, text, color = '#09090b') {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:100px;text-decoration:none;margin-top:20px;">${text}</a>`;
}

/* ─── Email 1: ADN listo ───────────────────────────────────────────────────── */

async function sendAdnReadyEmail({ to, nombre }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[MAILER] RESEND_API_KEY no configurada — email ADN omitido');
    return;
  }

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#09090b;">Tu ADN musical está listo ✦</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
      Hola <strong>${nombre}</strong>, el análisis Hi-Fi de tu demo ha finalizado.
      Ahora puedes explorar tus descriptores sonoros — Densidad Rítmica, Brillo Espectral
      y Riqueza Armónica — y ver qué músicos son más compatibles contigo.
    </p>
    <ul style="margin:0 0 16px;padding:0 0 0 18px;color:#78716c;font-size:14px;line-height:1.8;">
      <li>Vector de 27 dimensiones calculado sobre audio sin pérdida.</li>
      <li>Análisis de 3 segmentos: inicio, medio y clímax del track.</li>
      <li>El sistema ya convirtió tu archivo a MP3 para el almacenamiento eficiente.</li>
    </ul>
    ${btnHtml(`${APP_URL}/mi-adn`, 'Ver mi ADN musical →')}`;

  try {
    await resend.emails.send({ from: FROM, to, subject: 'Tu ADN musical Hi-Fi está listo ✦', html: wrapHtml('ADN listo', body) });
    console.log(`[MAILER] ✓ ADN-ready email → ${to}`);
  } catch (err) {
    console.error(`[MAILER] Error enviando ADN-ready a ${to}:`, err.message);
  }
}

/* ─── Email 2: Mensaje nuevo ────────────────────────────────────────────────── */

async function sendNewMessageEmail({ to, nombre, de_nombre, preview }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[MAILER] RESEND_API_KEY no configurada — email mensaje omitido');
    return;
  }

  const previewText = preview
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #e7e5e4;color:#57534e;font-size:14px;font-style:italic;">"${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}"</blockquote>`
    : '';

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#09090b;">Tienes un mensaje nuevo 💬</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
      Hola <strong>${nombre}</strong>, <strong>${de_nombre}</strong>
      te ha enviado un mensaje en Bandify.
    </p>
    ${previewText}
    <p style="margin:0;font-size:13px;color:#a8a29e;">
      Responde para conectar y avanzar en tu próximo proyecto musical.
    </p>
    ${btnHtml(`${APP_URL}/messages`, 'Responder →')}`;

  try {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: `💬 ${de_nombre} te escribió en Bandify`,
      html:    wrapHtml('Mensaje nuevo', body),
    });
    console.log(`[MAILER] ✓ New-message email → ${to}`);
  } catch (err) {
    console.error(`[MAILER] Error enviando mensaje a ${to}:`, err.message);
  }
}

/* ─── Email 3: Recuperación de contraseña ─────────────────────────────────── */

async function sendPasswordResetEmail({ to, nombre, resetUrl }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[MAILER] RESEND_API_KEY no configurada — email reset omitido');
    return;
  }

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#09090b;">Recupera tu contraseña</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
      Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer
      la contraseña de tu cuenta de Bandify.
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#57534e;">
      Haz clic en el botón para crear una nueva contraseña.
      Este enlace expira en <strong>1 hora</strong>.
    </p>
    ${btnHtml(resetUrl, 'Restablecer contraseña →', '#7c3aed')}
    <p style="margin:20px 0 0;font-size:12px;color:#a8a29e;">
      Si no solicitaste esto, puedes ignorar este correo. Tu contraseña no cambiará.
    </p>`;

  try {
    await resend.emails.send({
      from:    FROM,
      to,
      subject: 'Restablece tu contraseña de Bandify',
      html:    wrapHtml('Recuperar contraseña', body),
    });
    console.log(`[MAILER] ✓ Password-reset email → ${to}`);
  } catch (err) {
    console.error(`[MAILER] Error enviando reset a ${to}:`, err.message);
  }
}

module.exports = { sendAdnReadyEmail, sendNewMessageEmail, sendPasswordResetEmail };
