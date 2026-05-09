/**
 * Geocoder — convierte una dirección en texto a coordenadas { lat, lng }
 * Usa Nominatim (OpenStreetMap), API gratuita y sin necesidad de API key.
 *
 * IMPORTANTE: La política de uso de Nominatim exige:
 *   1. Header User-Agent identificando la aplicación.
 *   2. Máximo 1 request por segundo (no enforced acá, pero respetarlo en bulk).
 *   3. No usar para geocoding masivo automatizado.
 * Ref: https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT    = 'Bandify-App/1.0 (contacto@bandify.cl)';
const TIMEOUT_MS    = 5000;  // 5s — Nominatim suele responder en <1s

/**
 * @param {string} direccion  Texto libre (ej: "Bar Loreto, Recoleta, Chile")
 * @returns {Promise<{lat: number|null, lng: number|null}>}
 *
 * NUNCA lanza excepciones — ante cualquier error, devuelve { lat: null, lng: null }.
 * Esto garantiza que el flujo de creación de tocatas no se rompa si Nominatim
 * está caído, lento, o no encuentra la dirección.
 */
async function getCoordinates(direccion) {
  // Validación básica: si no hay texto, no llamamos a la API
  if (!direccion || typeof direccion !== 'string' || direccion.trim().length === 0) {
    return { lat: null, lng: null };
  }

  // AbortController → cancela el request si Nominatim demora >5s
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(direccion.trim())}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':      USER_AGENT,
        'Accept-Language': 'es',  // Prefiere resultados en español
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[Geocoder] Nominatim respondió ${res.status} para: "${direccion}"`);
      return { lat: null, lng: null };
    }

    const data = await res.json();

    // Sin resultados → dirección no encontrada
    if (!Array.isArray(data) || data.length === 0) {
      console.info(`[Geocoder] Sin resultados para: "${direccion}"`);
      return { lat: null, lng: null };
    }

    // Nominatim devuelve lat/lon como strings
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);

    // Validar que sean números finitos (no NaN, no Infinity)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { lat: null, lng: null };
    }

    return { lat, lng };
  } catch (err) {
    // Captura: timeout (AbortError), errores de red, JSON inválido, etc.
    console.warn(`[Geocoder] Falló para "${direccion}": ${err.message}`);
    return { lat: null, lng: null };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { getCoordinates };
