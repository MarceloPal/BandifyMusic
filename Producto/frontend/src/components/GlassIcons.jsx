/**
 * GlassIcons — Botones tipo glassmorphism con tilt 3D adaptados para Bandify.
 *
 * En lugar de recibir un `color` estático de un diccionario, cada item puede
 * recibir `cover_url` (URL de imagen firmada de S3). La capa trasera muestra:
 *   - La imagen como background-image si cover_url existe
 *   - Un gradiente morado por defecto si no hay imagen
 *
 * Props del item:
 *   - id        (string)        — identificador
 *   - label     (string)        — texto que aparece debajo en hover
 *   - icon      (ReactNode)     — icono lucide-react
 *   - cover_url (string|null)   — URL firmada de la imagen de fondo (opcional)
 *   - count     (number)        — badge numérico arriba a la derecha (opcional)
 *   - onClick   (function)      — handler al hacer click
 *   - customClass (string)      — clase adicional opcional
 */

import './GlassIcons.css'

/** Gradiente por defecto cuando la carpeta no tiene cover_url. */
const DEFAULT_GRADIENT = 'linear-gradient(135deg, hsl(263, 70%, 50%), hsl(283, 70%, 35%))'

/**
 * Determina el estilo de fondo del icon-btn__back:
 *  - Si hay cover_url → background-image (cover)
 *  - Si no → gradiente morado por defecto
 */
function getBackgroundStyle(coverUrl) {
  if (coverUrl) {
    return {
      backgroundImage: `url("${coverUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { background: DEFAULT_GRADIENT }
}

export default function GlassIcons({ items, className }) {
  return (
    <div className={`icon-btns ${className || ''}`}>
      {items.map((item, index) => (
        <button
          key={item.id ?? index}
          className={`icon-btn ${item.customClass || ''}`}
          aria-label={item.label}
          type="button"
          onClick={item.onClick}
        >
          <span className="icon-btn__back" style={getBackgroundStyle(item.cover_url)} />
          <span className="icon-btn__front">
            <span className="icon-btn__icon" aria-hidden="true">
              {item.icon}
            </span>
          </span>
          {typeof item.count === 'number' && item.count > 0 && (
            <span className="icon-btn__count">{item.count}</span>
          )}
          <span className="icon-btn__label">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
