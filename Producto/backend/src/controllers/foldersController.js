/**
 * Controlador de Folders — ÉPICA 2 Carpetas de Proyectos.
 *
 * Endpoints:
 *   GET    /api/folders        — lista las carpetas del usuario con demo_count
 *   POST   /api/folders        — crea carpeta (límite freemium: 10)
 *   PUT    /api/folders/:id    — actualiza nombre y/o cover_url
 *   DELETE /api/folders/:id    — borra carpeta (los demos quedan sin carpeta vía SET NULL)
 */

const pool = require('../db/index');

/** Límite de carpetas para cuentas gratuitas. Premium → ilimitadas. */
const FREE_FOLDER_LIMIT = 10;

/**
 * GET /api/folders
 * Lista carpetas del usuario con conteo de demos asociados.
 */
exports.listar = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         f.id,
         f.nombre,
         f.cover_url,
         f.created_at,
         COALESCE(d.demo_count, 0)::int AS demo_count
       FROM folders f
       LEFT JOIN (
         SELECT folder_id, COUNT(*) AS demo_count
         FROM demos
         WHERE activo = true AND folder_id IS NOT NULL
         GROUP BY folder_id
       ) d ON d.folder_id = f.id
       WHERE f.usuario_id = $1
       ORDER BY f.created_at DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/folders
 * Crea una carpeta. Aplica límite freemium (10 para cuentas gratuitas).
 */
exports.crear = async (req, res, next) => {
  try {
    const { nombre, cover_url } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (nombre.trim().length > 100) {
      return res.status(400).json({ error: 'El nombre no puede superar 100 caracteres' });
    }

    // Verificar límite freemium
    const [userRow, countRow] = await Promise.all([
      pool.query(
        'SELECT COALESCE(es_premium, false) AS es_premium FROM usuarios WHERE id = $1',
        [req.usuario.id]
      ),
      pool.query(
        'SELECT COUNT(*) FROM folders WHERE usuario_id = $1',
        [req.usuario.id]
      ),
    ]);
    const esPremium = userRow.rows[0]?.es_premium ?? false;
    const count     = parseInt(countRow.rows[0].count, 10);

    if (!esPremium && count >= FREE_FOLDER_LIMIT) {
      return res.status(403).json({
        error: `Has alcanzado el límite de ${FREE_FOLDER_LIMIT} carpetas para cuentas gratuitas. Actualiza a Premium para carpetas ilimitadas.`,
        code:  'FOLDER_LIMIT_REACHED',
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO folders (usuario_id, nombre, cover_url)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, cover_url, created_at`,
      [req.usuario.id, nombre.trim(), cover_url || null]
    );

    // El demo_count para una carpeta recién creada siempre es 0
    res.status(201).json({ ...rows[0], demo_count: 0 });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/folders/:id
 * Actualiza nombre y/o cover_url. Solo el dueño puede modificar.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { nombre, cover_url } = req.body;

    // Verificar propiedad
    const check = await pool.query(
      'SELECT id FROM folders WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuario.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    const campos = [];
    const vals   = [];
    let idx = 1;

    if (nombre !== undefined) {
      if (!nombre.trim()) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
      campos.push(`nombre = $${idx++}`);
      vals.push(nombre.trim());
    }
    if (cover_url !== undefined) {
      campos.push(`cover_url = $${idx++}`);
      vals.push(cover_url || null);
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE folders SET ${campos.join(', ')}
       WHERE id = $${idx}
       RETURNING id, nombre, cover_url, created_at`,
      vals
    );
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/folders/:id
 * Borra la carpeta. Los demos que apuntaban a ella quedan con folder_id = NULL
 * (gracias a ON DELETE SET NULL en la FK).
 */
exports.eliminar = async (req, res, next) => {
  try {
    const check = await pool.query(
      'SELECT id FROM folders WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuario.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    await pool.query('DELETE FROM folders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
