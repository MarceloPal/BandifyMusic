/**
 * Controlador de Matching — búsqueda de músicos compatibles.
 *
 * Score v2:
 *   compatibilidad = tag_overlap × 0.60  +  audio_cosine × 0.40  +  bpm_penalty
 *
 *   • tag_overlap  — solapamiento de user_tags (60 %)
 *   • audio_cosine — 1 − distancia coseno pgvector (40 %)
 *   • bpm_penalty  — −0.20 si |Δbpm| > 50 BPM
 */

const pool = require('../db/index');

/**
 * GET /matching/buscar
 * Query params: ciudad, oficio, tags (CSV), limite (max 50).
 */
exports.buscar = async (req, res, next) => {
  try {
    const { ciudad, oficio } = req.query;

    // Soporte ?tags=Rock,Jazz  o  ?tag=Rock  (backward compat.)
    const rawTags   = req.query.tags || req.query.tag || '';
    const tagsArray = rawTags
      ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    let limite = parseInt(req.query.limite, 10) || 5;
    if (limite > 50) limite = 50;

    // ── Perfil del usuario actual: vector + tags ─────────────────────────────
    let perfilResult;
    try {
      perfilResult = await pool.query(
        'SELECT audio_vector, user_tags FROM perfiles WHERE usuario_id = $1',
        [req.usuario.id]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      perfilResult = await pool.query(
        "SELECT audio_vector, '[]'::jsonb AS user_tags FROM perfiles WHERE usuario_id = $1",
        [req.usuario.id]
      );
    }

    if (perfilResult.rows.length === 0 || !perfilResult.rows[0].audio_vector) {
      return res.status(400).json({
        error: 'Debes subir y analizar tu demo antes de buscar colaboradores',
      });
    }

    const audioVector = perfilResult.rows[0].audio_vector;

    const rawUserTags = perfilResult.rows[0].user_tags;
    const userOwnTags = Array.isArray(rawUserTags)
      ? rawUserTags
      : (typeof rawUserTags === 'string' ? JSON.parse(rawUserTags) : []);

    // BPM del usuario actual: vector[25] (0-indexed) × 200
    const vectorStr = String(audioVector).replace(/[[\]]/g, '');
    const vectorArr = vectorStr.split(',').map(Number);
    const userBpm   = !isNaN(vectorArr[25]) ? vectorArr[25] * 200 : 120;

    // ── Query principal ──────────────────────────────────────────────────────
    const resultado = await pool.query(
      `SELECT
         u.id,
         u.nombre,
         u.ciudad,
         u.instrumento,
         p.s3_key,
         p.user_tags,
         p.oficio,
         p.experiencia,
         p.bio,
         p.foto_url,
         p.instagram_url,
         p.spotify_url,
         p.discord_url,
         p.card_settings,

         /* Tags que comparte el candidato con el usuario actual (para la UI) */
         ARRAY(
           SELECT t.value
           FROM   jsonb_array_elements_text(COALESCE(p.user_tags, '[]'::jsonb)) t
           WHERE  t.value = ANY($6::text[])
         ) AS shared_tags,

         /* ── Score de precisión musical v2 ──────────────────────────────────
            = tag_overlap × 0.60 + audio_cosine × 0.40 + bpm_penalty
            Clampeado a [0, 1] antes de convertir a porcentaje.             */
         ROUND(
           GREATEST(0.0, LEAST(1.0,
             /* 60 % solapamiento de etiquetas manuales */
             LEAST(1.0, COALESCE(
               (
                 SELECT COUNT(*)::float
                 FROM   jsonb_array_elements_text(COALESCE(p.user_tags, '[]'::jsonb)) t
                 WHERE  t.value = ANY($6::text[])
               ) / GREATEST(1.0, COALESCE(array_length($6::text[], 1), 1)::float),
               0.0
             )) * 0.60

             +

             /* 40 % similitud coseno de audio */
             (1.0 - (p.audio_vector <=> $1)) * 0.40

             +

             /* Penalización de BPM: −20 pp si diferencia > 50 BPM. */
             CASE
               WHEN ABS((p.audio_vector::real[])[26] * 200.0 - $8::float) > 50.0
               THEN -0.20
               ELSE 0.0
             END
           ))::numeric * 100.0,
         1) AS compatibilidad

       FROM perfiles p
       JOIN usuarios u ON u.id = p.usuario_id

       WHERE u.id != $2
         AND p.audio_vector IS NOT NULL

         /* Filtro ciudad (opcional, ILIKE) */
         AND ($3::text IS NULL OR u.ciudad ILIKE '%' || $3 || '%')

         /* Filtro oficio (opcional) */
         AND ($4::text IS NULL OR p.oficio @> jsonb_build_array($4::text))

         /* Filtro tags: al menos uno de $5 en user_tags del candidato. */
         AND (
           array_length($5::text[], 1) IS NULL
           OR EXISTS (
             SELECT 1
             FROM   jsonb_array_elements_text(COALESCE(p.user_tags, '[]'::jsonb)) t
             WHERE  t.value = ANY($5::text[])
           )
         )

       ORDER BY
         u.es_premium DESC,
         GREATEST(0.0, LEAST(1.0,
           LEAST(1.0, COALESCE(
             (
               SELECT COUNT(*)::float
               FROM   jsonb_array_elements_text(COALESCE(p.user_tags, '[]'::jsonb)) t
               WHERE  t.value = ANY($6::text[])
             ) / GREATEST(1.0, COALESCE(array_length($6::text[], 1), 1)::float),
             0.0
           )) * 0.60
           + (1.0 - (p.audio_vector <=> $1)) * 0.40
           + CASE
               WHEN ABS((p.audio_vector::real[])[26] * 200.0 - $8::float) > 50.0
               THEN -0.20
               ELSE 0.0
             END
         )) DESC

       LIMIT $7`,
      [
        audioVector,    // $1 — vector del usuario actual
        req.usuario.id, // $2 — excluir al propio usuario
        ciudad || null, // $3 — filtro ciudad
        oficio || null, // $4 — filtro oficio
        tagsArray,      // $5 — filtro tags WHERE
        userOwnTags,    // $6 — tags propios para tag_overlap y shared_tags
        limite,         // $7 — LIMIT
        userBpm,        // $8 — BPM del usuario actual para la penalización
      ]
    );

    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
};
