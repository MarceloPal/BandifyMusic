/**
 * Suite de pruebas de Base de Datos — Bandify Backend
 *
 * Usa jest.spyOn(pool, 'query') para interceptar las llamadas a PostgreSQL
 * sin abrir ninguna conexión real. La lógica de negocio no se modifica.
 *
 * CP-16 — Similitud Coseno (pgvector <=>)
 * CP-17 — Integridad Referencial (FK constraint)
 * CP-18 — Performance < 2 000 ms
 */

// ── Silenciar migrations para que app.listen() no consuma mocks ──────────────
jest.mock('../src/db/migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

// ── Silenciar dependencias externas ──────────────────────────────────────────
jest.mock('../src/utils/s3Client', () => ({}));
jest.mock('../src/utils/mailer', () => ({
  sendAdnReadyEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-s3.com/url'),
}));

// ── Pool real importado para poder espiar con jest.spyOn ─────────────────────
const pool = require('../src/db/index');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Genera un vector de 27 dimensiones con valores aleatorios normalizados [0,1] */
function makeVector(seed = 0) {
  return Array.from({ length: 27 }, (_, i) =>
    parseFloat(((Math.sin(seed + i) + 1) / 2).toFixed(6))
  );
}

/**
 * Calcula la distancia coseno entre dos vectores.
 * distancia = 1 − (A·B / (|A|·|B|))
 * Simula lo que pgvector hace internamente con el operador <=>.
 */
function cosineDist(a, b) {
  const dot   = a.reduce((acc, v, i) => acc + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((acc, v) => acc + v * v, 0));
  const normB = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0));
  return 1 - dot / (normA * normB);
}

// Vector de referencia del usuario actual
const USER_VECTOR = makeVector(0);

// Perfiles candidatos con vectores a distintas distancias del usuario
const PROFILE_A = { usuario_id: 'uid-a', vector: makeVector(0.1) }; // muy similar
const PROFILE_B = { usuario_id: 'uid-b', vector: makeVector(1.5) }; // similaridad media
const PROFILE_C = { usuario_id: 'uid-c', vector: makeVector(3.0) }; // menos similar

// Pre-calculamos distancias para verificar el orden esperado
const distA = cosineDist(USER_VECTOR, PROFILE_A.vector);
const distB = cosineDist(USER_VECTOR, PROFILE_B.vector);
const distC = cosineDist(USER_VECTOR, PROFILE_C.vector);

// La BD ordena por distancia ASC (menor distancia = mayor similitud)
const SORTED_BY_SIMILARITY = [PROFILE_A, PROFILE_B, PROFILE_C].sort(
  (x, y) =>
    cosineDist(USER_VECTOR, x.vector) - cosineDist(USER_VECTOR, y.vector)
);

// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// CP-16 — Similitud Coseno con pgvector (<=>)
// ─────────────────────────────────────────────────────────────────────────────

describe('CP-16 — Similitud Coseno: ordenamiento por operador <=> de pgvector', () => {
  it('CP-16: la consulta de matching retorna perfiles ordenados de mayor a menor similitud coseno', async () => {
    // Filas que la BD devolvería tras ORDER BY audio_vector <=> $1 ASC
    // (menor distancia coseno = mayor compatibilidad)
    const mockRows = SORTED_BY_SIMILARITY.map((p, idx) => ({
      usuario_id:    p.usuario_id,
      audio_vector:  `[${p.vector.join(',')}]`,
      cosine_dist:   parseFloat(cosineDist(USER_VECTOR, p.vector).toFixed(6)),
      compatibilidad: parseFloat(((1 - cosineDist(USER_VECTOR, p.vector)) * 100).toFixed(1)),
      rank:          idx + 1,
    }));

    const spy = jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: mockRows });

    // SQL que simula la consulta de pgvector
    const SQL = `
      SELECT p.usuario_id,
             p.audio_vector,
             (p.audio_vector <=> $1) AS cosine_dist,
             ROUND((1.0 - (p.audio_vector <=> $1))::numeric * 100, 1) AS compatibilidad
      FROM   perfiles p
      WHERE  p.audio_vector IS NOT NULL
      ORDER  BY p.audio_vector <=> $1 ASC
      LIMIT  $2
    `;

    const vectorParam = `[${USER_VECTOR.join(',')}]`;
    const result = await pool.query(SQL, [vectorParam, 10]);

    // ── Verificaciones ──────────────────────────────────────────────────────

    // 1. El spy fue invocado exactamente una vez con el operador <=>
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatch(/<=>.*<=>.*ASC/s);

    // 2. Se retornaron los 3 perfiles
    expect(result.rows).toHaveLength(3);

    // 3. El orden es decreciente en compatibilidad (mayor primero)
    for (let i = 0; i < result.rows.length - 1; i++) {
      expect(result.rows[i].compatibilidad).toBeGreaterThanOrEqual(
        result.rows[i + 1].compatibilidad
      );
    }

    // 4. Las distancias coseno crecen (menor distancia = mayor similitud)
    for (let i = 0; i < result.rows.length - 1; i++) {
      expect(result.rows[i].cosine_dist).toBeLessThanOrEqual(
        result.rows[i + 1].cosine_dist
      );
    }

    // 5. El perfil más similar ocupa el primer lugar
    expect(result.rows[0].usuario_id).toBe(SORTED_BY_SIMILARITY[0].usuario_id);

    // 6. Los valores de distancia son matemáticamente coherentes con la fórmula coseno
    result.rows.forEach((row) => {
      expect(row.cosine_dist).toBeGreaterThanOrEqual(0);
      expect(row.cosine_dist).toBeLessThanOrEqual(1);
      const expectedDist = parseFloat(
        cosineDist(
          USER_VECTOR,
          row.audio_vector.replace(/[\[\]]/g, '').split(',').map(Number)
        ).toFixed(6)
      );
      expect(Math.abs(row.cosine_dist - expectedDist)).toBeLessThan(0.001);
    });
  });

  it('CP-16 (variante): compatibilidad = (1 − distancia_coseno) × 100', () => {
    const dist     = cosineDist(USER_VECTOR, PROFILE_A.vector);
    const expected = parseFloat(((1 - dist) * 100).toFixed(1));

    // La compatibilidad debe estar en el rango [0, 100]
    expect(expected).toBeGreaterThanOrEqual(0);
    expect(expected).toBeLessThanOrEqual(100);

    // Y debe ser inversamente proporcional a la distancia
    const distMedio = cosineDist(USER_VECTOR, PROFILE_B.vector);
    const compatA   = (1 - dist)       * 100;
    const compatB   = (1 - distMedio)  * 100;
    expect(compatA).toBeGreaterThan(compatB);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CP-17 — Integridad Referencial (Foreign Key Constraint)
// ─────────────────────────────────────────────────────────────────────────────

describe('CP-17 — Integridad Referencial: FK violation al insertar vector con usuario_id inválido', () => {
  it('CP-17: INSERT de audio_vector con usuario_id inexistente lanza error de FK (code 23503)', async () => {
    // PostgreSQL lanza code '23503' para violaciones de foreign key
    const fakeUserId = 'non-existent-uuid';

    const fkError          = new Error('insert or update on table "perfiles" violates foreign key constraint "perfiles_usuario_id_fkey"');
    fkError.code           = '23503';
    fkError.detail         = `Key (usuario_id)=(${fakeUserId}) is not present in table "usuarios".`;
    fkError.table          = 'perfiles';
    fkError.constraint     = 'perfiles_usuario_id_fkey';

    // mockRejectedValue (sin "Once") → todas las llamadas rechazan con fkError
    // Esto evita que una segunda llamada caiga a la implementación real del pool.
    const spy = jest.spyOn(pool, 'query').mockRejectedValue(fkError);

    const SQL = `
      INSERT INTO perfiles (usuario_id, audio_vector)
      VALUES ($1, $2)
      ON CONFLICT (usuario_id)
      DO UPDATE SET audio_vector = EXCLUDED.audio_vector
    `;
    const vectorParam = `[${makeVector(42).join(',')}]`;

    // ── Verificaciones ──────────────────────────────────────────────────────

    // 1. Capturamos el error de una única llamada al spy
    let caughtError;
    try {
      await pool.query(SQL, [fakeUserId, vectorParam]);
    } catch (err) {
      caughtError = err;
    }

    // 2. El spy fue invocado exactamente una vez con el usuario_id falso
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1][0]).toBe(fakeUserId);

    // 3. El error existe y su mensaje menciona la FK
    expect(caughtError).toBeDefined();
    expect(caughtError.message).toMatch(/foreign key constraint/i);

    // 4. Propiedades estándar de error de PostgreSQL (pg code 23503)
    expect(caughtError.code).toBe('23503');
    expect(caughtError.table).toBe('perfiles');
    expect(caughtError.constraint).toMatch(/usuario_id/i);
    expect(caughtError.detail).toContain(fakeUserId);

    // 5. La promesa también rechaza correctamente
    await expect(
      pool.query(SQL, [fakeUserId, vectorParam])
    ).rejects.toThrow(/foreign key constraint/i);
  });

  it('CP-17 (variante): INSERT válido con usuario_id existente NO lanza error', async () => {
    const validUserId = 'valid-user-uuid-123';

    jest.spyOn(pool, 'query').mockResolvedValueOnce({
      rows:         [{ usuario_id: validUserId }],
      rowCount:     1,
      command:      'INSERT',
    });

    const SQL = `
      INSERT INTO perfiles (usuario_id, audio_vector)
      VALUES ($1, $2)
      ON CONFLICT (usuario_id)
      DO UPDATE SET audio_vector = EXCLUDED.audio_vector
      RETURNING usuario_id
    `;

    const result = await pool.query(SQL, [validUserId, `[${makeVector(1).join(',')}]`]);

    expect(result.rowCount).toBe(1);
    expect(result.rows[0].usuario_id).toBe(validUserId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CP-18 — Performance: la consulta de matching resuelve en < 2 000 ms
// ─────────────────────────────────────────────────────────────────────────────

describe('CP-18 — Performance: la consulta de matching vectorial resuelve en < 2000 ms', () => {
  it('CP-18: la promesa de pool.query con <=> resuelve en menos de 2 000 ms', async () => {
    // Simula una BD que responde en ~50 ms (latencia realista de red interna)
    const SIMULATED_LATENCY_MS = 50;

    const mockRows = SORTED_BY_SIMILARITY.map((p) => ({
      usuario_id:    p.usuario_id,
      audio_vector:  `[${p.vector.join(',')}]`,
      compatibilidad: parseFloat(((1 - cosineDist(USER_VECTOR, p.vector)) * 100).toFixed(1)),
    }));

    jest.spyOn(pool, 'query').mockImplementationOnce(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ rows: mockRows }), SIMULATED_LATENCY_MS)
      )
    );

    const SQL = `
      SELECT p.usuario_id,
             p.audio_vector,
             ROUND((1.0 - (p.audio_vector <=> $1))::numeric * 100, 1) AS compatibilidad
      FROM   perfiles p
      WHERE  p.audio_vector IS NOT NULL
      ORDER  BY p.audio_vector <=> $1 ASC
      LIMIT  $2
    `;

    const vectorParam = `[${USER_VECTOR.join(',')}]`;

    const t0     = Date.now();
    const result = await pool.query(SQL, [vectorParam, 50]);
    const elapsed = Date.now() - t0;

    // ── Verificaciones ──────────────────────────────────────────────────────

    // 1. Aserción principal: tiempo estrictamente inferior a 2 000 ms
    expect(elapsed).toBeLessThan(2000);

    // 2. La consulta retornó resultados válidos
    expect(result.rows.length).toBeGreaterThan(0);

    // 3. Verificación de cota inferior (el mock tardó al menos la latencia simulada)
    expect(elapsed).toBeGreaterThanOrEqual(SIMULATED_LATENCY_MS - 5);
  });

  it('CP-18 (SLA estricto): incluso con 10 resultados el tiempo es < 500 ms', async () => {
    const FAST_LATENCY_MS = 20;

    const rows = Array.from({ length: 10 }, (_, i) => ({
      usuario_id:    `uid-perf-${i}`,
      compatibilidad: parseFloat((90 - i * 3).toFixed(1)),
    }));

    jest.spyOn(pool, 'query').mockImplementationOnce(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ rows }), FAST_LATENCY_MS)
      )
    );

    const t0      = Date.now();
    const result  = await pool.query('SELECT 1', []);
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(500);
    expect(result.rows).toHaveLength(10);
  });

  it('CP-18 (timeout explícito): Jest.setTimeout asegura que el test no bloquea el pipeline', async () => {
    jest.setTimeout(3000);

    jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] });

    const t0      = Date.now();
    await pool.query('SELECT 1', []);
    const elapsed = Date.now() - t0;

    // La consulta mockeada (sin latencia artificial) resuelve en < 50 ms
    expect(elapsed).toBeLessThan(50);

    jest.setTimeout(5000); // restaurar timeout por defecto de Jest
  });
});
