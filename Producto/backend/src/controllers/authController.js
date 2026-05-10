/**
 * Controlador de Autenticación — registro, login y reset de contraseña.
 * Usa bcryptjs para hashes y jsonwebtoken para tokens (válidos 7 días).
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/index');
const mailer = require('../utils/mailer');

/**
 * POST /auth/registro — crea usuario y devuelve JWT.
 */
exports.registro = async (req, res, next) => {
  try {
    const { nombre, email, password, instrumento, ciudad, fecha_nacimiento } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }

    const existente = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, instrumento, ciudad, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, email, instrumento, ciudad, fecha_nacimiento, role`,
      [nombre, email, password_hash, instrumento || null, ciudad || null, fecha_nacimiento || null]
    );

    const usuario = resultado.rows[0];
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, usuario });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login — valida credenciales y devuelve JWT + usuario completo.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son obligatorios' });
    }

    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.password_hash, u.instrumento, u.ciudad,
              u.fecha_nacimiento, u.role, COALESCE(u.es_premium, false) AS es_premium,
              p.s3_key, p.foto_url
       FROM usuarios u
       LEFT JOIN perfiles p ON p.usuario_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    const usuario = resultado.rows[0];
    const passwordValido = usuario ? await bcrypt.compare(password, usuario.password_hash) : false;

    if (!usuario || !passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...usuarioSinHash } = usuario;
    res.status(200).json({ token, usuario: usuarioSinHash });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/forgot-password — envía email con link de reset (1 hora de validez).
 * Siempre responde 200 para no filtrar si el email existe (anti-enumeration).
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email es obligatorio' });

    const result = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) return res.json({ ok: true });

    const usuario = result.rows[0];
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Un solo token activo por usuario — reemplaza los anteriores
    await pool.query('DELETE FROM password_resets WHERE usuario_id = $1 AND used = false', [usuario.id]);
    await pool.query(
      'INSERT INTO password_resets (usuario_id, token, expires_at) VALUES ($1, $2, $3)',
      [usuario.id, token, expires]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?mode=reset&token=${token}`;
    mailer.sendPasswordResetEmail({ to: email, nombre: usuario.nombre, resetUrl }).catch(() => {});

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/reset-password — actualiza contraseña usando token de reset.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token y password son obligatorios' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const result = await pool.query(
      `SELECT pr.usuario_id, pr.expires_at, pr.used, u.email
       FROM password_resets pr
       JOIN usuarios u ON u.id = pr.usuario_id
       WHERE pr.token = $1`,
      [token]
    );

    if (result.rows.length === 0) return res.status(400).json({ error: 'Enlace inválido o expirado' });
    const reset = result.rows[0];

    if (reset.used)                              return res.status(400).json({ error: 'Este enlace ya fue utilizado' });
    if (new Date() > new Date(reset.expires_at)) return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [passwordHash, reset.usuario_id]);
    await pool.query('UPDATE password_resets SET used = true WHERE token = $1', [token]);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
