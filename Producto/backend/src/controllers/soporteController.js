/**
 * Controlador de Soporte al Cliente.
 * Gestiona los tickets de soporte enviados por usuarios.
 */

const pool = require('../db/index');

/**
 * POST /api/soporte — crear un ticket de soporte.
 * Recibe: email, asunto, mensaje
 * Opcionalmente: usuario_id desde req.usuario (si está autenticado)
 */
exports.crearTicket = async (req, res, next) => {
  try {
    const { email, asunto, mensaje } = req.body;

    // Validaciones básicas
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }
    if (!asunto || !asunto.trim()) {
      return res.status(400).json({ error: 'El asunto es obligatorio' });
    }
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'El mensaje es obligatorio' });
    }

    // Limitar longitud
    if (asunto.length > 255) {
      return res.status(400).json({ error: 'El asunto no puede exceder 255 caracteres' });
    }

    const usuario_id = req.usuario?.id ?? null; // null si no está autenticado

    const result = await pool.query(
      `INSERT INTO soporte_tickets (usuario_id, email, asunto, mensaje)
       VALUES ($1, $2, $3, $4)
       RETURNING id, usuario_id, email, asunto, mensaje, created_at`,
      [usuario_id, email.trim(), asunto.trim(), mensaje.trim()]
    );

    res.status(201).json({
      message: 'Ticket de soporte creado con éxito',
      ticket: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
